import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import crypto from 'crypto';

const SECRET_KEY = process.env.SUPABASE_JWT_SECRET || 'nichehire-founder-stepup-secret-key-2026';

function verifyStepUpToken(token: string): { valid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [userId, expiresAtStr, receivedHmac] = decoded.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return { valid: false };
    }

    const payload = `${userId}:${expiresAtStr}`;
    const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
      return { valid: true, userId };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function POST(req: Request) {
  try {
    const { targetUserId, newAccessLevel, note, stepUpToken } = await req.json();

    if (!stepUpToken) {
      return NextResponse.json(
        { error: 'Missing step-up authentication token. Please re-authenticate first.' },
        { status: 401 }
      );
    }

    // 1. Verify Step-Up Token
    const { valid, userId: founderId } = verifyStepUpToken(stepUpToken);
    if (!valid || !founderId) {
      return NextResponse.json(
        { error: 'Step-up authentication token is expired or invalid. Please re-enter your password.' },
        { status: 401 }
      );
    }

    // 2. Validate Access Level
    const VALID_LEVELS = ['unlimited', 'premium', 'basic', 'revoked'];
    if (!VALID_LEVELS.includes(newAccessLevel)) {
      return NextResponse.json(
        { error: `Invalid access level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    // 3. Strict Scope Enforcement: Target user MUST be directly referred by this founder
    const { data: targetProfile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('referred_by, user_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'Target user profile not found.' }, { status: 404 });
    }

    if (targetProfile.referred_by !== founderId) {
      return NextResponse.json(
        {
          error: 'Scope violation: You may only adjust overrides for candidates who signed up directly using your personal referral code.',
        },
        { status: 403 }
      );
    }

    // 4. Fetch previous access level for audit trail
    const { data: previousOverride } = await supabase
      .from('founder_overrides')
      .select('access_level')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const previousLevel = previousOverride?.access_level || 'none';

    // 5. Upsert founder_overrides
    const { error: upsertErr } = await supabase.from('founder_overrides').upsert({
      user_id: targetUserId,
      access_level: newAccessLevel,
      granted_by: founderId,
      updated_at: new Date().toISOString(),
      note: note || '',
    });

    if (upsertErr) {
      throw upsertErr;
    }

    // 6. Write Immutable Audit Log
    try {
      await supabase.from('founder_override_audit_logs').insert([
        {
          target_user_id: targetUserId,
          changed_by: founderId,
          previous_access_level: previousLevel,
          new_access_level: newAccessLevel,
          note: note || 'Founder override adjustment',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (auditErr) {
      console.error('CRITICAL: Failed to write founder override audit log:', auditErr);
    }

    // 7. Live Webhook Alert (Discord / Telegram)
    const webhookUrl = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'NicheHire Security Monitor',
            content: `🛡️ **Founder Override Modified**\nTarget: \`${targetUserId}\`\nPrevious Level: \`${previousLevel}\`\nNew Level: \`${newAccessLevel}\`\nNote: _${note || 'None'}_\nTimestamp: ${new Date().toISOString()}`,
          }),
        });
      } catch (alertErr) {
        console.warn('Webhook alert failed:', alertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully adjusted override to ${newAccessLevel} for candidate ${targetUserId}.`,
      targetUserId,
      newAccessLevel,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update founder override.' },
      { status: 500 }
    );
  }
}
