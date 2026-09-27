// app/lib/analyticsStore.ts
// 100% Genuine, Database-Backed Site Traffic and Visitor Analytics (Zero Mock/Fake Data)

import { supabase } from '../supabase';

export interface VisitPayload {
  path: string;
  referrer?: string;
  device?: string;
  visitorId?: string;
  browser?: string;
}

export interface DailyVisitStat {
  date: string;
  visits: number;
  uniqueVisitors: number;
}

export interface RouteVisitStat {
  path: string;
  visits: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  todayUnique: number;
  weekVisits: number;
  dailyTrends: DailyVisitStat[];
  topRoutes: RouteVisitStat[];
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
    desktopPct: number;
    mobilePct: number;
    tabletPct: number;
  };
  referrerSources: Array<{ source: string; count: number; percentage: number }>;
}

// Track an incoming visit directly to database
export async function recordVisit(payload: VisitPayload) {
  const cleanPath = payload.path || '/';
  const cleanDevice = (payload.device || 'desktop').toLowerCase();
  const visitorId = payload.visitorId || 'anon-' + Math.random().toString(36).slice(2, 10);

  try {
    await supabase.from('site_visits').insert([
      {
        path: cleanPath,
        visitor_id: visitorId,
        referrer: payload.referrer || null,
        device_type: cleanDevice,
        browser: payload.browser || null,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error('Failed to record site visit to Supabase:', err);
  }
}

// Generate genuine analytics summary computed strictly from database rows
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch all real visits recorded in database
  const { data: visitsRows, count: totalDbCount, error } = await supabase
    .from('site_visits')
    .select('path, visitor_id, device_type, referrer, created_at', { count: 'exact' });

  if (error) {
    console.warn('Could not query site_visits from Supabase:', error.message);
  }

  const visits = visitsRows || [];
  const totalVisits = totalDbCount ?? visits.length;

  // 2. Compute unique visitors
  const uniqueVisitorSet = new Set<string>();
  visits.forEach((v) => {
    if (v.visitor_id) uniqueVisitorSet.add(v.visitor_id);
  });
  const uniqueVisitors = uniqueVisitorSet.size;

  // 3. Compute today's visits
  const todayVisitsList = visits.filter((v) => v.created_at && v.created_at.slice(0, 10) === todayStr);
  const todayVisits = todayVisitsList.length;
  const todayUniqueSet = new Set<string>();
  todayVisitsList.forEach((v) => {
    if (v.visitor_id) todayUniqueSet.add(v.visitor_id);
  });
  const todayUnique = todayUniqueSet.size;

  // 4. Compute this week's visits
  const weekVisits = visits.filter((v) => v.created_at && v.created_at >= sevenDaysAgo).length;

  // 5. Compute real 14-day daily trends
  const dailyTrends: DailyVisitStat[] = [];
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRows = visits.filter((v) => v.created_at && v.created_at.slice(0, 10) === dateStr);
    const dayVisitors = new Set<string>();
    dayRows.forEach((v) => {
      if (v.visitor_id) dayVisitors.add(v.visitor_id);
    });

    dailyTrends.push({
      date: dateStr,
      visits: dayRows.length,
      uniqueVisitors: dayVisitors.size,
    });
  }

  // 6. Compute real top routes
  const routeCounts = new Map<string, number>();
  visits.forEach((v) => {
    const p = v.path || '/';
    routeCounts.set(p, (routeCounts.get(p) || 0) + 1);
  });

  const topRoutes: RouteVisitStat[] = Array.from(routeCounts.entries())
    .map(([path, count]) => ({
      path,
      visits: count,
      percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  // 7. Compute real device breakdown
  let desktopCount = 0;
  let mobileCount = 0;
  let tabletCount = 0;

  visits.forEach((v) => {
    const dev = (v.device_type || 'desktop').toLowerCase();
    if (dev === 'mobile') mobileCount += 1;
    else if (dev === 'tablet') tabletCount += 1;
    else desktopCount += 1;
  });

  const totalDevs = desktopCount + mobileCount + tabletCount;
  const deviceBreakdown = {
    desktop: desktopCount,
    mobile: mobileCount,
    tablet: tabletCount,
    desktopPct: totalDevs > 0 ? Math.round((desktopCount / totalDevs) * 100) : 0,
    mobilePct: totalDevs > 0 ? Math.round((mobileCount / totalDevs) * 100) : 0,
    tabletPct: totalDevs > 0 ? Math.round((tabletCount / totalDevs) * 100) : 0,
  };

  // 8. Compute real referrer sources
  const refCounts = new Map<string, number>();
  visits.forEach((v) => {
    let source = 'Direct / Bookmark';
    const ref = (v.referrer || '').toLowerCase();
    if (!ref) source = 'Direct / Bookmark';
    else if (ref.includes('google')) source = 'Google Search';
    else if (ref.includes('whatsapp') || ref.includes('wa.me')) source = 'WhatsApp Share';
    else if (ref.includes('linkedin')) source = 'LinkedIn / Peer Invite';
    else if (ref.includes('ref=')) source = 'Referral Link Invite';
    else source = 'Web Referral';

    refCounts.set(source, (refCounts.get(source) || 0) + 1);
  });

  const referrerSources = Array.from(refCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalVisits,
    uniqueVisitors,
    todayVisits,
    todayUnique,
    weekVisits,
    dailyTrends,
    topRoutes,
    deviceBreakdown,
    referrerSources,
  };
}
