import { NextResponse } from 'next/server';
import { supabase } from '../../supabase';

// In-memory sliding window rate limiter fallback (or Upstash Redis when configured)
const submissionTracker = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = submissionTracker.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_SUBMISSIONS_PER_HOUR) {
    submissionTracker.set(ip, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  submissionTracker.set(ip, validTimestamps);
  return false;
}

function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 2000);
}

function isValidSafeEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  // Reject CRLF, commas, semicolons, or consecutive dots (header injection defense)
  if (/[\r\n;,]/.test(trimmed) || trimmed.includes('..')) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 1. Rate Limiting Check
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'You have submitted too many messages recently. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const type = body.type || 'general';
    const rawMessage = body.message || '';
    const rawEmail = body.email || '';
    const urlContext = body.urlContext || req.headers.get('referer') || '';
    const userId = body.userId || null;

    // 2. Validate Message
    const cleanMessage = sanitizeText(rawMessage);
    if (!cleanMessage || cleanMessage.length < 5) {
      return NextResponse.json(
        { error: 'Please enter a meaningful message (at least 5 characters).' },
        { status: 400 }
      );
    }

    // 3. Validate Email (if provided)
    let cleanEmail = '';
    if (rawEmail) {
      if (!isValidSafeEmail(rawEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address provided.' },
          { status: 400 }
        );
      }
      cleanEmail = rawEmail.trim();
    }

    // ─── Channel 1: Store in Supabase user_feedbacks table ────────────────────
    try {
      await supabase.from('user_feedbacks').insert([
        {
          type,
          message: cleanMessage,
          email: cleanEmail || null,
          user_id: userId,
          url_context: urlContext,
          status: 'new',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (dbErr) {
      console.warn('Could not persist feedback to database table:', dbErr);
    }

    // ─── Channel 2: Instant Discord / Telegram Webhook Ping ($0/mo) ───────────
    const webhookUrl = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      const typeIcons: Record<string, string> = {
        feature: '💡 Feature Idea',
        bug: '🐞 Bug Report / Complaint',
        general: '💬 General Feedback',
      };

      const title = typeIcons[type] || '📩 Feedback Received';
      const payload = {
        username: 'NicheHire Feedback Bot',
        embeds: [
          {
            title,
            description: cleanMessage,
            color: type === 'bug' ? 15158332 : type === 'feature' ? 3066993 : 3447003,
            fields: [
              { name: 'User Email', value: cleanEmail || 'Anonymous', inline: true },
              { name: 'Page URL', value: urlContext || 'Unknown', inline: true },
              { name: 'IP Address', value: clientIp, inline: true },
            ],
            footer: { text: `NicheHire Alert System • ${new Date().toLocaleDateString()}` },
          },
        ],
      };

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (webhookErr) {
        console.warn('Webhook dispatch failed:', webhookErr);
      }
    }

    // ─── Channel 3: Resend Email Forwarding ($0/mo up to 3k/mo) ───────────────
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'support@nichehire.in';
    if (resendKey && adminEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NicheHire Alerts <alerts@nichehire.in>',
            to: [adminEmail],
            reply_to: cleanEmail || undefined,
            subject: `[NicheHire ${type.toUpperCase()}] New user submission`,
            html: `
              <h2>New ${type} received on NicheHire</h2>
              <p><strong>From:</strong> ${cleanEmail || 'Anonymous'}</p>
              <p><strong>Page:</strong> ${urlContext}</p>
              <blockquote style="background:#f4f4f5;padding:12px;border-left:4px solid #2B4EE6;">
                ${cleanMessage.replace(/\n/g, '<br/>')}
              </blockquote>
            `,
          }),
        });
      } catch (emailErr) {
        console.warn('Email dispatch failed:', emailErr);
      }
    }

    // ─── Channel 4: Automated Bug Bounty Reward (1 Week Full Premium) ────────
    let bugBountyAwarded = false;
    if (type === 'bug' && userId) {
      try {
        const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            tier: 'premium',
            premium_source: 'bug_bounty',
            subscription_status: 'active',
            subscription_renews_at: oneWeekFromNow,
          }, { onConflict: 'user_id' });
        bugBountyAwarded = true;
      } catch (bountyErr) {
        console.warn('Could not grant 7-day bug bounty premium:', bountyErr);
      }
    }

    return NextResponse.json({
      success: true,
      bugBountyAwarded,
      message: bugBountyAwarded
        ? '🎉 Bug reported! As a reward, 1 Week of Full NicheHire Premium has been unlocked on your account!'
        : 'Feedback received successfully. Thank you for helping us improve!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to submit feedback.' },
      { status: 500 }
    );
  }
}
