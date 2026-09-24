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

function normalizeType(raw: string | string[] | undefined | null): 'Full-Time' | 'Contract' | 'Internship' | 'Other' {
  const values = Array.isArray(raw) ? raw : [raw];
  const joined = values.filter(Boolean).join(' ').toLowerCase();
  if (joined.includes('intern')) return 'Internship';
  if (joined.includes('full')) return 'Full-Time';
  if (joined.includes('contract') || joined.includes('freelance') || joined.includes('part')) return 'Contract';
  return 'Other';
}

function cleanDescription(html: string | undefined | null, maxLen = 600): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function detectWorkMode(location: string = '', title: string = '', description: string = ''): 'Remote' | 'Hybrid' | 'On-site' {
  const combined = `${location} ${title} ${description}`.toLowerCase();
  if (combined.includes('hybrid')) return 'Hybrid';
  if (combined.includes('remote') || combined.includes('work from home') || combined.includes('anywhere') || combined.includes('worldwide') || combined.includes('telecommute')) {
    return 'Remote';
  }
  return 'On-site';
}

const ADZUNA_COUNTRY_MAP: Record<string, string> = {
  india: 'in',
  us: 'us',
  'united states': 'us',
  usa: 'us',
  uk: 'gb',
  'united kingdom': 'gb',
  'great britain': 'gb',
  canada: 'ca',
  germany: 'de',
  deutschland: 'de',
  france: 'fr',
  australia: 'au',
  singapore: 'sg',
  netherlands: 'nl',
  holland: 'nl',
  spain: 'es',
  italy: 'it',
  poland: 'pl',
  mexico: 'mx',
  brazil: 'br',
  'new zealand': 'nz',
  'south africa': 'za',
  switzerland: 'ch',
  austria: 'at',
  belgium: 'be',
};

