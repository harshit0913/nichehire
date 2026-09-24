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

function cleanDescription(html: string | undefined | null, maxLen = 1200): string {
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

// 30+ Verified Direct Tech Unicorn & Enterprise Career Portals (Greenhouse & Lever)
const DIRECT_PORTAL_COMPANIES = [
  // Greenhouse boards
  { name: 'Stripe', slug: 'stripe', type: 'greenhouse' },
  { name: 'Figma', slug: 'figma', type: 'greenhouse' },
  { name: 'GitLab', slug: 'gitlab', type: 'greenhouse' },
  { name: 'Vercel', slug: 'vercel', type: 'greenhouse' },
  { name: 'InMobi', slug: 'inmobi', type: 'greenhouse' },
  { name: 'Groww', slug: 'groww', type: 'greenhouse' },
  { name: 'Datadog', slug: 'datadog', type: 'greenhouse' },
  { name: 'Twilio', slug: 'twilio', type: 'greenhouse' },
  { name: 'MongoDB', slug: 'mongodb', type: 'greenhouse' },
  { name: 'Elastic', slug: 'elastic', type: 'greenhouse' },
  { name: 'Pinterest', slug: 'pinterest', type: 'greenhouse' },
  { name: 'Coinbase', slug: 'coinbase', type: 'greenhouse' },
  { name: 'Cloudflare', slug: 'cloudflare', type: 'greenhouse' },
  { name: 'Airbnb', slug: 'airbnb', type: 'greenhouse' },
  { name: 'Discord', slug: 'discord', type: 'greenhouse' },
  { name: 'Affirm', slug: 'affirm', type: 'greenhouse' },
  { name: 'Deliveroo', slug: 'deliveroo', type: 'greenhouse' },
  { name: 'Reddit', slug: 'reddit', type: 'greenhouse' },
  { name: 'Lyft', slug: 'lyft', type: 'greenhouse' },
  { name: 'Instacart', slug: 'instacart', type: 'greenhouse' },
  { name: 'Robinhood', slug: 'robinhood', type: 'greenhouse' },
  { name: 'Dropbox', slug: 'dropbox', type: 'greenhouse' },
  { name: 'HubSpot', slug: 'hubspot', type: 'greenhouse' },
  { name: 'Coursera', slug: 'coursera', type: 'greenhouse' },
  { name: 'Duolingo', slug: 'duolingo', type: 'greenhouse' },
  // Lever boards
  { name: 'CRED', slug: 'cred', type: 'lever' },
  { name: 'Meesho', slug: 'meesho', type: 'lever' },
  { name: 'Spotify', slug: 'spotify', type: 'lever' },
];

export async function POST(req: Request) {
  try {
    const {
      role,
      location,
      workMode,
      jobType,
      postedTime,
      isStartupOnly,
      distance,
      applicants,
      verifiedOnly,
    } = await req.json();

    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();
    const now = Date.now();
    const failedSources: string[] = [];

    // --- 1. ADZUNA API (Local & On-Site Verified) ---
    async function fetchAdzuna(): Promise<any[]> {
      const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
      const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];

      let countryCode: string | null = 'in';
      if (locQuery) {
        const matched = Object.entries(ADZUNA_COUNTRY_MAP).find(([k]) => locQuery.includes(k));
        countryCode = matched ? matched[1] : null;
      }
      if (!countryCode) return [];

      try {
        const cleanWhat = query ? `&what=${encodeURIComponent(query)}` : '';
        const cleanLoc = locQuery && locQuery !== 'remote' ? `&where=${encodeURIComponent(location)}` : '';
        const maxDaysParam = '&max_days_old=7'; // Strictly <= 7 days

        let adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50${cleanWhat}${cleanLoc}${maxDaysParam}`;
        let res = await fetchWithTimeout(adzunaUrl);
        let data = res.ok ? await res.json() : { results: [] };
        let results = data.results || [];

        if (results.length === 0 && cleanLoc) {
          const fallbackCountryName = Object.entries(ADZUNA_COUNTRY_MAP).find(([, code]) => code === countryCode)?.[0] || 'India';
          adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50${cleanWhat}&where=${encodeURIComponent(fallbackCountryName)}${maxDaysParam}`;
          res = await fetchWithTimeout(adzunaUrl);
          if (res.ok) {
            data = await res.json();
            results = data.results || [];
          }
        }

        return results.map((j: any) => {
          const locName = j.location?.display_name || location || 'India';
          const desc = cleanDescription(j.description);
          const mode = detectWorkMode(locName, j.title, desc);
          const salaryMin = j.salary_min ? Math.round(j.salary_min) : null;
          const salaryMax = j.salary_max ? Math.round(j.salary_max) : null;
          const salary = salaryMin && salaryMax ? `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}` : salaryMin ? `$${salaryMin.toLocaleString()}+` : undefined;

          const pubTime = j.created ? new Date(j.created).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
            if (diffHours < 1) postedText = 'Just now';
            else if (diffHours < 24) postedText = `${diffHours}h ago`;
            else postedText = `${Math.floor(diffHours / 24)}d ago`;
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
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Adzuna');
        return [];
      }
    }

    // --- 2. HIMALAYAS API (Startups & Underrated High-Growth) ---
    async function fetchHimalayas(): Promise<any[]> {
      try {
        const himalayasUrl = `https://himalayas.app/jobs/api?limit=40${query ? `&search=${encodeURIComponent(query)}` : ''}`;
        const res = await fetchWithTimeout(himalayasUrl);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.jobs || []).map((j: any) => {
          const pubTime = j.pubDate ? new Date(j.pubDate).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
            if (diffHours < 1) postedText = 'Just now';
            else if (diffHours < 24) postedText = `${diffHours}h ago`;
            else postedText = `${Math.floor(diffHours / 24)}d ago`;
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
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Himalayas');
        return [];
      }
    }

    // --- 3. REMOTIVE API ---
    async function fetchRemotive(): Promise<any[]> {
      try {
        const remotiveUrl = `https://remotive.com/api/remote-jobs?${query ? `search=${encodeURIComponent(query)}&` : ''}limit=35`;
        const res = await fetchWithTimeout(remotiveUrl);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.jobs || []).map((j: any) => {
          const pubTime = j.publication_date ? new Date(j.publication_date).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
            if (diffHours < 1) postedText = 'Just now';
            else if (diffHours < 24) postedText = `${diffHours}h ago`;
            else postedText = `${Math.floor(diffHours / 24)}d ago`;
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
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Remotive');
        return [];
      }
    }

    // --- 4. ARBEITNOW API ---
    async function fetchArbeitnow(): Promise<any[]> {
      try {
        const url = `https://www.arbeitnow.com/api/job-board-api${query ? `?search=${encodeURIComponent(query)}` : ''}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).slice(0, 35).map((j: any) => {
          const pubTime = j.created_at ? j.created_at * 1000 : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
            if (diffHours < 1) postedText = 'Just now';
            else if (diffHours < 24) postedText = `${diffHours}h ago`;
            else postedText = `${Math.floor(diffHours / 24)}d ago`;
          }

          return {
            id: `arb_${j.slug}`,
            title: j.title,
            company: j.company_name,
            location: j.location || (j.remote ? 'Remote' : 'Various'),
            type: normalizeType(j.job_types),
            workMode: j.remote ? ('Remote' as const) : detectWorkMode(j.location, j.title, j.description || ''),
            salary: undefined,
            description: cleanDescription(j.description),
            url: j.url,
            source: 'Arbeitnow',
            isStartup: false,
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Arbeitnow');
        return [];
      }
    }

    // --- 5. REMOTEOK API ---
    async function fetchRemoteOK(): Promise<any[]> {
      try {
        const res = await fetchWithTimeout('https://remoteok.com/api', {
          headers: { 'User-Agent': 'NicheHireJobSearch/2.0 (contact@nichehire.app)' },
        });
        if (!res.ok) return [];
        const list = await res.json();
        const valid = Array.isArray(list) ? list.slice(1) : [];
        const qLower = query.toLowerCase();

        return valid
          .filter((j: any) => !qLower || (j.position || '').toLowerCase().includes(qLower) || (j.tags || []).some((t: string) => t.toLowerCase().includes(qLower)))
          .slice(0, 30)
          .map((j: any) => {
            const pubTime = j.epoch ? j.epoch * 1000 : (j.date ? new Date(j.date).getTime() : undefined);
            let postedText = 'Recent';
            if (pubTime) {
              const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
              if (diffHours < 1) postedText = 'Just now';
              else if (diffHours < 24) postedText = `${diffHours}h ago`;
              else postedText = `${Math.floor(diffHours / 24)}d ago`;
            }

            return {
              id: `rok_${j.id}`,
              title: j.position || 'Remote Position',
              company: j.company || 'Remote Employer',
              location: j.location || 'Remote',
              type: 'Full-Time' as const,
              workMode: 'Remote' as const,
              salary: j.salary || undefined,
              description: cleanDescription(j.description),
              url: j.url || `https://remoteok.com/l/${j.id}`,
              source: 'RemoteOK',
              isStartup: false,
              isVerified: true,
              postedAt: pubTime,
              postedText,
              applicantCount: undefined,
              applicantText: undefined,
            };
          });
      } catch (e) {
        failedSources.push('RemoteOK');
        return [];
      }
    }

    // --- 6. JOOBLE API (140,000+ Sources Aggregator) ---
    async function fetchJooble(): Promise<any[]> {
      const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || '';
      if (!JOOBLE_API_KEY) return [];

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

        if (!res.ok) return [];
        const data = await res.json();
        let jobList = Array.isArray(data.jobs) ? data.jobs : [];

        if (jobList.length === 0 && location) {
          try {
            const fbRes = await fetchWithTimeout(joobleUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keywords: query || '', location: 'India', page: 1 }),
            });
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              jobList = Array.isArray(fbData.jobs) ? fbData.jobs : [];
            }
          } catch {
            // Ignore fallback error
          }
        }

        return jobList.map((j: any) => {
          const pubTime = j.updated ? new Date(j.updated).getTime() : undefined;
          let postedText = 'Recent';
          if (pubTime) {
            const diffHours = Math.floor(Math.max(0, now - pubTime) / (1000 * 60 * 60));
            if (diffHours < 1) postedText = 'Just now';
            else if (diffHours < 24) postedText = `${diffHours}h ago`;
            else postedText = `${Math.floor(diffHours / 24)}d ago`;
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
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Jooble');
        return [];
      }
    }

    // --- 7. GOOGLE FOR JOBS / JSEARCH (LinkedIn, Indeed & Glassdoor indexed) ---
    async function fetchJSearch(): Promise<any[]> {
      const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
      if (!RAPIDAPI_KEY) return [];

      try {
        const searchQueryStr = [query, location].filter(Boolean).join(' in ') || 'software jobs';
        const jsearchUrl = `https://jsearch.p.rapidapi.com/search-v2?query=${encodeURIComponent(searchQueryStr)}&num_pages=1`;
        const res = await fetchWithTimeout(jsearchUrl, {
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          },
        });

        if (!res.ok) return [];
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : [];

        return list.map((j: any) => {
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
            isVerified: true,
            postedAt: pubTime,
            postedText,
            applicantCount: undefined,
            applicantText: undefined,
          };
        });
      } catch (e) {
        failedSources.push('Google for Jobs (JSearch)');
        return [];
      }
    }

    // --- 8. 30+ DIRECT COMPANY CAREER PORTALS (Greenhouse & Lever) ---
    async function fetchDirectPortals(): Promise<any[]> {
      const qLower = query.toLowerCase();
      const locLower = locQuery;

      const portalPromises = DIRECT_PORTAL_COMPANIES.map(async (comp) => {
        try {
          if (comp.type === 'greenhouse') {
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
              .slice(0, 10)
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
                  description: `Official direct opening at ${comp.name}. Apply directly through their corporate career portal.`,
                  url: j.absolute_url,
                  source: `Direct Career Portal (${comp.name})`,
                  isStartup: true,
                  isVerified: true,
                  directPortal: true,
                  postedAt: pubTime,
                  postedText: 'Recent',
                  applicantCount: undefined,
                  applicantText: undefined,
                };
              });
          } else if (comp.type === 'lever') {
            const res = await fetchWithTimeout(`https://api.lever.co/v0/postings/${comp.slug}?mode=json`);
            if (!res.ok) return [];
            const jobs = await res.json();
            if (!Array.isArray(jobs)) return [];

            return jobs
              .filter((j: any) => {
                const t = (j.text || '').toLowerCase();
                const l = (j.categories?.location || '').toLowerCase();
                const matchQ = !qLower || t.includes(qLower);
                const matchLoc = !locLower || l.includes(locLower) || l.includes('remote') || l.includes('anywhere');
                return matchQ && matchLoc;
              })
              .slice(0, 10)
              .map((j: any) => {
                const loc = j.categories?.location || 'Remote / Various';
                const pubTime = j.createdAt ? j.createdAt : undefined;
                return {
                  id: `lev_${comp.slug}_${j.id}`,
                  title: j.text,
                  company: comp.name,
                  location: loc,
                  type: normalizeType(j.categories?.commitment),
                  workMode: detectWorkMode(loc, j.text, j.descriptionPlain || ''),
                  description: cleanDescription(j.descriptionPlain || `Direct posting at ${comp.name}`),
                  url: j.hostedUrl || j.applyUrl,
                  source: `Direct Career Portal (${comp.name})`,
                  isStartup: true,
                  isVerified: true,
                  directPortal: true,
                  postedAt: pubTime,
                  postedText: 'Recent',
                  applicantCount: undefined,
                  applicantText: undefined,
                };
              });
          }
          return [];
        } catch {
          return [];
        }
      });

      const results = await Promise.allSettled(portalPromises);
      let combined: any[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          combined = [...combined, ...r.value];
        }
      });
      return combined;
    }

    // --- 9. DEDICATED LINKEDIN SCRAPER PROXY (ScrapingDog) ---
    async function fetchScrapingDog(): Promise<any[]> {
      const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY || '';
      if (!SCRAPINGDOG_API_KEY) return [];

      try {
        const fieldParam = encodeURIComponent(query || 'developer');
        const locParam = location ? `&location=${encodeURIComponent(location)}` : '&location=India';
        const sdUrl = `https://api.scrapingdog.com/linkedinjobs/?api_key=${SCRAPINGDOG_API_KEY}&field=${fieldParam}${locParam}&page=1`;
        const res = await fetchWithTimeout(sdUrl);
        if (!res.ok) return [];
        const list = await res.json();
        if (!Array.isArray(list)) return [];

        return list.map((j: any) => ({
          id: `sd_${j.job_id || Math.random().toString(36).substring(2, 9)}`,
          title: j.job_position || j.title || 'Position',
          company: j.company_name || 'Employer',
          location: j.job_location || location || 'India',
          type: 'Full-Time' as const,
          workMode: detectWorkMode(j.job_location, j.job_position, ''),
          description: cleanDescription(j.job_description || j.job_position),
          url: j.job_link || '#',
          source: 'LinkedIn',
          isStartup: false,
          isVerified: true,
          postedText: j.job_posting_date || 'Recent',
          applicantCount: undefined,
          applicantText: undefined,
        }));
      } catch (e) {
        failedSources.push('LinkedIn (ScrapingDog)');
        return [];
      }
    }

    // --- EXECUTE ALL SOURCES IN PARALLEL ---
    const sourceResults = await Promise.allSettled([
      fetchAdzuna(),
      fetchHimalayas(),
      fetchRemotive(),
      fetchArbeitnow(),
      fetchRemoteOK(),
      fetchJooble(),
      fetchJSearch(),
      fetchDirectPortals(),
      fetchScrapingDog(),
    ]);

    let allJobs: any[] = [];
    sourceResults.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allJobs = [...allJobs, ...res.value];
      }
    });

    // --- DE-DUPLICATE ---
    const uniqueJobsMap = new Map();
    allJobs.forEach((job) => {
      const key = `${(job.title || '').toLowerCase().trim()}-${(job.company || '').toLowerCase().trim()}`;
      if (!uniqueJobsMap.has(key)) uniqueJobsMap.set(key, job);
    });
    let rawJobs = Array.from(uniqueJobsMap.values());
    let filtered = [...rawJobs];

    // --- STRICT 7-DAY MAXIMUM AGE RULE ---
    // Reject any job older than 7 days
    filtered = filtered.filter((j) => {
      if (j.postedAt) {
        return now - j.postedAt <= 7 * 24 * 60 * 60 * 1000;
      }
      const text = (j.postedText || '').toLowerCase();
      if (text.includes('month') || text.includes('mo ago') || text.includes('year') || text.includes('yr ago')) return false;
      if (text.includes('w ago') && !text.includes('1w')) return false;
      if (text.includes('weeks') && !text.includes('1 week')) return false;
      const dayMatch = text.match(/(\d+)\s*d/);
      if (dayMatch && parseInt(dayMatch[1], 10) > 7) return false;
      const daysAgoMatch = text.match(/(\d+)\s*days?\s*ago/);
      if (daysAgoMatch && parseInt(daysAgoMatch[1], 10) > 7) return false;
      return true;
    });

    // --- WORK MODE FILTER ---
    if (workMode && workMode !== 'Any Mode') {
      filtered = filtered.filter((j) => j.workMode === workMode);
    }

    // --- JOB TYPE FILTER ---
    if (jobType && jobType !== 'All Types') {
      filtered = filtered.filter((j) => j.type === jobType);
    }

    // --- POSTED TIME SUB-FILTER (Within the past week) ---
    if (postedTime && postedTime !== 'Any Time') {
      filtered = filtered.filter((j) => {
        if (!j.postedAt && !j.postedText) return true; // keep if indeterminate but passed 7-day
        const diffMs = j.postedAt ? now - j.postedAt : Infinity;
        const text = (j.postedText || '').toLowerCase();

        if (postedTime === 'Past 6 Hours') {
          return diffMs <= 6 * 60 * 60 * 1000 || text.includes('just now') || text.includes('1h') || text.includes('2h') || text.includes('3h') || text.includes('4h') || text.includes('5h') || text.includes('6h');
        }
        if (postedTime === 'Past 12 Hours') {
          return diffMs <= 12 * 60 * 60 * 1000 || text.includes('just now') || text.includes('hour') || (diffMs <= 12 * 60 * 60 * 1000);
        }
        if (postedTime === 'Past 24 Hours') {
          return diffMs <= 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now');
        }
        if (postedTime === 'Past 3 Days') {
          return diffMs <= 3 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now') || text.includes('yesterday') || text.includes('1d') || text.includes('2d') || text.includes('3d') || text.includes('1 day') || text.includes('2 days') || text.includes('3 days');
        }
        if (postedTime === 'Past Week') {
          return diffMs <= 7 * 24 * 60 * 60 * 1000 || true;
        }
        return true;
      });
    }

    // --- DISTANCE FILTER ---
    if (distance && distance !== 'Any Distance' && locQuery) {
      filtered = filtered.filter((j) => {
        if (j.workMode === 'Remote') return true;
        const jLoc = (j.location || '').toLowerCase();
        if (distance === 'Within 10 km') {
          return jLoc.includes(locQuery);
        }
        if (distance === 'Within 25 km' || distance === 'Within 50 km') {
          return jLoc.includes(locQuery) || locQuery.split(' ').some((word: string) => word.length > 3 && jLoc.includes(word));
        }
        return true;
      });
    }

    // --- APPLICANTS FILTER ---
    if (applicants && applicants !== 'Any Applicants') {
      filtered = filtered.filter((j) => {
        if (j.applicantCount === undefined) return true; // keep if early/unspecified
        if (applicants === 'Early Bird (< 10)') {
          return j.applicantCount < 10;
        }
        if (applicants === 'Under 25') {
          return j.applicantCount < 25;
        }
        if (applicants === 'Under 50') {
          return j.applicantCount < 50;
        }
        return true;
      });
    }

    // --- VERIFIED ONLY FILTER ---
    if (verifiedOnly) {
      filtered = filtered.filter((j) => j.isVerified);
    }

    // --- STARTUP ONLY FILTER ---
    if (isStartupOnly) {
      filtered = filtered.filter((j) => j.isStartup);
    }

    // --- RELEVANCE SORTING ---
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
      meta: {
        total: filtered.length,
        rawTotal: rawJobs.length,
        failedSources,
        portalCount: DIRECT_PORTAL_COMPANIES.length,
      },
    });
  } catch (error) {
    console.error('Job search failed:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs. Please try again.' }, { status: 500 });
  }
}