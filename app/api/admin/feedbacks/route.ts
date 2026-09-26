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

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type');
    const filterStatus = searchParams.get('status');

    let query = supabase
      .from('user_feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterType && filterType !== 'all') {
      query = query.eq('type', filterType);
    }
    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data: feedbacks, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      feedbacks: feedbacks || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch user feedbacks' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authCheck = await verifyFounder(req);
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { feedbackId, replyMessage, markResolved = true, sendEmail = false } = body;

    if (!feedbackId || !replyMessage?.trim()) {
      return NextResponse.json(
        { error: 'Missing feedbackId or replyMessage' },
        { status: 400 }
      );
    }

    const trimmedReply = replyMessage.trim();

    // 1. Fetch existing feedback to get recipient email & original message
    const { data: existingFeedback, error: fetchErr } = await supabase
      .from('user_feedbacks')
      .select('*')
      .eq('id', feedbackId)
      .maybeSingle();

    if (fetchErr || !existingFeedback) {
      return NextResponse.json({ error: 'Feedback record not found' }, { status: 404 });
    }

    // 2. Update record in Supabase
    const { error: updateErr } = await supabase
      .from('user_feedbacks')
      .update({
        admin_reply: trimmedReply,
        replied_at: new Date().toISOString(),
        replied_by: authCheck.user.id,
        status: markResolved ? 'resolved' : 'in_progress',
      })
      .eq('id', feedbackId);

    if (updateErr) throw updateErr;

    // 3. Optional: Send Email via Resend if candidate provided email
    let emailDispatched = false;
    const resendKey = process.env.RESEND_API_KEY;
    if (sendEmail && existingFeedback.email && resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Harshit Mishra (Founder, NicheHire) <harshit@nichehire.in>',
            to: [existingFeedback.email],
            subject: `Reply to your NicheHire ${existingFeedback.type || 'feedback'}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e4e4e7;border-radius:12px;">
                <h2 style="color:#2B4EE6;margin-bottom:8px;">NicheHire Founder Response</h2>
                <p style="color:#52525b;font-size:14px;margin-bottom:16px;">
                  Hi there, thank you for writing to us. Here is our direct response regarding your submission:
                </p>
                <div style="background:#f4f4f5;padding:14px;border-radius:8px;border-left:4px solid #2B4EE6;margin-bottom:20px;">
                  <strong style="display:block;margin-bottom:6px;color:#18181b;">Your Submission:</strong>
                  <p style="margin:0;color:#3f3f46;font-size:13px;">${existingFeedback.message}</p>
                </div>
                <div style="background:#eff6ff;padding:16px;border-radius:8px;border:1px solid #bfdbfe;margin-bottom:20px;">
                  <strong style="display:block;margin-bottom:6px;color:#1e3a8a;">Harshit's Reply:</strong>
                  <p style="margin:0;color:#1e40af;font-size:14px;white-space:pre-wrap;">${trimmedReply}</p>
                </div>
                <p style="color:#71717a;font-size:12px;margin:0;">
                  Best regards,<br/>
                  <strong>Harshit Mishra</strong><br/>
                  Founder & CEO, NicheHire
                </p>
              </div>
            `,
          }),
        });
        emailDispatched = true;
      } catch (emailErr) {
        console.warn('Failed to dispatch email reply via Resend:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reply saved and posted to user dashboard successfully.',
      emailDispatched,
      feedbackId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to submit reply' },
      { status: 500 }
    );
  }
}
