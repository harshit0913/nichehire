/**
 * SerpAPI-based job verification helper.
 * Checks whether a given job (title + company) has a real live Google Jobs listing.
 * Uses process.env.SERP_API_KEY — returns false silently if key is missing.
 */
export async function verifyJob(title: string, company: string): Promise<boolean> {
  const key = process.env.SERP_API_KEY;
  if (!key) return false;

  const q = encodeURIComponent(`${company} ${title} jobs`);
  const url = `https://serpapi.com/search.json?engine=google_jobs&q=${q}&api_key=${key}&num=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    const results: any[] = data.jobs_results || [];
    const titleLow = title.toLowerCase();
    const companyLow = company.toLowerCase();
    return results.some((r: any) => {
      const t = (r.title || '').toLowerCase();
      const c = (r.company_name || '').toLowerCase();
      return (
        t.includes(titleLow.substring(0, 10)) ||
        c.includes(companyLow.substring(0, 8))
      );
    });
  } catch {
    return false;
  }
}
