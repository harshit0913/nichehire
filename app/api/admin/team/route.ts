import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';

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
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized: Invalid token' };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_founder')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!isFounder(user.email, profile?.is_founder)) {
    return { authorized: false, error: 'Forbidden: Founder access required' };
  }

  return { authorized: true, user };
}

export async function GET(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const founderId = authCheck.user.id;

    // 1. Fetch all candidate profiles referred by this founder
    const { data: teamMembers, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('user_id, tier, referral_code, referred_by, assigned_role, created_at')
      .or(`referred_by.eq.${founderId},referral_code.ilike.FOUNDER%`)
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    // 2. Fetch overrides for these members
    const userIds = (teamMembers || []).map((m) => m.user_id);
    let overridesMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: overrideRows } = await supabase
        .from('founder_overrides')
        .select('*')
        .in('user_id', userIds);

      (overrideRows || []).forEach((row) => {
        overridesMap.set(row.user_id, row);
      });
    }

    const membersWithDetails = (teamMembers || []).map((m) => {
      const override = overridesMap.get(m.user_id);
      return {
        userId: m.user_id,
        tier: m.tier || 'member',
        assignedRole: m.assigned_role || 'Member',
        accessLevel: override?.access_level || (m.tier === 'premium' ? 'premium' : 'basic'),
        note: override?.note || '',
        overrideUpdatedAt: override?.updated_at || null,
        joinedAt: m.created_at || null,
        displayLabel: `Candidate #${m.user_id.slice(0, 8).toUpperCase()}`,
      };
    });

    return NextResponse.json({
      success: true,
      members: membersWithDetails,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const founderId = authCheck.user.id;
    const body = await req.json();
    const { targetUserId, accessLevel, assignedRole, note } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Validate access level
    const VALID_LEVELS = ['unlimited', 'premium', 'basic', 'revoked'];
    if (accessLevel && !VALID_LEVELS.includes(accessLevel)) {
      return NextResponse.json(
        { error: `Invalid access level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    // 1. Target user verification: must belong to founder's referral tree
    const { data: targetProfile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('referred_by, user_id, assigned_role')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'Target user profile not found.' }, { status: 404 });
    }

    if (targetProfile.referred_by !== founderId) {
      // Also allow if target user signed up with FOUNDER code
      const { data: refRow } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_user_id', targetUserId)
        .eq('referrer_id', founderId)
        .maybeSingle();

      if (!refRow) {
        return NextResponse.json(
          { error: 'Scope violation: You may only adjust roles and access for candidates who signed up via your founder referral link.' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch previous override level for audit trail
    const { data: previousOverride } = await supabase
      .from('founder_overrides')
      .select('access_level')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const prevLevel = previousOverride?.access_level || 'basic';
    const effectiveAccessLevel = accessLevel || prevLevel;

    // 3. Upsert founder_overrides
    const { error: overrideErr } = await supabase
      .from('founder_overrides')
      .upsert({
        user_id: targetUserId,
        access_level: effectiveAccessLevel,
        granted_by: founderId,
        updated_at: new Date().toISOString(),
        note: note || '',
      });

    if (overrideErr) throw overrideErr;

    // 4. Update user_profiles with assigned_role
    if (assignedRole) {
      const { error: roleErr } = await supabase
        .from('user_profiles')
        .update({
          assigned_role: assignedRole,
          assigned_role_by: founderId,
        })
        .eq('user_id', targetUserId);

      if (roleErr) console.warn('Could not update assigned_role column:', roleErr);
    }

    // 5. Write Immutable Audit Log
    try {
      await supabase.from('founder_override_audit_logs').insert([
        {
          target_user_id: targetUserId,
          changed_by: founderId,
          previous_access_level: prevLevel,
          new_access_level: effectiveAccessLevel,
          note: `Role: ${assignedRole || targetProfile.assigned_role || 'None'} | Note: ${note || ''}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated permissions and assigned role for candidate.`,
      targetUserId,
      accessLevel: effectiveAccessLevel,
      assignedRole: assignedRole || targetProfile.assigned_role,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update team member' },
      { status: 500 }
    );
  }
}
