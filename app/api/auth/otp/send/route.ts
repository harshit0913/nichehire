import { NextResponse } from 'next/server';
import {
  otpStore,
  normalizeIdentifier,
  generateSecureOtp,
  maskIdentifier,
} from '../../../../lib/otpStore';
import { supabase } from '../../../../supabase';

export const dynamic = 'force-dynamic';

interface DispatchResult {
  channel: 'email' | 'sms';
  deliveryStatus: 'sent' | 'simulated' | 'failed';
  provider?: string;
  error?: string;
  notice?: string;
}

/**
 * Attempts real outbound dispatch via email services:
 * 1. Resend API (if RESEND_API_KEY configured)
 * 2. Supabase Auth signInWithOtp (native Supabase email transport)
 */
async function dispatchEmailOtp(email: string, otpCode: string): Promise<DispatchResult> {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN || 'nichehire.tech';
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'auth@nichehire.tech';
  const fromName = process.env.EMAIL_FROM_NAME || 'NicheHire Auth';

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e4e7ec; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 20px; font-weight: 800; color: #12172b; letter-spacing: -0.5px;">NicheHire</span>
        <span style="display: block; font-size: 12px; color: #5b6478; margin-top: 4px;">Career &amp; Verification Portal</span>
      </div>
      <p style="font-size: 14px; color: #344054; line-height: 1.5;">Hello,</p>
      <p style="font-size: 14px; color: #344054; line-height: 1.5;">Here is your unique 6-digit verification code to sign in or register on NicheHire:</p>
      <div style="background-color: #f7f8fa; border: 1px solid #d0d5dd; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2b4ee6;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #667085; line-height: 1.5;">This code is valid for <strong>5 minutes</strong>. If you did not request this code, you can safely disregard this email.</p>
      <div style="border-top: 1px solid #eaecf0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #98a2b3; text-align: center;">
        © 2026 NicheHire (nichehire.tech). All rights reserved.
      </div>
    </div>
  `;

  // 1. SendGrid Dispatch (GitHub Student Developer Pack - Twilio SendGrid)
  if (sendgridKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail, name: fromName },
          subject: `Your NicheHire Verification Code: ${otpCode}`,
          content: [{ type: 'text/html', value: emailHtml }],
        }),
      });

      if (res.status === 202 || res.ok) {
        console.log(`[OTP DISPATCH - EMAIL: SUCCESS] Delivered to ${email} via SendGrid`);
        return { channel: 'email', deliveryStatus: 'sent', provider: 'SendGrid' };
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[OTP DISPATCH - EMAIL: SENDGRID FAILED] Status ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[OTP DISPATCH - EMAIL: SENDGRID ERROR] ${err.message}`);
    }
  }

  // 2. Mailgun Dispatch (GitHub Student Developer Pack - Mailgun)
  if (mailgunKey && mailgunDomain) {
    try {
      const formData = new URLSearchParams();
      formData.append('from', `${fromName} <${fromEmail}>`);
      formData.append('to', email);
      formData.append('subject', `Your NicheHire Verification Code: ${otpCode}`);
      formData.append('html', emailHtml);

      const res = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (res.ok) {
        console.log(`[OTP DISPATCH - EMAIL: SUCCESS] Delivered to ${email} via Mailgun`);
        return { channel: 'email', deliveryStatus: 'sent', provider: 'Mailgun' };
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[OTP DISPATCH - EMAIL: MAILGUN FAILED] Status ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[OTP DISPATCH - EMAIL: MAILGUN ERROR] ${err.message}`);
    }
  }

  // 3. Resend Dispatch (Fallback)
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `Your NicheHire Verification Code: ${otpCode}`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        console.log(`[OTP DISPATCH - EMAIL: SUCCESS] Delivered to ${email} via Resend`);
        return { channel: 'email', deliveryStatus: 'sent', provider: 'Resend' };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[OTP DISPATCH - EMAIL: RESEND FAILED] ${JSON.stringify(errJson)}`);
      }
    } catch (err: any) {
      console.warn(`[OTP DISPATCH - EMAIL: RESEND ERROR] ${err.message}`);
    }
  }

  // Fallback to Supabase Auth OTP
  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) {
      console.log(`[OTP DISPATCH - EMAIL: SUCCESS] Dispatched to ${email} via Supabase Auth`);
      return { channel: 'email', deliveryStatus: 'sent', provider: 'Supabase Auth' };
    } else {
      console.warn(`[OTP DISPATCH - EMAIL: SUPABASE ERROR] ${error.message} (code: ${error.code})`);
      return {
        channel: 'email',
        deliveryStatus: 'simulated',
        provider: 'Supabase Auth',
        error: error.message,
        notice: `Email delivery provider encountered: ${error.message}. Use test code for verification.`,
      };
    }
  } catch (err: any) {
    console.warn(`[OTP DISPATCH - EMAIL: EXCEPTION] ${err.message}`);
    return {
      channel: 'email',
      deliveryStatus: 'simulated',
      error: err.message,
      notice: 'Outbound email transport unavailable. Use on-screen code for verification.',
    };
  }
}

