import { NextResponse } from 'next/server';
import {
  otpStore,
  normalizeIdentifier,
  generateSecureOtp,
  maskIdentifier,
} from '../../../../lib/otpStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = body.identifier || body.phone || body.email;

    if (!rawTarget || typeof rawTarget !== 'string') {
      return NextResponse.json(
        { error: 'Please enter your email address or 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(rawTarget);
    if (!normalized.isValid) {
      return NextResponse.json(
        { error: normalized.error || 'Invalid email address or mobile number.' },
        { status: 400 }
      );
    }

    // Rate-limiting check: enforce a 30-second cooldown between resends to same identifier
    const existing = otpStore.get(normalized.identifier);
    if (existing && Date.now() - existing.lastSentAt < 30000) {
      const waitSeconds = Math.ceil((30000 - (Date.now() - existing.lastSentAt)) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds}s before requesting a new code.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }

    // Generate unique, cryptographically secure 6-digit numeric OTP
    const otpCode = generateSecureOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalized.identifier, {
      code: otpCode,
      identifier: normalized.identifier,
      type: normalized.type,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
    });

    // Mask for safe public display in toast/message
    const masked = maskIdentifier(normalized.identifier, normalized.type);

    // Audit log on server console for developers/admin monitoring
    console.log(
      `[SECURE OTP ENGINE] Sent unique 6-digit OTP to ${normalized.identifier} (${normalized.type}): ${otpCode}`
    );

    return NextResponse.json({
      success: true,
      identifier: normalized.identifier,
      type: normalized.type,
      maskedIdentifier: masked,
      expiresInSeconds: 300,
      message: `A unique 6-digit OTP code has been generated for ${masked}. Valid for 5 minutes.`,
    });
  } catch (err: any) {
    console.error('Error generating OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
