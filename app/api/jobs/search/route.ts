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

// Normalize messy job-type data (string or array) from different APIs into 3 consistent buckets
function normalizeType(raw: string | string[] | undefined | null): 'Full-Time' | 'Contract' | 'Other' {
  const values = Array.isArray(raw) ? raw : [raw];
  const joined = values.filter(Boolean).join(' ').toLowerCase();
  if (joined.includes('full')) return 'Full-Time';
  if (joined.includes('contract') || joined.includes('freelance')) return 'Contract';
  return 'Other';
}

// Strip HTML tags and cap length — used so job descriptions are safe/short for resume tailoring
function cleanDescription(html: string | undefined | null, maxLen = 600): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export async function POST(req: Request) {
  try {
    const { role, location } = await req.json();
    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();

    let allJobs: any[] = [];
    const failedSources: string[] = [];

    // 1. Remotive — free, remote-only jobs, supports server-side search
    try {
      const remotiveUrl = `https://remotive.com/api/remote-jobs?${
        query ? `search=${encodeURIComponent(query)}&` : ''
      }limit=50`;
      const res = await fetchWithTimeout(remotiveUrl);
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.jobs || []).map((j: any) => ({
          id: `remo_${j.id}`,
          title: (j.title || '').replace(/<\/?[^>]+(>|$)/g, ''),
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          type: normalizeType(j.job_type),
          description: cleanDescription(j.description),
          url: j.url,
          source: 'Remotive',
        }));

        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter((j: any) => {
            const loc = j.location.toLowerCase();
            return (
              loc.includes(locQuery) || loc.includes('worldwide') || loc.includes('global') || loc.includes('anywhere')
            );
          });
        }
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('Remotive');
      }
    } catch (e) {
      console.error('Remotive fetch failed:', e);
      failedSources.push('Remotive');
    }

    // 2. Arbeitnow — free, not remote-only, adds real inventory beyond Remotive
    try {
      const res = await fetchWithTimeout('https://arbeitnow.com/api/job-board-api');
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.data || []).map((j: any) => ({
          id: `arb_${j.slug}`,
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? 'Remote' : 'Not specified'),
          type: normalizeType(j.job_types),
          description: cleanDescription(j.description),
          url: j.url,
          source: 'Arbeitnow',
        }));

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
      } else {
        failedSources.push('Arbeitnow');
      }
    } catch (e) {
      console.error('Arbeitnow fetch failed:', e);
      failedSources.push('Arbeitnow');
    }

    // 3. RemoteOK — free, no key, official public JSON endpoint (remoteok.com/api).
    //    Returns its ~100 most recent listings; no server-side search, so we filter here.
    try {
      const res = await fetchWithTimeout('https://remoteok.com/api');
      if (res.ok) {
        const data = await res.json();
        let formatted = (data || [])
          .filter((j: any) => j.id && j.position) // skip the first "legal notice" element
          .map((j: any) => ({
            id: `rok_${j.id}`,
            title: j.position,
            company: j.company,
            location: j.location || 'Remote',
            type: normalizeType(j.tags),
            description: cleanDescription(j.description),
            url: j.apply_url || j.url,
            source: 'RemoteOK',
          }));

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q));
        }
        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter(
            (j: any) => j.location.toLowerCase().includes(locQuery) || j.location.toLowerCase() === ''
          );
        }
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('RemoteOK');
      }
    } catch (e) {
      console.error('RemoteOK fetch failed:', e);
      failedSources.push('RemoteOK');
    }

    // 4. Jobicy — free, no key, official public API (jobicy.com/api/v2/remote-jobs)
    try {
      const tagParam = query.length >= 3 ? `&tag=${encodeURIComponent(query)}` : '';
      const res = await fetchWithTimeout(`https://jobicy.com/api/v2/remote-jobs?count=50${tagParam}`);
      if (res.ok) {
        const data = await res.json();
        let formatted = (data.jobs || []).map((j: any) => ({
          id: `jbc_${j.id}`,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo || 'Remote',
          type: normalizeType(j.jobType),
          description: cleanDescription(j.jobExcerpt || j.jobDescription),
          url: j.url,
          source: 'Jobicy',
        }));

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => (j.title || '').toLowerCase().includes(q));
        }
        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter(
            (j: any) => j.location.toLowerCase().includes(locQuery) || j.location.toLowerCase() === 'anywhere'
          );
        }
        allJobs = [...allJobs, ...formatted];
      } else {
        failedSources.push('Jobicy');
      }
    } catch (e) {
      console.error('Jobicy fetch failed:', e);
      failedSources.push('Jobicy');
    }

    // 5. Optional premium source — only runs if you've set RAPIDAPI_KEY
    const RAPID_API_KEY = process.env.RAPIDAPI_KEY || '';
    if (RAPID_API_KEY) {
      try {
        const res = await fetchWithTimeout(
          `https://linkedin-job-search-api.p.rapidapi.com/search?keyword=${encodeURIComponent(
            query
          )}&location=${encodeURIComponent(locQuery || 'worldwide')}`,
          {
            headers: {
              'x-rapidapi-key': RAPID_API_KEY,
              'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = (data.jobs || []).map((j: any) => ({
            id: `li_${Math.random().toString(36).slice(2, 11)}`,
            title: j.title,
            company: j.company,
            location: j.location || 'Remote',
            type: normalizeType(j.employmentType),
            description: cleanDescription(j.description),
            url: j.jobUrl,
            source: 'LinkedIn',
          }));
          allJobs = [...allJobs, ...formatted];
        } else {
          failedSources.push('LinkedIn');
        }
      } catch (e) {
        console.error('LinkedIn fetch failed:', e);
        failedSources.push('LinkedIn');
      }
    }

    // De-duplicate, case-insensitive on title + company
    const uniqueJobsMap = new Map();
    allJobs.forEach((job) => {
      const key = `${(job.title || '').toLowerCase()}-${(job.company || '').toLowerCase()}`;
      if (!uniqueJobsMap.has(key)) uniqueJobsMap.set(key, job);
    });
    const finalJobs = Array.from(uniqueJobsMap.values());

    // Basic relevance sort so a matching title floats to the top
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