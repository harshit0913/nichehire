import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import crypto from 'crypto';

const SECRET_KEY = process.env.SUPABASE_JWT_SECRET || 'nichehire-founder-stepup-secret-key-2026';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify user is actually a founder in user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_founder')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!profile?.is_founder) {
      return NextResponse.json(
        { error: 'Unauthorized: Account does not have founder privileges' },
        { status: 403 }
      );
    }

    // Generate short-lived (60s) HMAC step-up token
    const expiresAt = Date.now() + 60 * 1000;
    const tokenPayload = `${data.user.id}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', SECRET_KEY).update(tokenPayload).digest('hex');
    const stepUpToken = Buffer.from(`${tokenPayload}:${hmac}`).toString('base64');

    return NextResponse.json({
      success: true,
      stepUpToken,
      expiresInSeconds: 60,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Re-authentication failed' }, { status: 500 });
  }
}
