import { supabase } from '../supabase';
import { verifyAuthToken } from './referralEngine';

export interface ResolvedUser {
  id: string;
  email?: string;
  isFounder: boolean;
}

/**
 * Checks if an email address belongs to the Founder (Harshit Mishra).
 * Recognizes all personal Gmail accounts (harshitmishra7073, harshitmishra9536, etc.),
 * official domain emails (harshit@nichehire.tech, founder@nichehire.tech),
 * and any emails configured in FOUNDER_EMAIL environment variable.
 */
export function isFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  // 1. Any personal account matching Harshit Mishra
  if (normalized.startsWith('harshitmishra') && normalized.endsWith('@gmail.com')) {
    return true;
  }

  // 2. Official company / founder domain emails
  const officialEmails = [
    'harshit@nichehire.tech',
    'founder@nichehire.tech',
    'support@nichehire.tech',
    'founder@nichehire.in',
    'harsh@nichehire.tech',
    'harshitmishra7073@gmail.com',
  ];
  if (officialEmails.includes(normalized)) {
    return true;
  }

  // 3. Configured environment variables (FOUNDER_EMAIL, ADMIN_EMAIL)
  const envEmails = [
    ...(process.env.FOUNDER_EMAIL || '').split(','),
    ...(process.env.ADMIN_EMAIL || '').split(','),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return envEmails.includes(normalized);
}

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Universally authenticates an incoming request across:
 * 1. Clerk session JWT or Clerk User ID
 * 2. Supabase Auth session token
 * 3. Custom phone/email OTP JWT
 * 4. Client verified headers (x-user-email, x-user-id)
 */
export async function resolveAuthUser(req: Request): Promise<ResolvedUser | null> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const headerEmail = req.headers.get('x-user-email')?.toLowerCase().trim();
  const headerUserId = req.headers.get('x-user-id')?.trim();

  let resolvedId: string | null = null;
  let resolvedEmail: string | undefined = headerEmail || undefined;

  // 1. JWT Inspection (Clerk, Supabase, or Custom OTP)
  if (token && token.startsWith('ey')) {
    const payload = parseJwtPayload(token);
    if (payload) {
      // Check if it's a Clerk JWT
      const isClerk = (payload.iss && payload.iss.includes('clerk')) || (payload.sub && payload.sub.startsWith('user_'));
      if (isClerk) {
        resolvedId = payload.sub;
        if (payload.email) {
          resolvedEmail = payload.email;
        } else if (payload.sub && process.env.CLERK_SECRET_KEY) {
          try {
            const clerkRes = await fetch(`https://api.clerk.com/v1/users/${payload.sub}`, {
              headers: {
                Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
              },
            });
            if (clerkRes.ok) {
              const clerkData = await clerkRes.json();
              resolvedEmail =
                clerkData.email_addresses?.[0]?.email_address ||
                clerkData.primary_email_address_id ||
                resolvedEmail;
            }
          } catch {
            // Network fallback
          }
        }
      }
    }

    // Check Supabase if not Clerk
    if (!resolvedId) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          resolvedId = user.id;
          resolvedEmail = user.email || resolvedEmail;
        }
      } catch {}
    }

    // Check custom OTP token
    if (!resolvedId) {
      const customPayload = verifyAuthToken(token);
      if (customPayload) {
        resolvedId = customPayload.userId;
        if (customPayload.type === 'email') {
          resolvedEmail = customPayload.identifier;
        }
      }
    }
  }

  // 2. Direct Clerk User ID verification via server-side Clerk Secret Key
  if (!resolvedId && headerUserId && headerUserId.startsWith('user_') && process.env.CLERK_SECRET_KEY) {
    try {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${headerUserId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });
      if (clerkRes.ok) {
        const clerkData = await clerkRes.json();
        resolvedId = clerkData.id;
        resolvedEmail = clerkData.email_addresses?.[0]?.email_address || resolvedEmail;
      }
    } catch {}
  }

  // 3. Fallback to client headers if already authenticated
  if (!resolvedId && (headerUserId || resolvedEmail)) {
    resolvedId = headerUserId || `guest_${Date.now()}`;
  }

  if (!resolvedId) {
    return null;
  }

  // 4. Determine Founder Status
  let isFounder = isFounderEmail(resolvedEmail);

  if (!isFounder) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id', resolvedId)
        .maybeSingle();

      if (profile?.is_founder === true) {
        isFounder = true;
      }
    } catch {}
  }

  return {
    id: resolvedId,
    email: resolvedEmail,
    isFounder,
  };
}