/**
 * Attempts real outbound dispatch via SMS gateways:
 * 1. Fast2SMS (Indian DLT/Quick OTP)
 * 2. Twilio SMS
 * 3. Fallback to sandbox simulation with explicit server logging
 */
async function dispatchSmsOtp(phone: string, otpCode: string): Promise<DispatchResult> {
  const cleanDigits = phone.replace(/\D/g, '');
  const tenDigitMobile = cleanDigits.slice(-10);

  // 1. Fast2SMS Indian SMS Gateway
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey && tenDigitMobile.length === 10) {
    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2SmsKey}&route=otp&variables_values=${otpCode}&numbers=${tenDigitMobile}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.return === true) {
        console.log(`[OTP DISPATCH - SMS: SUCCESS] Delivered to ${phone} via Fast2SMS`);
        return { channel: 'sms', deliveryStatus: 'sent', provider: 'Fast2SMS' };
      } else {
        console.error(`[OTP DISPATCH - SMS: FAST2SMS ERROR] ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error(`[OTP DISPATCH - SMS: FAST2SMS EXCEPTION] ${err.message}`);
    }
  }

  // 2. Twilio Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const bodyParams = new URLSearchParams({
        To: phone.startsWith('+') ? phone : `+91${tenDigitMobile}`,
        From: twilioFrom,
        Body: `Your NicheHire verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (res.ok) {
        console.log(`[OTP DISPATCH - SMS: SUCCESS] Delivered to ${phone} via Twilio`);
        return { channel: 'sms', deliveryStatus: 'sent', provider: 'Twilio' };
      } else {
        const twilioErr = await res.json().catch(() => ({}));
        console.error(`[OTP DISPATCH - SMS: TWILIO ERROR] ${JSON.stringify(twilioErr)}`);
      }
    } catch (err: any) {
      console.error(`[OTP DISPATCH - SMS: TWILIO EXCEPTION] ${err.message}`);
    }
  }

  // 3. Sandbox / Simulated fallback
  console.warn(
    `[OTP DISPATCH - SMS WARNING] No SMS gateway configured (FAST2SMS_API_KEY / TWILIO_ACCOUNT_SID not set). Operating in simulated sandbox delivery mode for target: ${phone}`
  );
  return {
    channel: 'sms',
    deliveryStatus: 'simulated',
    provider: 'Sandbox Simulator',
    notice: 'SMS gateway not configured in server environment. Use on-screen code below for verification.',
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = body.identifier || body.phone || body.email;

    if (!rawTarget || typeof rawTarget !== 'string') {
      return NextResponse.json(
        { error: 'Please enter your email address or 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(rawTarget);
    if (!normalized.isValid) {
      return NextResponse.json(
        { error: normalized.error || 'Invalid email address or mobile number.' },
        { status: 400 }
      );
    }

    const masked = maskIdentifier(normalized.identifier, normalized.type);

    // Rate-limiting check: enforce a 10-second cooldown between resends to same identifier
    const existing = otpStore.get(normalized.identifier);
    if (existing && Date.now() - existing.lastSentAt < 10000) {
      const waitSeconds = Math.ceil((10000 - (Date.now() - existing.lastSentAt)) / 1000);
      console.warn(
        `[OTP DISPATCH - RATE LIMITED] Target ${masked} requested resend too quickly. Cooldown remaining: ${waitSeconds}s.`
      );
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds}s before requesting a new code.`,
          retryAfter: waitSeconds,
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    // Generate unique, cryptographically secure 6-digit numeric OTP
    const otpCode = generateSecureOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalized.identifier, {
      code: otpCode,
      identifier: normalized.identifier,
      type: normalized.type,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
    });

    console.log(
      `[SECURE OTP ENGINE] Generated OTP for ${normalized.identifier} (${normalized.type}): ${otpCode}`
    );

    // Outbound Dispatch to Real Channels
    let dispatchResult: DispatchResult;
    if (normalized.type === 'email') {
      dispatchResult = await dispatchEmailOtp(normalized.identifier, otpCode);
    } else {
      dispatchResult = await dispatchSmsOtp(normalized.identifier, otpCode);
    }

    const responsePayload: any = {
      success: true,
      identifier: normalized.identifier,
      type: normalized.type,
      maskedIdentifier: masked,
      expiresInSeconds: 300,
      channel: dispatchResult.channel,
      deliveryStatus: dispatchResult.deliveryStatus,
      provider: dispatchResult.provider,
    };

    if (dispatchResult.deliveryStatus === 'sent') {
      responsePayload.message = `Verification code successfully dispatched to ${masked}. Please check your ${
        normalized.type === 'email' ? 'email inbox' : 'SMS messages'
      }.`;
    } else {
      // In sandbox mode or when gateway is not active, return the code and notice
      responsePayload.otpCode = otpCode;
      responsePayload.deliveryNotice =
        dispatchResult.notice ||
        `Verification code generated for testing: ${otpCode}. Valid for 5 minutes.`;
      responsePayload.message =
        dispatchResult.notice || `Your verification OTP is ${otpCode}. Valid for 5 minutes.`;
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('Error generating OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
