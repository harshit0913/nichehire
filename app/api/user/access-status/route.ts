import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { resolveAccess, checkUsageLimit } from '../../../lib/premiumTierEngine';
import { UserPremiumStatus, FounderOverride } from '../../../types/premium';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          level: 'member',
          quotaBypass: false,
          badge: 'none',
          referralCode: 'REF-NICHE2026',
          referralCount: 0,
          provisionalCount: 0,
          recentReferrals: [],
          remainingQuotas: { tailoredResumes: 0, hrEmailDrafts: 0 },
        },
        { status: 200 }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          level: 'member',
          quotaBypass: false,
          badge: 'none',
          referralCode: 'REF-NICHE2026',
          referralCount: 0,
          provisionalCount: 0,
          recentReferrals: [],
          remainingQuotas: { tailoredResumes: 0, hrEmailDrafts: 0 },
        },
        { status: 200 }
      );
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Ensure each user has a unique referral code
    let referralCode = profile?.referral_code;
    if (!referralCode) {
      referralCode = `REF-${user.id.slice(0, 8).toUpperCase()}`;
      try {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            referral_code: referralCode,
          }, { onConflict: 'user_id' });
      } catch (upsertErr) {
        console.warn('Could not auto-persist referral code:', upsertErr);
      }
    }

    // 3. Fetch referral records and stats for tracking
    const { data: referralRows } = await supabase
      .from('referrals')
      .select('id, referred_user_id, status, created_at, qualified_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25);

    const qualifiedCount = referralRows?.filter((r) => r.status === 'qualified').length || 0;
    const provisionalCount = referralRows?.filter((r) => r.status === 'provisional').length || 0;
    const recentReferrals = (referralRows || []).map((r) => ({
      id: r.id,
      maskedId: `Candidate #${r.referred_user_id.slice(0, 6).toUpperCase()}`,
      status: r.status,
      createdAt: r.created_at,
      qualifiedAt: r.qualified_at,
    }));

    const userStatus: UserPremiumStatus = {
      userId: user.id,
      tier: profile?.tier || 'member',
      qualifyingReferralCount: Math.max(profile?.qualifying_referral_count || 0, qualifiedCount),
      premiumSource: profile?.premium_source || null,
      subscriptionStatus: profile?.subscription_status || null,
      subscriptionRenewsAt: profile?.subscription_renews_at || undefined,
      highestTierAchieved: profile?.highest_tier_achieved || 'member',
      tierAchievedAt: profile?.tier_achieved_at || {},
      isFounder: profile?.is_founder || false,
      referredByUserId: profile?.referred_by || undefined,
    };

    // 4. Fetch founder override (server-side only, bypassing client RLS restrictions safely)
    const { data: overrideRow } = await supabase
      .from('founder_overrides')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const override: FounderOverride | null = overrideRow
      ? {
          userId: overrideRow.user_id,
          accessLevel: overrideRow.access_level,
          grantedBy: overrideRow.granted_by,
          createdAt: overrideRow.created_at,
          updatedAt: overrideRow.updated_at,
          note: overrideRow.note,
        }
      : null;

    // 5. Resolve derived access state
    const access = resolveAccess(userStatus, override);

    // 6. Calculate remaining quotas
    const nowMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data: usageRow } = await supabase
      .from('premium_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', nowMonth)
      .maybeSingle();

    const tailoredCount = usageRow?.tailored_resume_count || 0;
    const hrCount = usageRow?.hr_email_draft_count || 0;

    const tailorUsage = checkUsageLimit(userStatus, 'tailored_resume', tailoredCount, override);
    const hrUsage = checkUsageLimit(userStatus, 'hr_email_draft', hrCount, override);

    return NextResponse.json({
      level: access.level,
      quotaBypass: access.quotaBypass,
      badge: access.badge,
      referralCode,
      referralCount: userStatus.qualifyingReferralCount,
      provisionalCount,
      recentReferrals,
      remainingQuotas: {
        tailoredResumes: tailorUsage.remaining,
        hrEmailDrafts: hrUsage.remaining,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to resolve user access status' },
      { status: 500 }
    );
  }
}
