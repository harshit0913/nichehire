// app/api/admin/team/route.ts
// Comprehensive Team Management & Website Editing Access Approvals

import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { verifyAuthToken } from '../../../lib/referralEngine';

export const dynamic = 'force-dynamic';

function isFounder(email?: string, dbIsFounder?: boolean): boolean {
  if (dbIsFounder) return true;
  if (!email) return false;
  const founderEmails = (process.env.FOUNDER_EMAIL || 'harshitmishra7073@gmail.com,founder@nichehire.in,harshit0913@gmail.com')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim());
  return founderEmails.includes(email.toLowerCase().trim());
}

async function verifyFounder(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { authorized: false, error: 'Unauthorized: Missing token' };

  const token = authHeader.replace(/^Bearer\s+/i, '');
  let resolvedUser: { id: string; email?: string } | null = null;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (user && !authError) {
      resolvedUser = user;
    }
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_founder')
    .eq('user_id', resolvedUser.id)
    .maybeSingle();

  if (!isFounder(resolvedUser.email, profile?.is_founder)) {
    return { authorized: false, error: 'Forbidden: Founder access required' };
  }

  return { authorized: true, user: resolvedUser };
}

// In-memory fallback cache for team permissions
interface TeamMemberRecord {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  roleTitle: string;
  status: 'approved' | 'pending' | 'revoked';
  canEditJobs: boolean;
  canManageWalkins: boolean;
  canVerifyPayments: boolean;
  canReplyFeedbacks: boolean;
  canEditWebsite: boolean;
  canViewAnalytics: boolean;
  approvedBy?: string;
  approvedAt: string;
  joinedAt?: string;
  notes?: string;
}

const memoryTeamStore = new Map<string, TeamMemberRecord>();

// Pre-seed core founder & sample approved editor
function initSeedTeam(founderId: string, founderEmail?: string) {
  if (memoryTeamStore.size > 0) return;

  // 1. Founder
  memoryTeamStore.set(founderId, {
    id: 'team-founder',
    userId: founderId,
    email: founderEmail || 'founder@nichehire.in',
    fullName: 'Harshit Mishra (Founder & CEO)',
    roleTitle: 'Founder & Super Admin',
    status: 'approved',
    canEditJobs: true,
    canManageWalkins: true,
    canVerifyPayments: true,
    canReplyFeedbacks: true,
    canEditWebsite: true,
    canViewAnalytics: true,
    approvedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    notes: 'Platform Founder & Head Administrator',
  });
}

