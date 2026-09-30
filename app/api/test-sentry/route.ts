import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    throw new Error('Sentry verification test from NicheHire backend');
  } catch (error) {
    const eventId = Sentry.captureException(error);
    return NextResponse.json({
      success: true,
      message: 'Sentry test event successfully captured and dispatched!',
      eventId,
      timestamp: new Date().toISOString(),
    });
  }
}
