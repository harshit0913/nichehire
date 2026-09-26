import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const { data: reports, error } = await supabase
      .from('career_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: reports || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch saved career reports' },
      { status: 500 }
    );
  }
}
