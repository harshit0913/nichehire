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

// Normalize messy job-type strings from different APIs into 3 consistent buckets
function normalizeType(raw: string | undefined | null): 'Full-Time' | 'Contract' | 'Other' {
  const t = (raw || '').toLowerCase();
  if (t.includes('full')) return 'Full-Time';
  if (t.includes('contract') || t.includes('freelance')) return 'Contract';
  return 'Other';
}

export async function POST(req: Request) {
  try {
    const { role, location } = await req.json();
    const query = (role || '').trim();
    const locQuery = (location || '').trim().toLowerCase();

    let allJobs: any[] = [];
    const failedSources: string[] = [];

    // 1. Remotive — free, remote-only jobs
    try {
      const remotiveUrl = `https://remotive.com/api/remote-jobs?${
        query ? `search=${encodeURIComponent(query)}&` : ''
      }limit=50`;
      const remotiveRes = await fetchWithTimeout(remotiveUrl);
      if (remotiveRes.ok) {
        const remotiveData = await remotiveRes.json();
        let formatted = (remotiveData.jobs || []).map((j: any) => ({
          id: `remo_${j.id}`,
          title: (j.title || '').replace(/<\/?[^>]+(>|$)/g, ''),
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          type: normalizeType(j.job_type),
          url: j.url,
          source: 'Remotive',
        }));

        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter((j: any) => {
            const loc = j.location.toLowerCase();
            return (
              loc.includes(locQuery) ||
              loc.includes('worldwide') ||
              loc.includes('global') ||
              loc.includes('anywhere')
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
      const arbeitnowRes = await fetchWithTimeout('https://arbeitnow.com/api/job-board-api');
      if (arbeitnowRes.ok) {
        const arbeitnowData = await arbeitnowRes.json();
        let formatted = (arbeitnowData.data || []).map((j: any) => ({
          id: `arb_${j.slug}`,
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? 'Remote' : 'Not specified'),
          type: normalizeType(Array.isArray(j.job_types) ? j.job_types[0] : j.job_types),
          url: j.url,
          source: 'Arbeitnow',
        }));

        if (query) {
          const q = query.toLowerCase();
          formatted = formatted.filter((j: any) => j.title.toLowerCase().includes(q));
        }
        if (locQuery && locQuery !== 'remote') {
          formatted = formatted.filter(
            (j: any) =>
              j.location.toLowerCase().includes(locQuery) || j.location.toLowerCase().includes('remote')
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

    // 3. Optional premium source — only runs if you've set RAPIDAPI_KEY
    const RAPID_API_KEY = process.env.RAPIDAPI_KEY || '';
    if (RAPID_API_KEY) {
      try {
        const linkedInRes = await fetchWithTimeout(
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
        if (linkedInRes.ok) {
          const liData = await linkedInRes.json();
          const formatted = (liData.jobs || []).map((j: any) => ({
            id: `li_${Math.random().toString(36).slice(2, 11)}`,
            title: j.title,
            company: j.company,
            location: j.location || 'Remote',
            type: normalizeType(j.employmentType),
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