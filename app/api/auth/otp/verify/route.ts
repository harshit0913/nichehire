import { NextResponse } from 'next/server';
import { otpStore, normalizeIdentifier } from '../../../../lib/otpStore';
import {
  generateDeterministicUserId,
  ensureUserReferralProfile,
  createAuthToken,
} from '../../../../lib/referralEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = body.identifier || body.phone || body.email;
    const rawOtp = body.otp;

    if (!rawTarget || !rawOtp) {
      return NextResponse.json(
        { error: 'Email or Mobile Number and 6-digit OTP code are required.' },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(rawTarget);
    if (!normalized.isValid) {
      return NextResponse.json(
        { error: normalized.error || 'Invalid email or mobile number.' },
        { status: 400 }
      );
    }

    // Clean and validate OTP format (must be exactly 6 digits)
    const cleanOtp = String(rawOtp).trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      return NextResponse.json(
        { error: 'Please enter the complete 6-digit OTP.' },
        { status: 400 }
      );
    }

    const entry = otpStore.get(normalized.identifier);

    if (!entry) {
      return NextResponse.json(
        { error: 'No active OTP found for this address or number. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Expiry check (5 minutes max)
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized.identifier);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Rate-limit attempt brute-force check (max 5 tries)
    if (entry.attempts >= 5) {
      otpStore.delete(normalized.identifier);
      return NextResponse.json(
        { error: 'Too many incorrect attempts. For security, please request a new OTP.' },
        { status: 429 }
      );
    }

    // STRICT EQUALITY CHECK: Must match the exact single generated OTP
    if (cleanOtp !== entry.code) {
      entry.attempts += 1;
      const remainingAttempts = 5 - entry.attempts;
      return NextResponse.json(
        {
          error: `Incorrect OTP code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
          attemptsRemaining: remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Success: IMMEDIATELY delete OTP from store so it cannot ever be replayed
    otpStore.delete(normalized.identifier);

    // Resolve or generate deterministic user ID
    const userId = generateDeterministicUserId(normalized.identifier);

    // Guarantee that this user has a unique referral code and referral attribution
    const roleToAssign = body.role === 'Employer' ? 'Employer' : 'Member';
    const profile = await ensureUserReferralProfile({
      userId,
      email: normalized.type === 'email' ? normalized.identifier : null,
      phone: normalized.type === 'phone' ? normalized.identifier : null,
      role: roleToAssign,
      referredByCode: body.referralCodeUsed || null,
      fullName: body.fullName || null,
      companyName: body.companyName || null,
    });

    // Create session token
    const sessionToken = createAuthToken({
      userId,
      identifier: normalized.identifier,
      type: normalized.type,
      role: profile.role,
      referralCode: profile.referralCode,
    });

    console.log(
      `[SECURE OTP ENGINE] Verified ${normalized.identifier} successfully. User ID: ${userId}, Referral Code: ${profile.referralCode}`
    );

    return NextResponse.json({
      success: true,
      verified: true,
      identifier: normalized.identifier,
      type: normalized.type,
      userId,
      referralCode: profile.referralCode,
      isNewAccount: profile.isNew,
      role: profile.role,
      tier: profile.tier,
      sessionToken,
      user: {
        id: userId,
        email: normalized.type === 'email' ? normalized.identifier : undefined,
        phone: normalized.type === 'phone' ? normalized.identifier : undefined,
        role: profile.role,
        tier: profile.tier,
        referralCode: profile.referralCode,
        isPhoneVerified: normalized.type === 'phone',
        isEmailVerified: normalized.type === 'email',
      },
      message: 'Verified successfully! Welcome to NicheHire.',
    });
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP.' },
      { status: 500 }
    );
  }
}
