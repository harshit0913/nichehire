import { NextResponse } from 'next/server';
import { supabase } from '../../supabase';

export type WalkInJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  timings: string;
  contact_info: string;
  description: string;
  role_type?: string;
  posted_by?: string;
  created_at: string;
  expires_at: string;
  flag_count: number;
  is_community: boolean;
};

// Initial community-seeded walk-in opportunities if table is empty or being initialized
const SEED_WALKINS: WalkInJob[] = [
  {
    id: 'seed-walkin-1',
    title: 'Retail Store Assistant & Cashier',
    company: 'Lifestyle & Electronics Hub',
    location: 'Indiranagar 100ft Road, Bangalore',
    timings: 'Mon - Fri, 10:30 AM - 2:30 PM',
    contact_info: '+91 98450 12345 (Mr. Rakesh - Store Mgr)',
    description: 'Looking for energetic customer-facing cashier and inventory assistants. Bring updated physical resume and Aadhar card copy for on-the-spot interview.',
    role_type: 'Full-Time',
    posted_by: 'Community Member',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    flag_count: 0,
    is_community: true,
  },
  {
    id: 'seed-walkin-2',
    title: 'Junior Accounts & Billing Executive',
    company: 'Apex Logistics & Freight',
    location: 'Sector 18, Noida / Delhi NCR',
    timings: 'Direct Walk-in: 11:00 AM - 4:00 PM Daily',
    contact_info: 'hr@apexlogistics.in / Visit 3rd Floor Reception',
    description: 'Immediate requirement for B.Com / M.Com freshers or with 1 yr experience in Tally Prime, GST invoicing, and ledger reconciliation.',
    role_type: 'Full-Time',
    posted_by: 'Community Member',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    flag_count: 0,
    is_community: true,
  },
  {
    id: 'seed-walkin-3',
    title: 'Front Desk / Operations Coordinator',
    company: 'Wellness & Diagnostics Centre',
    location: 'Bandra West, Mumbai',
    timings: 'Saturday & Monday, 9:00 AM - 1:00 PM',
    contact_info: '+91 91234 56789 (Ms. Neha - HR)',
    description: 'Managing patient registrations, appointment scheduling, and basic Excel record keeping. Good verbal communication required.',
    role_type: 'Full-Time',
    posted_by: 'Community Member',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    flag_count: 0,
    is_community: true,
  },
];

export async function GET() {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('walkin_jobs')
      .select('*')
      .gt('expires_at', nowIso)
      .lt('flag_count', 3)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase walkin_jobs fetch notice (using seed listings):', error.message);
      return NextResponse.json({ walkins: SEED_WALKINS, isFallback: true });
    }

    // Combine Supabase entries with seed entries (if table is freshly empty)
    const combined = (data && data.length > 0)
      ? data.map((d) => ({ ...d, is_community: true }))
      : SEED_WALKINS;

    return NextResponse.json({ walkins: combined, isFallback: false });
  } catch (err: any) {
    console.error('Walkins API GET error:', err);
    return NextResponse.json({ walkins: SEED_WALKINS, isFallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, company, location, timings, contact_info, description, role_type, posted_by } = body;

    if (!title?.trim() || !company?.trim() || !location?.trim() || !contact_info?.trim()) {
      return NextResponse.json(
        { error: 'Please provide Title, Company/Business, Location, and Contact Information.' },
        { status: 400 }
      );
    }

    const newWalkin = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      timings: (timings || 'Mon - Fri, 10:00 AM - 4:00 PM').trim(),
      contact_info: contact_info.trim(),
      description: (description || 'Direct walk-in interview. Please carry your updated resume and ID proof.').trim(),
      role_type: role_type || 'Full-Time',
      posted_by: posted_by?.trim() || 'Community Member',
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      flag_count: 0,
    };

    const { data, error } = await supabase
      .from('walkin_jobs')
      .insert([newWalkin])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert error (table may not exist yet):', error.message);
      // Return simulated success with temporary generated ID so the user doesn't hit a wall
      const fallbackItem: WalkInJob = {
        ...newWalkin,
        id: `walkin-${Date.now()}`,
        created_at: new Date().toISOString(),
        is_community: true,
      };
      return NextResponse.json({
        walkin: fallbackItem,
        notice: 'Listing created locally. Run the Supabase SQL migration to persist globally.',
      });
    }

    return NextResponse.json({ walkin: { ...data, is_community: true } });
  } catch (err: any) {
    console.error('Walkins API POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit walk-in.' }, { status: 500 });
  }
}
