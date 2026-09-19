import { NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Normalize job type (Full-Time, Contract, Internship, Other)
function normalizeType(raw: string | string[] | undefined | null): 'Full-Time' | 'Contract' | 'Internship' | 'Other' {
  const values = Array.isArray(raw) ? raw : [raw];
  const joined = values.filter(Boolean).join(' ').toLowerCase();
  if (joined.includes('intern')) return 'Internship';
  if (joined.includes('full')) return 'Full-Time';
  if (joined.includes('contract') || joined.includes('freelance') || joined.includes('part')) return 'Contract';
  return 'Other';
}

// Strip HTML tags and cap length
function cleanDescription(html: string | undefined | null, maxLen = 600): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// Detect work mode accurately based on location and title
function detectWorkMode(location: string = '', title: string = '', description: string = ''): 'Remote' | 'Hybrid' | 'On-site' {
  const combined = `${location} ${title} ${description}`.toLowerCase();
  if (combined.includes('hybrid')) return 'Hybrid';
  if (combined.includes('remote') || combined.includes('work from home') || combined.includes('anywhere') || combined.includes('worldwide') || combined.includes('telecommute')) {
    return 'Remote';
  }
  return 'On-site';
}

export async function POST(req: Request) {
  try {
    const { role, location, workMode, jobType, source } = await req.json();
    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();

    let allJobs: any[] = [];
    const failedSources: string[] = [];

    // --- 1. ADZUNA API (Major source for Real Local & On-site Jobs) ---
    const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
    const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      try {
        // Country detection for Adzuna (defaults to 'in' for India if location indicates India/empty, or 'us', 'gb')
        let countryCode = 'in';
        if (locQuery.includes('us') || locQuery.includes('united states') || locQuery.includes('new york') || locQuery.includes('san francisco') || locQuery.includes('california')) {
          countryCode = 'us';
        } else if (locQuery.includes('uk') || locQuery.includes('london') || locQuery.includes('united kingdom')) {
          countryCode = 'gb';
        } else if (locQuery.includes('canada') || locQuery.includes('toronto')) {
          countryCode = 'ca';
        }

        const cleanRole = encodeURIComponent(query || 'Software Engineer');
        const cleanLoc = locQuery && locQuery !== 'remote' ? `&where=${encodeURIComponent(location)}` : '';
        const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=30&what=${cleanRole}${cleanLoc}`;

        const res = await fetchWithTimeout(adzunaUrl);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          const formatted = results.map((j: any) => {
            const locName = j.location?.display_name || location || 'On-site';
            const desc = cleanDescription(j.description);
            const mode = detectWorkMode(locName, j.title, desc);
            const salaryMin = j.salary_min ? Math.round(j.salary_min) : null;
            const salaryMax = j.salary_max ? Math.round(j.salary_max) : null;
            const salary = salaryMin && salaryMax ? `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}` : salaryMin ? `$${salaryMin.toLocaleString()}+` : undefined;

            return {
              id: `adz_${j.id}`,
              title: (j.title || '').replace(/<\/?[^>]+(>|$)/g, ''),
              company: j.company?.display_name || 'Verified Employer',
              location: locName,
              type: normalizeType(j.contract_time || j.contract_type),
              workMode: mode,
              salary,
              description: desc,
              url: j.redirect_url,
              source: 'Adzuna',
            };
          });
          allJobs = [...allJobs, ...formatted];
        } else {
          failedSources.push('Adzuna');
        }
      } catch (e) {
        console.error('Adzuna fetch error:', e);
        failedSources.push('Adzuna');
      }
    }

    // --- 2. RAPIDAPI / LINKEDIN & ACTIVE JOBS (Local & Global On-site/Hybrid) ---
    const RAPID_API_KEY = process.env.RAPIDAPI_KEY || '';
    if (RAPID_API_KEY) {
      // 2A. Active Jobs DB
      try {
        const res = await fetchWithTimeout(
          `https://active-jobs-db.p.rapidapi.com/active-jobs?title=${encodeURIComponent(query || 'Developer')}&location=${encodeURIComponent(location || '')}`,
          {
            headers: {
              'x-rapidapi-key': RAPID_API_KEY,
              'x-rapidapi-host': 'active-jobs-db.p.rapidapi.com',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = (data.data || []).slice(0, 25).map((j: any) => {
            const loc = j.location || location || 'On-site';
            return {
              id: `ajdb_${Math.random().toString(36).slice(2, 11)}`,
              title: j.title || query,
              company: j.company || 'Direct Employer',
              location: loc,
              type: normalizeType(j.type),
              workMode: detectWorkMode(loc, j.title, ''),
              description: cleanDescription(j.description || 'Verified job posting from Active Jobs DB.'),
              url: j.url || 'https://www.linkedin.com/jobs/',
              source: 'Active Jobs DB',
            };
          });
          allJobs = [...allJobs, ...formatted];
        }
      } catch (e) {
        console.error('Active Jobs DB error:', e);
      }

      // 2B. LinkedIn Job Search API
      try {
        const res = await fetchWithTimeout(
          `https://linkedin-job-search-api.p.rapidapi.com/search?keyword=${encodeURIComponent(query || 'Engineer')}&location=${encodeURIComponent(location || 'worldwide')}`,
          {
            headers: {
              'x-rapidapi-key': RAPID_API_KEY,
              'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = (data.jobs || []).slice(0, 25).map((j: any) => {
            const loc = j.location || location || 'Worldwide';
            return {
              id: `li_${Math.random().toString(36).slice(2, 11)}`,
              title: j.title,
              company: j.company,
              location: loc,
              type: normalizeType(j.employmentType),
              workMode: detectWorkMode(loc, j.title, ''),
              description: cleanDescription(j.description),
              url: j.jobUrl,
              source: 'LinkedIn',
            };
          });
          allJobs = [...allJobs, ...formatted];
        }
      } catch (e) {
        console.error('LinkedIn API error:', e);
      }
    }

    // --- 3. REMOTIVE API (Remote Specialist) ---
    try {
      const remotiveUrl = `https://remotive.com/api/remote-jobs?${query ? `search=${encodeURIComponent(query)}&` : ''}limit=25`;
      const res = await fetchWithTimeout(remotiveUrl);
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.jobs || []).map((j: any) => ({
          id: `remo_${j.id}`,
          title: (j.title || '').replace(/<\/?[^>]+(>|$)/g, ''),
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          type: normalizeType(j.job_type),
          workMode: 'Remote' as const,
          description: cleanDescription(j.description),
          url: j.url,
          source: 'Remotive',
        }));

        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter((j: any) => {
            const loc = j.location.toLowerCase();
            return loc.includes(locQuery) || loc.includes('worldwide') || loc.includes('global') || loc.includes('anywhere');
          });
        }
        allJobs = [...allJobs, ...formatted];
      }
    } catch (e) {
      console.error('Remotive fetch error:', e);
      failedSources.push('Remotive');
    }

    // --- 4. ARBEITNOW API (Tech, On-site & Remote) ---
    try {
      const res = await fetchWithTimeout('https://arbeitnow.com/api/job-board-api');
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.data || []).map((j: any) => {
          const loc = j.location || (j.remote ? 'Remote' : 'On-site');
          return {
            id: `arb_${j.slug}`,
            title: j.title,
            company: j.company_name,
            location: loc,
            type: normalizeType(j.job_types),
            workMode: j.remote ? ('Remote' as const) : detectWorkMode(loc, j.title, ''),
            description: cleanDescription(j.description),
            url: j.url,
            source: 'Arbeitnow',
          };
        });

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q));
        }
        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter(
            (j: any) => j.location.toLowerCase().includes(locQuery) || j.location.toLowerCase().includes('remote')
          );
        }
        allJobs = [...allJobs, ...formatted];
      }
    } catch (e) {
      console.error('Arbeitnow fetch error:', e);
      failedSources.push('Arbeitnow');
    }

    // --- 5. REMOTEOK API ---
    try {
      const res = await fetchWithTimeout('https://remoteok.com/api');
      if (res.ok) {
        const data = await res.json();
        let formatted = (data || [])
          .filter((j: any) => j.id && j.position)
          .map((j: any) => ({
            id: `rok_${j.id}`,
            title: j.position,
            company: j.company,
            location: j.location || 'Remote',
            type: normalizeType(j.tags),
            workMode: 'Remote' as const,
            description: cleanDescription(j.description),
            url: j.apply_url || j.url,
            source: 'RemoteOK',
          }));

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q));
        }
        allJobs = [...allJobs, ...formatted];
      }
    } catch (e) {
      console.error('RemoteOK fetch error:', e);
    }

    // --- 6. JOBICY API ---
    try {
      const tagParam = query.length >= 3 ? `&tag=${encodeURIComponent(query)}` : '';
      const res = await fetchWithTimeout(`https://jobicy.com/api/v2/remote-jobs?count=25${tagParam}`);
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.jobs || []).map((j: any) => ({
          id: `jbc_${j.id}`,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo || 'Remote',
          type: normalizeType(j.jobType),
          workMode: 'Remote' as const,
          description: cleanDescription(j.jobExcerpt || j.jobDescription),
          url: j.url,
          source: 'Jobicy',
        }));

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => (j.title || '').toLowerCase().includes(q));
        }
        allJobs = [...allJobs, ...formatted];
      }
    } catch (e) {
      console.error('Jobicy fetch error:', e);
    }

    // De-duplicate, case-insensitive on title + company
    const uniqueJobsMap = new Map();
    allJobs.forEach((job) => {
      const key = `${(job.title || '').toLowerCase().trim()}-${(job.company || '').toLowerCase().trim()}`;
      if (!uniqueJobsMap.has(key)) uniqueJobsMap.set(key, job);
    });
    let finalJobs = Array.from(uniqueJobsMap.values());

    // Apply Backend Filters if specified
    if (workMode && workMode !== 'Any Mode') {
      finalJobs = finalJobs.filter((j) => j.workMode === workMode);
    }
    if (jobType && jobType !== 'All Types') {
      finalJobs = finalJobs.filter((j) => j.type === jobType);
    }
    if (source && source !== 'All Sources') {
      finalJobs = finalJobs.filter((j) => j.source === source);
    }

    // Relevance sort: matching titles float to the top
    if (query) {
      const q = query.toLowerCase();
      finalJobs.sort((a, b) => {
        const aScore = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bScore = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        return bScore - aScore;
      });
    }

    return NextResponse.json({
      jobs: finalJobs,
      meta: { total: finalJobs.length, failedSources },
    });
  } catch (error) {
    console.error('Job search failed:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs. Please try again.' }, { status: 500 });
  }
}