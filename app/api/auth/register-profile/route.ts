import { NextResponse } from 'next/server';
import { ensureUserReferralProfile } from '../../../lib/referralEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, phone, role, referralCodeUsed, fullName, companyName } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required to register profile.' },
        { status: 400 }
      );
    }

    const profile = await ensureUserReferralProfile({
      userId,
      email: email || null,
      phone: phone || null,
      role: role || 'Member',
      referredByCode: referralCodeUsed || null,
      fullName: fullName || null,
      companyName: companyName || null,
    });

    return NextResponse.json({
      success: true,
      userId: profile.userId,
      referralCode: profile.referralCode,
      role: profile.role,
      tier: profile.tier,
      isNew: profile.isNew,
      referredBy: profile.referredBy,
      message: `Profile initialized. Unique referral code: ${profile.referralCode}`,
    });
  } catch (err: any) {
    console.error('Error in register-profile:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize profile and referral code.' },
      { status: 500 }
    );
  }
}
