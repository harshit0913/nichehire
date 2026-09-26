import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { inMemoryPayments } from '../../../lib/paymentsStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactEmail,
      contactPhone,
      planAmount,
      planName,
      utrNumber,
      screenshotData,
    } = body;

    // Validation
    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company Name is required.' }, { status: 400 });
    }
    if (!contactEmail?.trim() || !contactEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid work email is required.' }, { status: 400 });
    }
    if (!utrNumber?.trim() || utrNumber.trim().length < 8) {
      return NextResponse.json(
        { error: 'Please enter a valid 12-digit UPI Transaction Reference (UTR) number.' },
        { status: 400 }
      );
    }
    if (!screenshotData) {
      return NextResponse.json(
        { error: 'Payment screenshot proof is required for manual founder verification.' },
        { status: 400 }
      );
    }

    const cleanUtr = utrNumber.trim().replace(/\s+/g, '');

    // 1. Insert into Supabase employer_payments table
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      company_name: companyName.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
      contact_phone: (contactPhone || '').trim(),
      plan_amount: Number(planAmount) || 499,
      plan_name: planName || (planAmount === 1999 ? 'Growth Bundle' : 'Featured Placement'),
      utr_number: cleanUtr,
      screenshot_data: screenshotData,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: dbErr } = await supabase
      .from('employer_payments')
      .insert([paymentRecord])
      .select()
      .maybeSingle();

    if (dbErr) {
      console.warn('Could not insert payment into Supabase, using in-memory buffer:', dbErr.message);
    }

    inMemoryPayments.unshift(inserted || paymentRecord);

    // 2. Instant Discord / Webhook ping for Founder Alert ($0/mo)
    const webhookUrl = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'NicheHire Payment Sentinel',
            embeds: [
              {
                title: '💳 New Employer Payment Proof Submitted',
                description: `**Company:** ${companyName}\n**Plan:** ₹${planAmount} (${planName})\n**UTR:** \`${cleanUtr}\`\n**Email:** ${contactEmail}\n**Status:** Pending Founder Verification`,
                color: 16753920, // Amber color
                footer: { text: 'Log in to /admin to verify screenshot and approve.' },
              },
            ],
          }),
        });
      } catch (alertErr) {
        console.warn('Payment webhook failed:', alertErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: inserted?.id || `local-${Date.now()}`,
      status: 'pending',
      message: 'Payment proof submitted. Status is now PENDING verification by Admin.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to submit payment proof.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ payments: [] });
    }

    const { data: payments, error } = await supabase
      .from('employer_payments')
      .select('id, company_name, plan_amount, plan_name, utr_number, status, created_at, verified_at, admin_notes')
      .eq('contact_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ payments: [] });
    }

    return NextResponse.json({ payments: payments || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch payment status.' },
      { status: 500 }
    );
  }
}
