import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { role } = await req.json();
    const query = role || 'marketing';
    
    let allJobs: any[] = [];

    // 1. FREE UNLIMITED FALLBACK: Remotive API (No API keys required)
    try {
      const remotiveRes = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`);
      if (remotiveRes.ok) {
        const remotiveData = await remotiveRes.json();
        const formattedRemotive = (remotiveData.jobs || []).map((j: any) => ({
          id: `remo_${j.id}`,
          title: j.title.replace(/<\/?[^>]+(>|$)/g, ""),
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          url: j.url,
          source: 'Remotive'
        }));
        allJobs = [...allJobs, ...formattedRemotive];
      }
    } catch (e) { 
      console.error("Remotive fetch failed", e); 
    }

    // 2. YOUR RAPID APIs (Will safely return nothing if quota is maxed out)
    const RAPID_API_KEY = process.env.RAPIDAPI_KEY || "";
    if (RAPID_API_KEY) {
       try {
         const linkedInRes = await fetch(`https://linkedin-job-search-api.p.rapidapi.com/search?keyword=${encodeURIComponent(query)}`, {
           headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com' }
         });
         if (linkedInRes.ok) {
           const liData = await linkedInRes.json();
           const formattedLi = (liData.jobs || []).map((j: any) => ({
             id: `li_${Math.random().toString(36).substr(2, 9)}`,
             title: j.title,
             company: j.company,
             location: j.location || 'Remote',
             url: j.jobUrl,
             source: 'LinkedIn'
           }));
           allJobs = [...allJobs, ...formattedLi];
         }
       } catch (e) {
         console.error("RapidAPI fetch failed", e);
       }
    }

    // Filter out duplicates so the UI looks clean
    const uniqueJobsMap = new Map();
    allJobs.forEach(job => uniqueJobsMap.set(`${job.title}-${job.company}`, job));
    
    return NextResponse.json({ jobs: Array.from(uniqueJobsMap.values()) });

  } catch (error) {
    console.error("CRITICAL SEARCH ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}