import { NextResponse } from 'next/server';
import { supabase } from '../../supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'connected';

  try {
    // Fast lightweight check against Supabase
    const { error } = await supabase.from('walkins').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'unreachable';
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      latencyMs: responseTime,
      queueDepth: 0, // Inngest queue backlog depth
      version: '1.2.0',
    },
    {
      status: dbStatus === 'connected' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
