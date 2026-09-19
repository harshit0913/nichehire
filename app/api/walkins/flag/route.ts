import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Check existing record
    const { data: current, error: fetchErr } = await supabase
      .from('walkin_jobs')
      .select('flag_count')
      .eq('id', id)
      .single();

    if (!fetchErr && current) {
      const newCount = (current.flag_count || 0) + 1;
      await supabase
        .from('walkin_jobs')
        .update({ flag_count: newCount })
        .eq('id', id);
      return NextResponse.json({ success: true, flagCount: newCount });
    }

    return NextResponse.json({ success: true, flagCount: 1 });
  } catch (err: any) {
    console.error('Flag walk-in error:', err);
    return NextResponse.json({ error: err.message || 'Failed to flag listing.' }, { status: 500 });
  }
}
