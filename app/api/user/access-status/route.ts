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

    const userStatus: UserPremiumStatus = {
      userId: user.id,
      tier: profile?.tier || 'member',
      qualifyingReferralCount: profile?.qualifying_referral_count || 0,
      premiumSource: profile?.premium_source || null,
      subscriptionStatus: profile?.subscription_status || null,
      subscriptionRenewsAt: profile?.subscription_renews_at || undefined,
      highestTierAchieved: profile?.highest_tier_achieved || 'member',
      tierAchievedAt: profile?.tier_achieved_at || {},
      isFounder: profile?.is_founder || false,
      referredByUserId: profile?.referred_by || undefined,
    };

    // 2. Fetch founder override (server-side only, bypassing client RLS restrictions safely)
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

    // 3. Resolve derived access state
    const access = resolveAccess(userStatus, override);

    // 4. Calculate remaining quotas
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
      referralCount: userStatus.qualifyingReferralCount,
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
