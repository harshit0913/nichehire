// app/api/analytics/track/route.ts
import { NextResponse } from 'next/server';
import { recordVisit } from '../../../lib/analyticsStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { path, referrer, device, visitorId, browser } = body;

    // Fast-path record
    await recordVisit({
      path: typeof path === 'string' ? path : '/',
      referrer: typeof referrer === 'string' ? referrer : '',
      device: typeof device === 'string' ? device : 'desktop',
      visitorId: typeof visitorId === 'string' ? visitorId : undefined,
      browser: typeof browser === 'string' ? browser : undefined,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Tracking error' }, { status: 500 });
  }
}
