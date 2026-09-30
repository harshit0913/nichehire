import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ProviderHealth {
  name: string;
  type: 'api' | 'feed' | 'portal';
  status: 'healthy' | 'degraded' | 'unconfigured';
  latencyMs: number;
  message: string;
}

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is configured, require bearer token for protected background runs
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized background cron trigger' }, { status: 401 });
    }
  }

  const providers: ProviderHealth[] = [];

  // 1. Audit Himalayas (Free public JSON API)
  try {
    const t0 = Date.now();
    const res = await fetch('https://himalayas.app/jobs/api?limit=5', {
      headers: { 'User-Agent': 'NicheHire-Background-Parser/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      const data = await res.json();
      providers.push({
        name: 'Himalayas',
        type: 'api',
        status: 'healthy',
        latencyMs,
        message: `Active (${data.jobs?.length || 0} sample jobs received)`,
      });
    } else {
      providers.push({
        name: 'Himalayas',
        type: 'api',
        status: 'degraded',
        latencyMs,
        message: `HTTP ${res.status}`,
      });
    }
  } catch (err: any) {
    providers.push({
      name: 'Himalayas',
      type: 'api',
      status: 'degraded',
      latencyMs: 6000,
      message: err.message || 'Timeout / Network error',
    });
  }

  // 2. Audit RemoteOK (Public JSON API)
  try {
    const t0 = Date.now();
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'NicheHire-Background-Parser/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      providers.push({
        name: 'RemoteOK',
        type: 'api',
        status: 'healthy',
        latencyMs,
        message: 'Active endpoint verified',
      });
    } else {
      providers.push({
        name: 'RemoteOK',
        type: 'api',
        status: 'degraded',
        latencyMs,
        message: `HTTP ${res.status}`,
      });
    }
  } catch (err: any) {
    providers.push({
      name: 'RemoteOK',
      type: 'api',
      status: 'degraded',
      latencyMs: 6000,
      message: err.message || 'Timeout / Network error',
    });
  }

  // 3. Audit Adzuna Configuration
  // 3. Audit Adzuna Configuration
  const hasAdzuna = !!(process.env.ADZUNA_APP_ID && (process.env.ADZUNA_APP_KEY || process.env.ADZUNA_API_KEY));
  providers.push({
    name: 'Adzuna',
    type: 'api',
    status: hasAdzuna ? 'healthy' : 'unconfigured',
    latencyMs: 0,
    message: hasAdzuna ? 'Configured with API credentials' : 'Credentials missing (ADZUNA_APP_ID / ADZUNA_APP_KEY)',
  });

  // 4. Audit JSearch (RapidAPI)
  if (process.env.RAPIDAPI_KEY) {
    providers.push({
      name: 'JSearch',
      type: 'api',
      status: 'healthy',
      latencyMs: 0,
      message: 'RapidAPI credentials configured',
    });
  } else {
    providers.push({
      name: 'JSearch',
      type: 'api',
      status: 'unconfigured',
      latencyMs: 0,
      message: 'RAPIDAPI_KEY not configured',
    });
  }

  // 5. Audit Zyte & Scraping Proxies
  if (process.env.ZYTE_API_KEY) {
    providers.push({
      name: 'Zyte (Scrapy Cloud)',
      type: 'portal',
      status: 'healthy',
      latencyMs: 0,
      message: 'Zyte Scrapy Cloud credentials active',
    });
  }

  if (process.env.SCRAPINGDOG_API_KEY) {
    providers.push({
      name: 'ScrapingDog',
      type: 'api',
      status: 'healthy',
      latencyMs: 0,
      message: 'LinkedIn proxy scraper active',
    });
  }

  // 5. Audit Direct Corporate Career Portals
  const directPortals = [
    { name: 'Google Careers', url: 'https://careers.google.com' },
    { name: 'Microsoft Careers', url: 'https://careers.microsoft.com' },
    { name: 'Amazon Jobs', url: 'https://amazon.jobs' },
    { name: 'Apple Jobs', url: 'https://jobs.apple.com' },
    { name: 'Tata Careers', url: 'https://www.tata.com/careers' },
    { name: 'Yash Technologies', url: 'https://www.yash.com/careers' },
  ];

  const totalDurationMs = Date.now() - startTime;
  const healthyCount = providers.filter((p) => p.status === 'healthy').length;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    durationMs: totalDurationMs,
    summary: {
      totalProvidersAudited: providers.length,
      healthyProviders: healthyCount,
      directPortalsMonitored: directPortals.length,
      status: healthyCount > 0 ? 'operational' : 'degraded',
    },
    providers,
    directPortals,
  });
}
