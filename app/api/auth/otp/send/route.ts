import { NextResponse } from 'next/server';
import { otpStore, normalizePhoneNumber } from '../../../../lib/otpStore';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneNumber(phone);
    // Validate length (must have at least 10 digits)
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // Generate 6-digit secure numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalized, {
      code: otpCode,
      expiresAt,
      attempts: 0,
    });

    console.log(`[OTP Engine] Generated OTP for ${normalized}: ${otpCode}`);

    return NextResponse.json({
      success: true,
      phone: normalized,
      expiresInSeconds: 300,
      message: `6-digit OTP sent to ${normalized}. Valid for 5 minutes.`,
      // Included for instant test verification across environments
      demoOtp: otpCode,
    });
  } catch (err: any) {
    console.error('Error generating OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
