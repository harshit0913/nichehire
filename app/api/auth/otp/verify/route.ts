import { NextResponse } from 'next/server';
import { otpStore, normalizePhoneNumber } from '../../../../lib/otpStore';

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and 6-digit OTP code are required.' },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneNumber(phone);
    const entry = otpStore.get(normalized);

    if (!entry) {
      return NextResponse.json(
        { error: 'No active OTP found for this number. Please request a new OTP.' },
        { status: 400 }
      );
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (entry.attempts >= 5) {
      otpStore.delete(normalized);
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    const cleanInputOtp = otp.toString().trim();
    if (cleanInputOtp !== entry.code) {
      entry.attempts += 1;
      return NextResponse.json(
        { error: `Incorrect OTP. ${5 - entry.attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Success: consume OTP so it cannot be replayed
    otpStore.delete(normalized);

    return NextResponse.json({
      success: true,
      verified: true,
      phone: normalized,
      verifiedAt: new Date().toISOString(),
      message: 'Mobile number verified successfully!',
    });
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP.' },
      { status: 500 }
    );
  }
}
