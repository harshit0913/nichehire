import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { inMemoryPayments } from '../../../lib/paymentsStore';

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
    const filterStatus = searchParams.get('status');

    let query = supabase
      .from('employer_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    let dbPayments: any[] = [];
    try {
      const { data, error } = await query;
      if (!error && data) dbPayments = data;
    } catch {
      // Supabase table not created yet, fallback to in-memory
    }

    // Merge in-memory and db payments, deduplicating by ID
    const paymentMap = new Map<string, any>();
    inMemoryPayments.forEach((p) => {
      if (!filterStatus || filterStatus === 'all' || p.status === filterStatus) {
        paymentMap.set(p.id, p);
      }
    });
    dbPayments.forEach((p) => {
      paymentMap.set(p.id, p);
    });

    const combinedPayments = Array.from(paymentMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      payments: combinedPayments,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch employer payments' },
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

    const body = await req.json();
    const { paymentId, newStatus, adminNotes } = body;

    if (!paymentId || !['approved', 'rejected', 'pending'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid paymentId or status.' },
        { status: 400 }
      );
    }

    // 1. Check in-memory payments first
    let memoryPayment = inMemoryPayments.find((p) => p.id === paymentId);
    if (memoryPayment) {
      memoryPayment.status = newStatus;
      memoryPayment.verified_by = authCheck.user.id;
      memoryPayment.verified_at = new Date().toISOString();
      memoryPayment.admin_notes = adminNotes || '';
    }

    // 2. Fetch from Supabase
    const { data: payment } = await supabase
      .from('employer_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    const effectivePayment = payment || memoryPayment;
    if (!effectivePayment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    // 3. Update in Supabase
    try {
      await supabase
        .from('employer_payments')
        .update({
          status: newStatus,
          verified_by: authCheck.user.id,
          verified_at: new Date().toISOString(),
          admin_notes: adminNotes || '',
        })
        .eq('id', paymentId);
    } catch {
      // Supabase table may not exist yet
    }

    // 3. Email dispatch to employer via Resend if approved
    const resendKey = process.env.RESEND_API_KEY;
    if (newStatus === 'approved' && payment.contact_email && resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Harshit Mishra (Founder, NicheHire) <harshit@nichehire.in>',
            to: [payment.contact_email],
            subject: `✓ Payment Verified — Your NicheHire Featured Listing is Active!`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
                <h2 style="color:#059669;margin-bottom:8px;">Payment Verified Successfully</h2>
                <p style="color:#52525b;font-size:14px;">
                  Hello ${payment.company_name} hiring team,<br/><br/>
                  We have verified your UPI payment of <strong>₹${payment.plan_amount}</strong> (UTR: <code>${payment.utr_number}</code>).
                </p>
                <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:16px;border-radius:8px;margin:16px 0;">
                  <strong style="color:#065f46;">Activated Perks:</strong>
                  <ul style="color:#047857;font-size:13px;margin:8px 0 0 0;padding-left:18px;">
                    <li>Priority #1 Featured Placement on Job Feed</li>
                    <li>Verified Direct Employer Seal</li>
                    <li>Direct Candidate Resume Access & AI Fit Scoring</li>
                  </ul>
                </div>
                <p style="color:#71717a;font-size:12px;">
                  Thank you for hiring on NicheHire.<br/>
                  <strong>Harshit Mishra</strong><br/>
                  Founder & CEO, NicheHire
                </p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.warn('Failed to send payment approval email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${newStatus}.`,
      paymentId,
      newStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update payment status.' },
      { status: 500 }
    );
  }
}
