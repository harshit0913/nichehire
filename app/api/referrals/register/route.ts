import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';

export async function POST(req: Request) {
  try {
    const { newUserId, referralCode } = await req.json();

    if (!newUserId || !referralCode) {
      return NextResponse.json(
        { error: 'Missing newUserId or referralCode parameter' },
        { status: 400 }
      );
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // 1. Locate the referring user by referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('user_profiles')
      .select('user_id, referral_code')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (referrerError || !referrer) {
      // Code not recognized; ignore gracefully
      return NextResponse.json(
        { success: false, message: 'Referral code not found' },
        { status: 200 }
      );
    }

    // 2. Anti-self-referral prevention
    if (referrer.user_id === newUserId) {
      return NextResponse.json(
        { success: false, message: 'Cannot refer your own account' },
        { status: 400 }
      );
    }

    // 3. Ensure this referred user has not already been attributed
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', newUserId)
      .maybeSingle();

    if (existingReferral) {
      return NextResponse.json(
        { success: false, message: 'User has already been referred' },
        { status: 200 }
      );
    }

    // 4. Record provisional referral in the referrals ledger
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.user_id,
        referred_user_id: newUserId,
        status: 'provisional',
      });

    if (insertError) {
      console.warn('Failed to insert into referrals table:', insertError);
    }

    // 5. Update referred user's profile with referring partner
    await supabase
      .from('user_profiles')
      .upsert({
        user_id: newUserId,
        referred_by: referrer.user_id,
      }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      message: 'Referral successfully registered and queued for 7-day qualification',
    });
  } catch (err: any) {
    console.error('Referral registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error processing referral registration' },
      { status: 500 }
    );
  }
}
