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
    // Validation: Support personal emails (Gmail, Yahoo, Outlook) as well as corporate domains
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail?.trim() || !emailRegex.test(contactEmail.trim())) {
      return NextResponse.json({ error: 'A valid contact email (Gmail, Yahoo, or corporate) is required.' }, { status: 400 });
    }

    const cleanUtr = (utrNumber || '').trim().toUpperCase().replace(/\s+/g, '');
    const utrRegex = /^[0-9A-Z]{12}$/;
    if (!cleanUtr || !utrRegex.test(cleanUtr)) {
      return NextResponse.json(
        { error: 'Please enter a valid 12-digit UPI Transaction Reference (UTR / UPI Ref No) from your payment receipt.' },
        { status: 400 }
      );
    }

    // 0. Strict UTR Deduplication Check across both In-Memory store and Supabase Database
    const inMemoryExisting = inMemoryPayments.find(
      (p) => p.utr_number?.toUpperCase() === cleanUtr
    );
    if (inMemoryExisting) {
      return NextResponse.json(
        {
          error: `This UPI UTR reference (${cleanUtr}) has already been submitted in the system (Status: ${inMemoryExisting.status.toUpperCase()}). Duplicate or reused UTRs cannot be used to activate plans.`,
        },
        { status: 409 }
      );
    }

    try {
      const { data: dbExisting } = await supabase
        .from('employer_payments')
        .select('id, status, utr_number, plan_name')
        .eq('utr_number', cleanUtr)
        .maybeSingle();

      if (dbExisting) {
        return NextResponse.json(
          {
            error: `This UPI UTR reference (${cleanUtr}) has already been submitted in the database (Status: ${(dbExisting.status || 'pending').toUpperCase()} for ${dbExisting.plan_name || 'Membership'}). Duplicate UTR reuse across plans is strictly blocked.`,
          },
          { status: 409 }
        );
      }
    } catch {
      // Ignore if table not created
    }

    const numericAmount = Number(planAmount) || 299;
    const resolvedPlanName =
      planName ||
      (numericAmount === 999
        ? 'Enterprise / Volume (20 Jobs • 30 Days)'
        : numericAmount === 599
        ? 'Pro Recruiter (5 Jobs • 21 Days)'
        : 'Growth Plan (2 Jobs • 14 Days)');

    // 1. Insert into Supabase employer_payments table
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      company_name: companyName.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
      contact_phone: (contactPhone || '').trim(),
      plan_amount: numericAmount,
      plan_name: resolvedPlanName,
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

    let dbPayments: any[] = [];
    try {
      const { data, error } = await supabase
        .from('employer_payments')
        .select('id, company_name, plan_amount, plan_name, utr_number, status, created_at, verified_at, admin_notes')
        .eq('contact_email', email)
        .order('created_at', { ascending: false });

      if (!error && data) dbPayments = data;
    } catch {
      // Supabase table query fallback
    }

    // Merge DB payments with in-memory payments
    const paymentMap = new Map<string, any>();
    dbPayments.forEach((p) => paymentMap.set(p.id, p));
    inMemoryPayments
      .filter((p) => p.contact_email?.toLowerCase() === email)
      .forEach((p) => {
        if (!paymentMap.has(p.id)) paymentMap.set(p.id, p);
      });

    const combinedPayments = Array.from(paymentMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latest = combinedPayments[0] || null;
    let computedMembership = null;

    if (latest) {
      const amount = Number(latest.plan_amount) || 299;
      const totalJobs = amount === 999 ? 20 : amount === 599 ? 5 : 2;
      const durationDays = amount === 999 ? 30 : amount === 599 ? 21 : 14;
      const planId = amount === 999 ? 'enterprise' : amount === 599 ? 'pro' : 'growth';
      const createdMs = new Date(latest.created_at).getTime();
      const expiresAt = createdMs + durationDays * 24 * 60 * 60 * 1000;

      computedMembership = {
        paymentId: latest.id,
        planId,
        planName: latest.plan_name || 'Growth Plan',
        price: amount,
        totalJobs,
        usedJobs: 0,
        durationDays,
        activatedAt: createdMs,
        expiresAt,
        status: latest.status, // 'pending' | 'approved' | 'rejected'
        utrNumber: latest.utr_number,
        adminNotes: latest.admin_notes,
      };
    }

    return NextResponse.json({
      payments: combinedPayments,
      latestMembership: computedMembership,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch payment status.' },
      { status: 500 }
    );
  }
}
