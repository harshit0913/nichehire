import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

export async function POST(req: Request) {
  try {
    const { role, location, workMode, jobType, source, postedTime, maxApplicants, isStartupOnly } = await req.json();
    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();

    let allJobs: any[] = [];
    const failedSources: string[] = [];
    const now = Date.now();

    // --- 1. ADZUNA API (Major source for Real Local & On-site Jobs) ---
    const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
    const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      try {
        let countryCode = 'in';
        if (locQuery.includes('us') || locQuery.includes('united states') || locQuery.includes('new york') || locQuery.includes('san francisco') || locQuery.includes('california')) {
          countryCode = 'us';
        } else if (locQuery.includes('uk') || locQuery.includes('london') || locQuery.includes('united kingdom')) {
          countryCode = 'gb';
        } else if (locQuery.includes('canada') || locQuery.includes('toronto')) {
          countryCode = 'ca';
        }

        const cleanRole = encodeURIComponent(query || 'Business Analyst');
        // Clean location: extract city or country (e.g. "East Champaran, India" -> "India" if specific district has no jobs)
        let cleanLoc = locQuery && locQuery !== 'remote' ? `&where=${encodeURIComponent(location)}` : '';
        let adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=${cleanRole}${cleanLoc}`;

        let res = await fetchWithTimeout(adzunaUrl);
        let data = res.ok ? await res.json() : { results: [] };
        let results = data.results || [];

        // Fallback: If searching a specific district/city returned 0, search nationwide in India/country
        if (results.length === 0 && cleanLoc) {
          const fallbackLoc = countryCode === 'in' ? 'India' : countryCode === 'us' ? 'United States' : 'United Kingdom';
          adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=${cleanRole}&where=${encodeURIComponent(fallbackLoc)}`;
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
            isStartup: j.company?.display_name ? !j.company.display_name.toLowerCase().includes('tcs') && !j.company.display_name.toLowerCase().includes('infosys') : true,
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

    // --- 2. LINKEDIN PUBLIC SEARCH ---
    try {
      const linkedInQuery = encodeURIComponent(query || 'Business Analyst');
      // If location contains India or is specific, query India
      const targetLoc = locQuery.includes('india') ? 'India' : locQuery && locQuery !== 'remote' ? location : 'worldwide';
      const linkedInUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${linkedInQuery}&location=${encodeURIComponent(targetLoc)}&start=0`;

      const res = await fetchWithTimeout(linkedInUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const cardElements = $('li').toArray().slice(0, 20);

        const linkedInJobs = await Promise.all(
          cardElements.map(async (el) => {
            const title = $(el).find('.base-search-card__title').text().trim();
            const company = $(el).find('.base-search-card__subtitle').text().trim();
            const loc = $(el).find('.job-search-card__location').text().trim();
            const link = $(el).find('a.base-card__full-link').attr('href');
            const timeEl = $(el).find('time');
            const timeText = timeEl.text().trim();
            const timeDatetime = timeEl.attr('datetime');
            const entityUrn = $(el).find('[data-entity-urn]').attr('data-entity-urn') || $(el).attr('data-entity-urn');

            if (!title || !company) return null;

            let jobId: string | null = null;
            if (entityUrn && entityUrn.includes('jobPosting:')) {
              jobId = entityUrn.split('jobPosting:')[1];
            } else if (link) {
              const m = link.match(/([0-9]{8,})/);
              if (m) jobId = m[1];
            }

            let realPostedText = timeText || 'Recent';
            let realApplicantText: string | undefined = undefined;
            let realApplicantCount: number | undefined = undefined;

            if (jobId) {
              try {
                const detailRes = await fetchWithTimeout(
                  `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
                  {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                    },
                  },
                  2500
                );
                if (detailRes.ok) {
                  const detailHtml = await detailRes.text();
                  const $$ = cheerio.load(detailHtml);
                  const applicantsRaw = $$('.num-applicants__caption').text().trim() || $$('.applicant-count').text().trim();
                  const postedRaw = $$('.posted-time-ago__text').text().trim();

                  if (postedRaw) realPostedText = postedRaw;
                  if (applicantsRaw) {
                    realApplicantText = applicantsRaw;
                    const cleanText = applicantsRaw.toLowerCase();
                    if (cleanText.includes('over 200') || cleanText.includes('200+')) {
                      realApplicantCount = 201;
                    } else if (cleanText.includes('over 100') || cleanText.includes('100+')) {
                      realApplicantCount = 101;
                    } else if (cleanText.includes('first 25') || cleanText.includes('under 25') || cleanText.includes('under 10')) {
                      realApplicantCount = 10;
                    } else {
                      const numMatch = applicantsRaw.match(/(\d+)/);
                      if (numMatch) {
                        realApplicantCount = parseInt(numMatch[1], 10);
                      }
                    }
                  }
                }
              } catch {
                // Silently fallback to search card data if detail fetch times out
              }
            }

            const pubTime = timeDatetime ? new Date(timeDatetime).getTime() : now - 7 * 86400000;

            return {
              id: `li_${jobId || Math.random().toString(36).slice(2, 11)}`,
              title,
              company,
              location: loc || location || 'India',
              type: 'Full-Time',
              workMode: detectWorkMode(loc, title, ''),
              description: `Verified position on LinkedIn: ${title} at ${company}. Apply directly on LinkedIn.`,
              url: link || 'https://www.linkedin.com/jobs/',
              source: 'LinkedIn',
              isStartup: true,
              postedAt: pubTime,
              postedText: realPostedText,
              applicantCount: realApplicantCount,
              applicantText: realApplicantText,
            };
          })
        );

        allJobs = [...allJobs, ...linkedInJobs.filter(Boolean)];
      }
    } catch (e) {
      console.error('LinkedIn fetch error:', e);
    }

    // --- 3. HIMALAYAS API (Startup & Underrated High-Growth Jobs) ---
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
      }
    } catch (e) {
      console.error('Himalayas fetch error:', e);
    }

    // --- 4. REMOTIVE API ---
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
            isStartup: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
        allJobs = [...allJobs, ...formatted];
      }
    } catch (e) {
      console.error('Remotive fetch error:', e);
    }

    // --- 5. ARBEITNOW API ---
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
            isStartup: true,
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
      }
    } catch (e) {
      console.error('Arbeitnow fetch error:', e);
    }

    // --- 6. REMOTEOK API ---
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
              isStartup: true,
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
      }
    } catch (e) {
      console.error('RemoteOK fetch error:', e);
    }

    // De-duplicate
    const uniqueJobsMap = new Map();
    allJobs.forEach((job) => {
      const key = `${(job.title || '').toLowerCase().trim()}-${(job.company || '').toLowerCase().trim()}`;
      if (!uniqueJobsMap.has(key)) uniqueJobsMap.set(key, job);
    });
    let rawJobs = Array.from(uniqueJobsMap.values());
    let filtered = [...rawJobs];

    // Apply Filters with Graceful Fallback
    if (isStartupOnly) {
      const startupFiltered = filtered.filter((j) => j.isStartup);
      if (startupFiltered.length > 0) filtered = startupFiltered;
    }

    if (workMode && workMode !== 'Any Mode') {
      const modeFiltered = filtered.filter((j) => j.workMode === workMode);
      if (modeFiltered.length > 0) filtered = modeFiltered;
    }

    if (jobType && jobType !== 'All Types') {
      const typeFiltered = filtered.filter((j) => j.type === jobType);
      if (typeFiltered.length > 0) filtered = typeFiltered;
    }

    if (source && source !== 'All Sources') {
      const sourceFiltered = filtered.filter((j) => j.source === source);
      if (sourceFiltered.length > 0) filtered = sourceFiltered;
    }

    if (postedTime && postedTime !== 'Any Time') {
      const timeFiltered = filtered.filter((j) => {
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
      if (timeFiltered.length > 0) filtered = timeFiltered;
    }

    if (maxApplicants && maxApplicants !== 'Any') {
      let limit = 100;
      if (maxApplicants.includes('25')) limit = 25;
      else if (maxApplicants.includes('50')) limit = 50;
      const appFiltered = filtered.filter((j) => j.applicantCount !== undefined && j.applicantCount <= limit);
      if (appFiltered.length > 0) filtered = appFiltered;
    }

    // If over-filtered down to 0, fall back to rawJobs
    if (filtered.length === 0 && rawJobs.length > 0) {
      filtered = rawJobs;
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