export async function POST(req: Request) {
  try {
    const { role, location, workMode, jobType, source, postedTime, isStartupOnly } = await req.json();
    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();

    let allJobs: any[] = [];
    const failedSources: string[] = [];
    const now = Date.now();

    // --- 1. ADZUNA API (Major source for Real Local & On-site Jobs) ---
    const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
    const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      let countryCode: string | null = 'in'; // default only when no location specified
      if (locQuery) {
        const matched = Object.entries(ADZUNA_COUNTRY_MAP).find(([k]) => locQuery.includes(k));
        countryCode = matched ? matched[1] : null;
      }

      if (!countryCode) {
        failedSources.push('Adzuna (unsupported location)');
      } else {
        try {
          // Omit what= when query is empty so Adzuna returns general/trending listings without bias
          const cleanWhat = query ? `&what=${encodeURIComponent(query)}` : '';
          let cleanLoc = locQuery && locQuery !== 'remote' ? `&where=${encodeURIComponent(location)}` : '';
          let adzunaTimeParam = '';
          if (postedTime === 'Past 24 Hours') adzunaTimeParam = '&max_days_old=1';
          else if (postedTime === 'Past 3 Days') adzunaTimeParam = '&max_days_old=3';
          else if (postedTime === 'Past Week') adzunaTimeParam = '&max_days_old=7';

          let adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50${cleanWhat}${cleanLoc}${adzunaTimeParam}`;

          let res = await fetchWithTimeout(adzunaUrl);
          let data = res.ok ? await res.json() : { results: [] };
          let results = data.results || [];

          // Fallback: If searching a specific district/city returned 0, search nationwide
          if (results.length === 0 && cleanLoc) {
            const fallbackCountryName = Object.entries(ADZUNA_COUNTRY_MAP).find(([, code]) => code === countryCode)?.[0] || 'India';
            adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50${cleanWhat}&where=${encodeURIComponent(fallbackCountryName)}${adzunaTimeParam}`;
            res = await fetchWithTimeout(adzunaUrl);
            if (res.ok) {
              data = await res.json();
              results = data.results || [];
            }
          }

          const formatted = results.map((j: any) => {
            const locName = j.location?.display_name || location || 'India';
            const desc = cleanDescription(j.description);
            const mode = detectWorkMode(locName, j.title, desc);
            const salaryMin = j.salary_min ? Math.round(j.salary_min) : null;
            const salaryMax = j.salary_max ? Math.round(j.salary_max) : null;
            const salary = salaryMin && salaryMax ? `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}` : salaryMin ? `$${salaryMin.toLocaleString()}+` : undefined;

            const pubTime = j.created ? new Date(j.created).getTime() : undefined;
            let postedText = 'Recent';
            if (pubTime) {
              const diffMs = Math.max(0, now - pubTime);
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffHours < 1) postedText = 'Just now';
              else if (diffHours < 24) postedText = `${diffHours}h ago`;
              else {
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays === 1) postedText = 'Yesterday';
                else if (diffDays < 7) postedText = `${diffDays}d ago`;
                else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
                else if (diffDays < 365) postedText = `${Math.round(diffDays / 30)}mo ago`;
                else postedText = `${Math.round(diffDays / 365)}y ago`;
              }
            }

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
              isStartup: false,
              postedAt: pubTime,
              postedText,
              applicantCount: undefined,
              applicantText: undefined,
            };
          });
          allJobs = [...allJobs, ...formatted];
        } catch (e) {
          console.error('Adzuna fetch error:', e);
          failedSources.push('Adzuna');
        }
      }
    }

    // --- 2. HIMALAYAS API (Startup & Underrated High-Growth Jobs) ---
    try {
      const himalayasUrl = `https://himalayas.app/jobs/api?limit=40${query ? `&search=${encodeURIComponent(query)}` : ''}`;
      const res = await fetchWithTimeout(himalayasUrl);
      if (res.ok) {
        const data = await res.json();
        const results = data.jobs || [];
        const formatted = results.map((j: any) => {
          const pubTime = j.pubDate ? new Date(j.pubDate).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffDays = Math.max(0, Math.floor((now - pubTime) / (1000 * 60 * 60 * 24)));
            if (diffDays === 0) postedText = 'Today';
            else if (diffDays === 1) postedText = 'Yesterday';
            else if (diffDays < 7) postedText = `${diffDays}d ago`;
            else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
            else postedText = `${Math.round(diffDays / 30)}mo ago`;
          }

          let salary = undefined;
          if (j.minSalary && j.maxSalary) {
            salary = `$${Math.round(j.minSalary / 1000)}k - $${Math.round(j.maxSalary / 1000)}k`;
          }

          return {
            id: `him_${j.id || Math.random().toString(36).slice(2, 9)}`,
            title: j.title || query,
            company: j.companyName || 'Emerging Startup',
            location: j.locationRestrictions?.join(', ') || 'Remote (Startup)',
            type: normalizeType(j.employmentType),
            workMode: 'Remote' as const,
            salary,
            description: cleanDescription(j.excerpt || j.description),
            url: j.applicationLink || j.url || 'https://himalayas.app',
            source: 'Himalayas (Startups)',
            isStartup: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('Himalayas (Startups)');
      }
    } catch (e) {
      console.error('Himalayas fetch error:', e);
      failedSources.push('Himalayas (Startups)');
    }

    // --- 3. REMOTIVE API ---
    try {
      const remotiveUrl = `https://remotive.com/api/remote-jobs?${query ? `search=${encodeURIComponent(query)}&` : ''}limit=35`;
      const res = await fetchWithTimeout(remotiveUrl);
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.jobs || []).map((j: any) => {
          const pubTime = j.publication_date ? new Date(j.publication_date).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffDays = Math.max(0, Math.floor((now - pubTime) / (1000 * 60 * 60 * 24)));
            if (diffDays === 0) postedText = 'Today';
            else if (diffDays === 1) postedText = 'Yesterday';
            else if (diffDays < 7) postedText = `${diffDays}d ago`;
            else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
            else postedText = `${Math.round(diffDays / 30)}mo ago`;
          }

          return {
            id: `remo_${j.id}`,
            title: (j.title || '').replace(/<\/?[^>]+(>|$)/g, ''),
            company: j.company_name,
            location: j.candidate_required_location || 'Remote',
            type: normalizeType(j.job_type),
            workMode: 'Remote' as const,
            salary: j.salary || undefined,
            description: cleanDescription(j.description),
            url: j.url,
            source: 'Remotive',
            isStartup: false,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('Remotive');
      }
    } catch (e) {
      console.error('Remotive fetch error:', e);
      failedSources.push('Remotive');
    }

    // --- 4. ARBEITNOW API ---
    try {
      const res = await fetchWithTimeout('https://arbeitnow.com/api/job-board-api');
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.data || []).map((j: any) => {
          const loc = j.location || (j.remote ? 'Remote' : 'On-site');
          const pubTime = j.created_at ? j.created_at * 1000 : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffDays = Math.max(0, Math.floor((now - pubTime) / (1000 * 60 * 60 * 24)));
            if (diffDays === 0) postedText = 'Today';
            else if (diffDays === 1) postedText = 'Yesterday';
            else if (diffDays < 7) postedText = `${diffDays}d ago`;
            else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
            else postedText = `${Math.round(diffDays / 30)}mo ago`;
          }

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
            isStartup: false,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q) || (j.description && j.description.toLowerCase().includes(q)));
        }
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('Arbeitnow');
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
          .map((j: any) => {
            const pubTime = j.date ? new Date(j.date).getTime() : undefined;
            let postedText = 'Recent';
            if (pubTime) {
              const diffDays = Math.max(0, Math.floor((now - pubTime) / (1000 * 60 * 60 * 24)));
              if (diffDays === 0) postedText = 'Today';
              else if (diffDays === 1) postedText = 'Yesterday';
              else if (diffDays < 7) postedText = `${diffDays}d ago`;
              else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
              else postedText = `${Math.round(diffDays / 30)}mo ago`;
            }

            return {
              id: `rok_${j.id}`,
              title: j.position,
              company: j.company,
              location: j.location || 'Remote',
              type: normalizeType(j.tags),
              workMode: 'Remote' as const,
              description: cleanDescription(j.description),
              url: j.apply_url || j.url,
              source: 'RemoteOK',
              isStartup: false,
              postedAt: pubTime,
              postedText,
              applicantCount: undefined,
              applicantText: undefined,
            };
          });

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q) || (j.description && j.description.toLowerCase().includes(q)));
        }
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('RemoteOK');
      }
    } catch (e) {
      console.error('RemoteOK fetch error:', e);
      failedSources.push('RemoteOK');
    }

    // --- 6. JOOBLE API ---
    const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || '';
    if (JOOBLE_API_KEY) {
      try {
        const joobleUrl = `https://jooble.org/api/${JOOBLE_API_KEY}`;
        const res = await fetchWithTimeout(joobleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: query || '',
            location: location || '',
            page: 1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          let jobList = Array.isArray(data.jobs) ? data.jobs : [];

          // If city search returned 0 on Jooble, fall back to nationwide search
          if (jobList.length === 0 && location) {
            try {
              const fallbackRes = await fetchWithTimeout(joobleUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  keywords: query || '',
                  location: 'India',
                  page: 1,
                }),
              });
              if (fallbackRes.ok) {
                const fbData = await fallbackRes.json();
                jobList = Array.isArray(fbData.jobs) ? fbData.jobs : [];
              }
            } catch {
              // Ignore fallback error
            }
          }

          let formatted = jobList.map((j: any) => {
            const pubTime = j.updated ? new Date(j.updated).getTime() : undefined;
            let postedText = 'Recent';
            if (pubTime) {
              const diffMs = Math.max(0, now - pubTime);
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffHours < 1) postedText = 'Just now';
              else if (diffHours < 24) postedText = `${diffHours}h ago`;
              else {
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays === 1) postedText = 'Yesterday';
                else if (diffDays < 7) postedText = `${diffDays}d ago`;
                else if (diffDays < 30) postedText = `${Math.round(diffDays / 7)}w ago`;
                else if (diffDays < 365) postedText = `${Math.round(diffDays / 30)}mo ago`;
                else postedText = `${Math.round(diffDays / 365)}y ago`;
              }
            }

            const loc = j.location || location || 'India';
            const desc = cleanDescription(j.snippet);

            return {
              id: `jooble_${j.id || Math.random().toString(36).substring(2, 9)}`,
              title: j.title || 'Position',
              company: j.company || 'Direct Employer',
              location: loc,
              type: normalizeType(j.type),
              workMode: detectWorkMode(loc, j.title, desc),
              salary: j.salary || undefined,
              description: desc,
              url: j.link || '#',
              source: 'Jooble',
              isStartup: false,
              postedAt: pubTime,
              postedText,
              applicantCount: undefined,
              applicantText: undefined,
            };
          });
          allJobs = [...allJobs, ...formatted];
        } else {
          failedSources.push('Jooble');
        }
      } catch (e) {
        console.error('Jooble fetch error:', e);
        failedSources.push('Jooble');
      }
    }

    // --- 7. GOOGLE FOR JOBS (JSearch via RapidAPI - indexes LinkedIn, Indeed, Glassdoor) ---
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
    if (RAPIDAPI_KEY) {
      try {
        const searchQueryStr = [query, location].filter(Boolean).join(' in ') || 'software jobs';
        const jsearchUrl = `https://jsearch.p.rapidapi.com/search-v2?query=${encodeURIComponent(searchQueryStr)}&num_pages=1`;
        const res = await fetchWithTimeout(jsearchUrl, {
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : [];
          let formatted = list.map((j: any) => {
            const pubTime = j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : undefined;
            const postedText = j.job_posted_at || 'Recent';
            const loc = j.job_location || [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || location || 'India';
            const publisher = j.job_publisher ? `${j.job_publisher} (Google Jobs)` : 'Google for Jobs';

            return {
              id: `jsearch_${j.job_id || Math.random().toString(36).substring(2, 9)}`,
              title: j.job_title || 'Position',
              company: j.employer_name || 'Direct Employer',
              location: loc,
              type: normalizeType(j.job_employment_type),
              workMode: j.job_is_remote ? ('Remote' as const) : detectWorkMode(loc, j.job_title, j.job_description || ''),
              salary: j.job_salary_string || (j.job_min_salary && j.job_max_salary ? `$${j.job_min_salary.toLocaleString()} - $${j.job_max_salary.toLocaleString()}` : undefined),
              description: cleanDescription(j.job_description),
              url: j.job_apply_link || j.job_google_link || '#',
              source: publisher,
              isStartup: false,
              postedAt: pubTime,
              postedText,
              applicantCount: undefined,
              applicantText: undefined,
            };
          });
          allJobs = [...allJobs, ...formatted];
        } else {
          failedSources.push('Google for Jobs (JSearch)');
        }
      } catch (e) {
        console.error('JSearch fetch error:', e);
        failedSources.push('Google for Jobs (JSearch)');
      }
    }

    // --- 8. DIRECT TECH & STARTUP ATS (Greenhouse & Lever - 100% Free, Official) ---
    const GREENHOUSE_COMPANIES = [
      { name: 'InMobi', slug: 'inmobi' },
      { name: 'Groww', slug: 'groww' },
      { name: 'Stripe', slug: 'stripe' },
      { name: 'Figma', slug: 'figma' },
      { name: 'GitLab', slug: 'gitlab' },
      { name: 'Vercel', slug: 'vercel' },
      { name: 'Cloudflare', slug: 'cloudflare' },
      { name: 'Datadog', slug: 'datadog' },
      { name: 'MongoDB', slug: 'mongodb' },
      { name: 'Twilio', slug: 'twilio' },
      { name: 'Elastic', slug: 'elastic' },
      { name: 'Pinterest', slug: 'pinterest' },
    ];

    try {
      const qLower = query.toLowerCase();
      const locLower = locQuery.toLowerCase();

      const ghPromises = GREENHOUSE_COMPANIES.map(async (comp) => {
        try {
          const res = await fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${comp.slug}/jobs`);
          if (!res.ok) return [];
          const data = await res.json();
          const jobs = Array.isArray(data.jobs) ? data.jobs : [];
          
          return jobs
            .filter((j: any) => {
              const t = (j.title || '').toLowerCase();
              const l = (j.location?.name || '').toLowerCase();
              const matchQ = !qLower || t.includes(qLower);
              const matchLoc = !locLower || l.includes(locLower) || l.includes('remote') || l.includes('anywhere');
              return matchQ && matchLoc;
            })
            .slice(0, 15)
            .map((j: any) => {
              const loc = j.location?.name || 'Remote / Multiple Locations';
              const pubTime = j.updated_at ? new Date(j.updated_at).getTime() : undefined;
              return {
                id: `gh_${comp.slug}_${j.id}`,
                title: j.title,
                company: comp.name,
                location: loc,
                type: 'Full-Time' as const,
                workMode: detectWorkMode(loc, j.title, ''),
                description: `Official direct opening at ${comp.name}. Apply directly through their Greenhouse corporate portal.`,
                url: j.absolute_url,
                source: `Direct ATS (${comp.name})`,
                isStartup: true,
                postedAt: pubTime,
                postedText: 'Recent',
                applicantCount: undefined,
                applicantText: undefined,
              };
            });
        } catch {
          return [];
        }
      });

      const ghResults = await Promise.allSettled(ghPromises);
      ghResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          allJobs = [...allJobs, ...r.value];
        }
      });
    } catch (e) {
      console.error('Direct ATS fetch error:', e);
      failedSources.push('Direct Tech ATS');
    }

    // --- 9. DEDICATED LINKEDIN SCRAPER PROXY (ScrapingDog / Proxycurl) ---
    const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY || '';
    if (SCRAPINGDOG_API_KEY) {
      try {
        const fieldParam = encodeURIComponent(query || 'developer');
        const locParam = location ? `&location=${encodeURIComponent(location)}` : '&location=India';
        const sdUrl = `https://api.scrapingdog.com/linkedinjobs/?api_key=${SCRAPINGDOG_API_KEY}&field=${fieldParam}${locParam}&page=1`;
        const res = await fetchWithTimeout(sdUrl);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const formatted = list.map((j: any) => ({
              id: `sd_${j.job_id || Math.random().toString(36).substring(2, 9)}`,
              title: j.job_position || j.title || 'Position',
              company: j.company_name || 'Employer',
              location: j.job_location || location || 'India',
              type: 'Full-Time' as const,
              workMode: detectWorkMode(j.job_location, j.job_position, ''),
              description: cleanDescription(j.job_description || j.job_position),
              url: j.job_link || '#',
              source: 'LinkedIn (ScrapingDog)',
              isStartup: false,
              postedText: j.job_posting_date || 'Recent',
              applicantCount: undefined,
              applicantText: undefined,
            }));
            allJobs = [...allJobs, ...formatted];
          }
        } else {
          failedSources.push('LinkedIn (ScrapingDog)');
        }
      } catch (e) {
        console.error('ScrapingDog fetch error:', e);
        failedSources.push('LinkedIn (ScrapingDog)');
      }
    }

    // De-duplicate
    const uniqueJobsMap = new Map();
    allJobs.forEach((job) => {
      const key = `${(job.title || '').toLowerCase().trim()}-${(job.company || '').toLowerCase().trim()}`;
      if (!uniqueJobsMap.has(key)) uniqueJobsMap.set(key, job);
    });
    let rawJobs = Array.from(uniqueJobsMap.values());
    let filtered = [...rawJobs];

    // Apply Strict Filters - NEVER fall back or override active user filters
    if (isStartupOnly) {
      filtered = filtered.filter((j) => j.isStartup);
    }

    if (workMode && workMode !== 'Any Mode') {
      filtered = filtered.filter((j) => j.workMode === workMode);
    }

    if (jobType && jobType !== 'All Types') {
      filtered = filtered.filter((j) => j.type === jobType);
    }

    if (source && source !== 'All Sources') {
      if (source === 'Google for Jobs (LinkedIn/Indeed)') {
        filtered = filtered.filter((j) => j.source.includes('Google') || j.source.includes('LinkedIn') || j.source.includes('Indeed'));
      } else if (source === 'LinkedIn (Live Scraper)') {
        filtered = filtered.filter((j) => j.source.includes('ScrapingDog') || j.source.includes('LinkedIn'));
      } else if (source === 'Direct Tech ATS (Greenhouse/Lever)') {
        filtered = filtered.filter((j) => j.source.startsWith('Direct ATS'));
      } else {
        filtered = filtered.filter((j) => j.source === source);
      }
    }

    if (postedTime && postedTime !== 'Any Time') {
      filtered = filtered.filter((j) => {
        if (!j.postedAt && !j.postedText) return false;
        const diffMs = j.postedAt ? now - j.postedAt : Infinity;
        const text = (j.postedText || '').toLowerCase();
        if (postedTime === 'Past 24 Hours') {
          return diffMs <= 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now');
        }
        if (postedTime === 'Past 3 Days') {
          return diffMs <= 3 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now') || text.includes('yesterday') || text.includes('1d') || text.includes('2d') || text.includes('3d') || text.includes('1 day') || text.includes('2 days') || text.includes('3 days');
        }
        if (postedTime === 'Past Week') {
          return diffMs <= 7 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('yesterday') || text.includes('d ago') || text.includes('1 week') || text.includes('1w');
        }
        return true;
      });
    }

    // Relevance sort
    if (query) {
      const q = query.toLowerCase();
      filtered.sort((a, b) => {
        const aScore = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bScore = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        return bScore - aScore;
      });
    }

    return NextResponse.json({
      jobs: filtered,
      meta: { total: filtered.length, rawTotal: rawJobs.length, failedSources },
    });
  } catch (error) {
    console.error('Job search failed:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs. Please try again.' }, { status: 500 });
  }
}