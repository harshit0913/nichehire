/**
 * Multi-layer Hybrid Job Verification Engine
 * 
 * Verifies job postings across 4 progressive tiers:
 * 1. Direct Live HTTP Ping (HEAD/GET with 3.5s timeout) — 100% FREE, UNLIMITED, zero keys
 * 2. Google Custom Search JSON API (100 free searches/day = 3,000/month) using GOOGLE_SEARCH_API_KEY & GOOGLE_SEARCH_CX
 * 3. SerpAPI Google Jobs API (250 free searches/month) using SERP_API_KEY
 * 4. DuckDuckGo HTML Lite verification — 100% FREE, no API key required
 */

/**
 * 1. Direct Live URL Ping
 * Checks if the original job apply URL returns a live 200..399 HTTP response
 */
export async function verifyLiveUrl(url?: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    // If HEAD succeeds with 200/300 range, URL is active
    if (res.status >= 200 && res.status < 400) {
      return true;
    }

    // Some career servers reject HEAD, try rapid GET with Range header
    if (res.status === 405 || res.status === 403) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 3000);
      const getRes = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Range: 'bytes=0-1024',
        },
        signal: getController.signal,
      });
      clearTimeout(getTimeout);
      return getRes.status >= 200 && getRes.status < 400;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 2. Google Custom Search JSON API (100 free searches/day = 3,000 searches/month)
 */
export async function verifyViaGoogleCustomSearch(title: string, company: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cx) return false;

  try {
    const query = encodeURIComponent(`"${company}" "${title}" hiring OR careers OR jobs`);
    const endpoint = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}&num=3`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data.items) && data.items.length > 0;
  } catch {
    return false;
  }
}

/**
 * 3. SerpAPI Google Jobs API (250 free searches/month)
 */
export async function verifyViaSerpApi(title: string, company: string): Promise<boolean> {
  const key = process.env.SERP_API_KEY;
  if (!key) return false;

  try {
    const q = encodeURIComponent(`${company} ${title} jobs`);
    const url = `https://serpapi.com/search.json?engine=google_jobs&q=${q}&api_key=${key}&num=5`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

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

/**
 * 4. DuckDuckGo HTML Lite Verification (100% Free, No Key, Unlimited)
 */
export async function verifyViaDuckDuckGo(title: string, company: string): Promise<boolean> {
  try {
    const q = encodeURIComponent(`${company} ${title} careers jobs`);
    const url = `https://html.duckduckgo.com/html/?q=${q}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const html = await res.text();
    const compLow = company.toLowerCase().trim();
    return html.toLowerCase().includes(compLow) && (html.includes('result__snippet') || html.includes('result__title'));
  } catch {
    return false;
  }
}

/**
 * Universal Master Verification Function
 * Runs progressive fallback:
 * 1. Direct URL ping
 * 2. Google Custom Search (3,000/mo free)
 * 3. SerpAPI (250/mo free)
 * 4. DuckDuckGo (unlimited free)
 */
export async function verifyJob(title: string, company: string, url?: string): Promise<boolean> {
  // If job is already direct from verified portal or greenhouse/lever, trust it
  if (url && (url.includes('greenhouse.io') || url.includes('lever.co') || url.includes('yash.com'))) {
    return true;
  }

  // Tier 1: Check live URL first (fastest, zero cost)
  if (url && !url.includes('adzuna') && !url.includes('jooble')) {
    const isLive = await verifyLiveUrl(url);
    if (isLive) return true;
  }

  // Tier 2: Google Custom Search JSON API
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
    const googleResult = await verifyViaGoogleCustomSearch(title, company);
    if (googleResult) return true;
  }

  // Tier 3: SerpAPI
  if (process.env.SERP_API_KEY) {
    const serpResult = await verifyViaSerpApi(title, company);
    if (serpResult) return true;
  }

  // Tier 4: DuckDuckGo Fallback
  return await verifyViaDuckDuckGo(title, company);
}