export async function GET(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const founderId = authCheck.user.id;
    initSeedTeam(founderId, authCheck.user.email);

    // 1. Fetch team members from team_permissions table
    const { data: dbPermissions, error: permErr } = await supabase
      .from('team_permissions')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch all profiles referred by founder
    const { data: referredProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, tier, referral_code, referred_by, assigned_role, created_at')
      .or(`referred_by.eq.${founderId},referral_code.ilike.FOUNDER%`)
      .order('created_at', { ascending: false });

    // Merge into map
    const mergedMap = new Map<string, TeamMemberRecord>();

    // Start with memory store
    memoryTeamStore.forEach((m, key) => mergedMap.set(key, m));

    // Add DB permissions
    (dbPermissions || []).forEach((row) => {
      mergedMap.set(row.user_id, {
        id: row.id,
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        roleTitle: row.role_title || 'Website Editor',
        status: row.status || 'approved',
        canEditJobs: row.can_edit_jobs ?? true,
        canManageWalkins: row.can_manage_walkins ?? true,
        canVerifyPayments: row.can_verify_payments ?? false,
        canReplyFeedbacks: row.can_reply_feedbacks ?? true,
        canEditWebsite: row.can_edit_website ?? true,
        canViewAnalytics: row.can_view_analytics ?? true,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at || row.created_at,
        joinedAt: row.created_at,
        notes: row.notes || '',
      });
    });

    // Add referred profiles if not present
    (referredProfiles || []).forEach((p) => {
      if (!mergedMap.has(p.user_id)) {
        mergedMap.set(p.user_id, {
          id: p.user_id,
          userId: p.user_id,
          email: `candidate-${p.user_id.slice(0, 6)}@nichehire.in`,
          fullName: `Team Candidate #${p.user_id.slice(0, 6).toUpperCase()}`,
          roleTitle: p.assigned_role || 'Member',
          status: p.assigned_role && p.assigned_role !== 'Member' ? 'approved' : 'pending',
          canEditJobs: p.assigned_role ? true : false,
          canManageWalkins: p.assigned_role ? true : false,
          canVerifyPayments: false,
          canReplyFeedbacks: true,
          canEditWebsite: p.assigned_role ? true : false,
          canViewAnalytics: true,
          approvedAt: p.created_at || new Date().toISOString(),
          joinedAt: p.created_at,
          notes: 'Joined via Founder Onboarding Link',
        });
      }
    });

    const members = Array.from(mergedMap.values());

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (err: any) {
    console.error('Error fetching team permissions:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST: Approve / Add a new team member to make changes to website
export async function POST(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const founderId = authCheck.user.id;
    const body = await req.json();
    const { email, fullName, roleTitle, permissions, notes } = body;

    if (!email?.trim() || !fullName?.trim()) {
      return NextResponse.json(
        { error: 'Email and Full Name are required to approve a team member.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanRole = (roleTitle || 'Website Editor').trim();
    const targetUserId = 'usr_' + Buffer.from(cleanEmail).toString('hex').slice(0, 16);

    const record: TeamMemberRecord = {
      id: 'team-' + Date.now(),
      userId: targetUserId,
      email: cleanEmail,
      fullName: cleanName,
      roleTitle: cleanRole,
      status: 'approved',
      canEditJobs: permissions?.canEditJobs ?? true,
      canManageWalkins: permissions?.canManageWalkins ?? true,
      canVerifyPayments: permissions?.canVerifyPayments ?? false,
      canReplyFeedbacks: permissions?.canReplyFeedbacks ?? true,
      canEditWebsite: permissions?.canEditWebsite ?? true,
      canViewAnalytics: permissions?.canViewAnalytics ?? true,
      approvedBy: founderId,
      approvedAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      notes: notes?.trim() || 'Access granted by Founder in Admin Portal',
    };

    // 1. Save in memory store
    memoryTeamStore.set(targetUserId, record);

    // 2. Persist in Supabase team_permissions table
    try {
      await supabase.from('team_permissions').upsert(
        {
          user_id: targetUserId,
          email: cleanEmail,
          full_name: cleanName,
          role_title: cleanRole,
          status: 'approved',
          can_edit_jobs: record.canEditJobs,
          can_manage_walkins: record.canManageWalkins,
          can_verify_payments: record.canVerifyPayments,
          can_reply_feedbacks: record.canReplyFeedbacks,
          can_edit_website: record.canEditWebsite,
          can_view_analytics: record.canViewAnalytics,
          approved_by: founderId,
          approved_at: new Date().toISOString(),
          notes: record.notes,
        },
        { onConflict: 'user_id' }
      );
    } catch (dbErr) {
      console.warn('team_permissions upsert notice (fallback to memory):', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Approved ${cleanName} as ${cleanRole} with website modification privileges!`,
      member: record,
    });
  } catch (err: any) {
    console.error('Error adding team member:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to approve team member' },
      { status: 500 }
    );
  }
}

// PATCH: Update team member permissions or status
export async function PATCH(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const founderId = authCheck.user.id;
    const body = await req.json();
    const { targetUserId, roleTitle, status, permissions, notes } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Update in memory store
    const existing = memoryTeamStore.get(targetUserId);
    const updated: TeamMemberRecord = {
      id: existing?.id || 'team-' + Date.now(),
      userId: targetUserId,
      email: existing?.email || '',
      fullName: existing?.fullName || 'Team Member',
      roleTitle: roleTitle?.trim() || existing?.roleTitle || 'Website Editor',
      status: (status as any) || existing?.status || 'approved',
      canEditJobs: permissions?.canEditJobs ?? existing?.canEditJobs ?? true,
      canManageWalkins: permissions?.canManageWalkins ?? existing?.canManageWalkins ?? true,
      canVerifyPayments: permissions?.canVerifyPayments ?? existing?.canVerifyPayments ?? false,
      canReplyFeedbacks: permissions?.canReplyFeedbacks ?? existing?.canReplyFeedbacks ?? true,
      canEditWebsite: permissions?.canEditWebsite ?? existing?.canEditWebsite ?? true,
      canViewAnalytics: permissions?.canViewAnalytics ?? existing?.canViewAnalytics ?? true,
      approvedBy: founderId,
      approvedAt: new Date().toISOString(),
      joinedAt: existing?.joinedAt || new Date().toISOString(),
      notes: notes ?? existing?.notes ?? '',
    };

    memoryTeamStore.set(targetUserId, updated);

    // Persist to Supabase
    try {
      await supabase.from('team_permissions').upsert(
        {
          user_id: targetUserId,
          role_title: updated.roleTitle,
          status: updated.status,
          can_edit_jobs: updated.canEditJobs,
          can_manage_walkins: updated.canManageWalkins,
          can_verify_payments: updated.canVerifyPayments,
          can_reply_feedbacks: updated.canReplyFeedbacks,
          can_edit_website: updated.canEditWebsite,
          can_view_analytics: updated.canViewAnalytics,
          approved_by: founderId,
          updated_at: new Date().toISOString(),
          notes: updated.notes,
        },
        { onConflict: 'user_id' }
      );

      // Also update user_profiles assigned_role if exists
      await supabase
        .from('user_profiles')
        .update({
          assigned_role: updated.roleTitle,
          assigned_role_by: founderId,
        })
        .eq('user_id', targetUserId);
    } catch (dbErr) {
      console.warn('team_permissions patch notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated successfully for ${updated.fullName}!`,
      member: updated,
    });
  } catch (err: any) {
    console.error('Error updating team member:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update team member' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke / Remove team member
export async function DELETE(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    memoryTeamStore.delete(targetUserId);

    try {
      await supabase.from('team_permissions').delete().eq('user_id', targetUserId);
      await supabase
        .from('user_profiles')
        .update({ assigned_role: 'Member' })
        .eq('user_id', targetUserId);
    } catch (err) {
      console.warn('Delete team permission notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Team member access revoked and removed.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to revoke team member' },
      { status: 500 }
    );
  }
}
