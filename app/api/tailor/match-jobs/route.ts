import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";

// --- TIER 1: ADZUNA API ---
async function fetchAdzuna(role: string, location: string, appId: string, appKey: string) {
  try {
    let cleanRole = encodeURIComponent(role);
    let cleanLocation = encodeURIComponent(location);
    // Increased results from 30 to 50
    let url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${cleanRole}&where=${cleanLocation}`;
    
    let res = await fetch(url);
    if (!res.ok) return [];
    let data = await res.json();
    let results = data.results || [];
    
    if (results.length === 0) {
      const broadRole = (role.toLowerCase().includes('ca') || role.toLowerCase().includes('article')) ? 'Audit Accounting Finance Tax' : role;
      url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(broadRole)}&where=India`;
      res = await fetch(url);
      if (res.ok) {
        data = await res.json();
        results = data.results || [];
      }
    }

    return results.map((j: any) => ({
      id: String(j.id),
      title: j.title.replace(/<\/?[^>]+(>|$)/g, ""),
      company: j.company?.display_name || 'Unknown',
      location: j.location?.display_name || location,
      description: (j.description || '').replace(/<\/?[^>]+(>|$)/g, "").substring(0, 200),
      url: j.redirect_url,
      source: 'Adzuna'
    }));
  } catch { return []; }
}

// --- TIER 2A: ACTIVE JOBS DB ---
async function fetchActiveJobsDB(role: string) {
  if (!RAPID_API_KEY) return [];
  try {
    const res = await fetch(`https://active-jobs-db.p.rapidapi.com/active-jobs?title=${encodeURIComponent(role)}`, {
      headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'active-jobs-db.p.rapidapi.com' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Removed the slice limit here
    return (data.data || []).map((j: any) => ({
      id: `ajdb_${Math.random().toString(36).substr(2, 9)}`,
      title: j.title || role,
      company: j.company || 'Active Jobs DB Employer',
      location: j.location || 'India',
      description: 'See full description on portal.',
      url: j.url || 'https://www.linkedin.com/jobs/',
      source: 'Active Jobs DB'
    }));
  } catch { return []; }
}

// --- TIER 2B: REMOTE JOBS API ---
async function fetchRemoteJobs(role: string) {
  if (!RAPID_API_KEY) return [];
  try {
    const res = await fetch(`https://remote-jobs-api1.p.rapidapi.com/jobs?search=${encodeURIComponent(role)}`, {
      headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'remote-jobs-api1.p.rapidapi.com' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Removed the slice limit here
    return (data.jobs || []).map((j: any) => ({
      id: `rj_${Math.random().toString(36).substr(2, 9)}`,
      title: j.title || role,
      company: j.company_name || 'Remote Employer',
      location: 'Remote',
      description: 'See full description on portal.',
      url: j.url || 'https://www.linkedin.com/jobs/',
      source: 'Remote Jobs API'
    }));
  } catch { return []; }
}

// --- TIER 2C: LINKEDIN JOB SEARCH API ---
async function fetchLinkedInAPI(role: string, location: string) {
  if (!RAPID_API_KEY) return [];
  try {
    const res = await fetch(`https://linkedin-job-search-api.p.rapidapi.com/search?keyword=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`, {
      headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Removed the slice limit here
    return (data.jobs || []).map((j: any) => ({
      id: `li_${Math.random().toString(36).substr(2, 9)}`,
      title: j.title || role,
      company: j.company || 'LinkedIn Employer',
      location: j.location || location,
      description: 'See full description on portal.',
      url: j.jobUrl || 'https://www.linkedin.com/jobs/',
      source: 'LinkedIn API'
    }));
  } catch { return []; }
}

// --- TIER 2D: JOBS SEARCH API ---
async function fetchJobsSearchAPI(role: string, location: string) {
  if (!RAPID_API_KEY) return [];
  try {
    const res = await fetch(`https://jobs-search-api.p.rapidapi.com/get-jobs-excel`, {
      method: 'POST',
      headers: { 
        'x-rapidapi-key': RAPID_API_KEY, 
        'x-rapidapi-host': 'jobs-search-api.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keywords: role, location: location })
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Removed the slice limit here
    return (data.results || []).map((j: any) => ({
      id: `jsa_${Math.random().toString(36).substr(2, 9)}`,
      title: j.job_title || role,
      company: j.company_name || 'Unknown',
      location: j.location || location,
      description: 'See full description on portal.',
      url: j.job_link || 'https://www.linkedin.com/jobs/',
      source: 'Jobs Search API'
    }));
  } catch { return []; }
}

export async function POST(req: Request) {
  try {
    const { resume, role, location } = await req.json();
    const targetRole = role || 'Finance';
    const targetLocation = location || 'India';

    let allAggregatedJobs: any[] = [];

    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      allAggregatedJobs = await fetchAdzuna(targetRole, targetLocation, process.env.ADZUNA_APP_ID, process.env.ADZUNA_APP_KEY);
    }

    const rapidApiPromises = [
      fetchActiveJobsDB(targetRole),
      fetchRemoteJobs(targetRole),
      fetchLinkedInAPI(targetRole, targetLocation),
      fetchJobsSearchAPI(targetRole, targetLocation)
    ];

    const results = await Promise.allSettled(rapidApiPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allAggregatedJobs = [...allAggregatedJobs, ...result.value];
      }
    });

    const isFinance = targetRole.toLowerCase().includes('ca') || targetRole.toLowerCase().includes('article') || targetRole.toLowerCase().includes('account');
    const safeKeywords = isFinance 
      ? ['ca', 'chartered', 'account', 'finance', 'audit', 'tax', 'article', 'bookkeep', 'tally', 'gst']
      : targetRole.toLowerCase().split(' ').filter((w: string) => w.length > 2);

    let sanitizedJobs = allAggregatedJobs.filter(job => {
      const searchString = (job.title + ' ' + job.description).toLowerCase();
      return safeKeywords.some((kw: string) => searchString.includes(kw));
    });

    const uniqueJobsMap = new Map();
    sanitizedJobs.forEach(job => {
      const uniqueKey = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
      if (!uniqueJobsMap.has(uniqueKey)) {
        uniqueJobsMap.set(uniqueKey, job);
      }
    });
    
    let finalLiveJobs = Array.from(uniqueJobsMap.values());

    if (finalLiveJobs.length === 0) {
      return NextResponse.json({ matches: [], allLiveJobs: [] });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an elite Recruiter. Analyze this candidate resume: "${resume}"
      Here is a sanitized list of active job listings: ${JSON.stringify(finalLiveJobs.slice(0, 40))}
      Select exactly the top 5 best matching jobs. Focus purely on skill alignment.
      Return ONLY a raw JSON array of objects (no markdown, no backticks):
      [
        {
          "id": "job_id_string",
          "reason": "Two-sentence explanation."
        }
      ]
    `;

    const aiRes = await model.generateContent(prompt);
    let text = aiRes.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();

    let parsedMatches: any[] = [];
    try { parsedMatches = JSON.parse(text); } catch { parsedMatches = []; }

    return NextResponse.json({ matches: parsedMatches, allLiveJobs: finalLiveJobs });

  } catch (error: any) {
    console.error("CRITICAL PRODUCTION ERROR:", error);
    return NextResponse.json({ error: "Failed to pull live matches" }, { status: 500 });
  }
}