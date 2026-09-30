// app/api/admin/analytics/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { getAnalyticsSummary } from '../../../lib/analyticsStore';
import { verifyAuthToken } from '../../../lib/referralEngine';

export const dynamic = 'force-dynamic';

function isFounder(email?: string, dbIsFounder?: boolean): boolean {
  if (dbIsFounder) return true;
  if (!email) return false;
  const founderEmails = (process.env.FOUNDER_EMAIL || 'harshitmishra7073@gmail.com,founder@nichehire.tech,harshit@nichehire.tech')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim());
  return founderEmails.includes(email.toLowerCase().trim());
}

async function verifyAdminOrTeam(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { authorized: false, error: 'Unauthorized: Missing token' };

  const token = authHeader.replace(/^Bearer\s+/i, '');
  let resolvedUser: { id: string; email?: string } | null = null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) resolvedUser = user;
  } catch {}

  if (!resolvedUser) {
    const customPayload = verifyAuthToken(token);
    if (customPayload) {
      resolvedUser = {
        id: customPayload.userId,
        email: customPayload.type === 'email' ? customPayload.identifier : undefined,
      };
    }
  }

  if (!resolvedUser) {
    return { authorized: false, error: 'Unauthorized: Invalid token' };
  }

  // Check founder status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_founder, assigned_role')
    .eq('user_id', resolvedUser.id)
    .maybeSingle();

  if (isFounder(resolvedUser.email, profile?.is_founder)) {
    return { authorized: true, user: resolvedUser, isFounder: true };
  }

  // Check team permissions table
  const { data: teamPerm } = await supabase
    .from('team_permissions')
    .select('status, can_view_analytics')
    .eq('user_id', resolvedUser.id)
    .maybeSingle();

  if (teamPerm && teamPerm.status === 'approved' && teamPerm.can_view_analytics) {
    return { authorized: true, user: resolvedUser, isFounder: false };
  }

  return { authorized: false, error: 'Forbidden: Admin or Analytics access required' };
}

export async function GET(req: Request) {
  try {
    const authCheck = await verifyAdminOrTeam(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    // 1. Fetch Traffic & Visitors Summary
    const trafficSummary = await getAnalyticsSummary();

    // 2. Fetch User Profiles & Counts
    const { data: profiles, error: profileErr } = await supabase
      .from('user_profiles')
      .select('user_id, tier, is_founder, assigned_role, created_at');

    const totalProfiles = profiles?.length || 0;
    const candidatesCount = (profiles || []).filter(
      (p) => !p.assigned_role?.toLowerCase().includes('employer') && !p.is_founder
    ).length;
    const employerCount = (profiles || []).filter((p) =>
      p.assigned_role?.toLowerCase().includes('employer')
    ).length;
    const teamCount = (profiles || []).filter(
      (p) => p.is_founder || (p.assigned_role && p.assigned_role !== 'Member')
    ).length;

    // Tier distribution
    const tierCounts = {
      member: (profiles || []).filter((p) => p.tier === 'member' || !p.tier).length,
      rising: (profiles || []).filter((p) => p.tier === 'rising').length,
      trusted: (profiles || []).filter((p) => p.tier === 'trusted').length,
      premium: (profiles || []).filter((p) => p.tier === 'premium').length,
    };

    // Calculate user signups in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newSignupsThisWeek = (profiles || []).filter(
      (p) => p.created_at && p.created_at >= sevenDaysAgo
    ).length;

    // 3. Fetch Operational Insights
    // Applications
    const { count: appCount } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true });

    // Employer Postings
    const { count: jobCount } = await supabase
      .from('employer_postings')
      .select('*', { count: 'exact', head: true });

    // Walk-ins
    const { count: walkinCount } = await supabase
      .from('walkin_jobs')
      .select('*', { count: 'exact', head: true });

    // Referrals
    const { data: referralRows } = await supabase
      .from('referrals')
      .select('id, status');

    const totalReferrals = referralRows?.length || 0;
    const qualifiedReferrals = (referralRows || []).filter((r) => r.status === 'qualified').length;
    const provisionalReferrals = (referralRows || []).filter((r) => r.status === 'provisional').length;

    // Payments
    const { data: paymentRows } = await supabase
      .from('employer_payments')
      .select('id, plan_amount, status');

    let approvedPaymentTotal = 0;
    let pendingPaymentTotal = 0;
    let pendingPaymentCount = 0;
    let approvedPaymentCount = 0;

    (paymentRows || []).forEach((p) => {
      const amt = Number(p.plan_amount) || 0;
      if (p.status === 'approved') {
        approvedPaymentTotal += amt;
        approvedPaymentCount += 1;
      } else if (p.status === 'pending') {
        pendingPaymentTotal += amt;
        pendingPaymentCount += 1;
      }
    });

    // Feedbacks
    const { data: feedbackRows } = await supabase
      .from('user_feedbacks')
      .select('id, type, status');

    const totalFeedbacks = feedbackRows?.length || 0;
    const openBugsCount = (feedbackRows || []).filter(
      (f) => f.type === 'bug' && f.status !== 'resolved'
    ).length;
    const resolvedCount = (feedbackRows || []).filter((f) => f.status === 'resolved').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      users: {
        total: totalProfiles,
        candidates: candidatesCount,
        employers: employerCount,
        team: teamCount,
        tiers: tierCounts,
        newSignupsThisWeek: newSignupsThisWeek,
      },
      traffic: trafficSummary,
      operations: {
        totalJobs: jobCount || 0,
        totalApplications: appCount || 0,
        activeWalkins: walkinCount || 0,
        referrals: {
          total: totalReferrals,
          qualified: qualifiedReferrals,
          provisional: provisionalReferrals,
          conversionRatePct: totalReferrals > 0 ? Math.round((qualifiedReferrals / totalReferrals) * 100) : 0,
        },
        monetization: {
          approvedRevenueInr: approvedPaymentTotal,
          approvedTransactions: approvedPaymentCount,
          pendingRevenueInr: pendingPaymentTotal,
          pendingTransactions: pendingPaymentCount,
        },
        feedbacks: {
          total: totalFeedbacks,
          openBugs: openBugsCount,
          resolved: resolvedCount,
        },
      },
    });
  } catch (err: any) {
    console.error('Analytics GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}
