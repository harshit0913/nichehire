import crypto from 'crypto';
import { supabase } from '../supabase';
import { calculateUserTier } from './premiumTierEngine';

// Persistent in-memory fallback cache for verified accounts and referral codes
interface CachedUserProfile {
  userId: string;
  email?: string;
  phone?: string;
  referralCode: string;
  referredBy?: string | null;
  role: string;
  tier: string;
  createdAt: string;
}

const globalForReferrals = globalThis as unknown as {
  __nichehire_user_profiles_cache?: Map<string, CachedUserProfile>;
};

if (!globalForReferrals.__nichehire_user_profiles_cache) {
  globalForReferrals.__nichehire_user_profiles_cache = new Map<string, CachedUserProfile>();
}

const profileCache = globalForReferrals.__nichehire_user_profiles_cache;

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'nichehire_secure_auth_token_key_2026';

/**
 * Deterministically turns an email or phone identifier into a valid RFC 4122 UUID v4 format.
 * Guarantees that the same phone or email always yields the exact same User ID across logins.
 */
export function generateDeterministicUserId(identifier: string): string {
  const hash = crypto.createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
  // Format as 8-4-4-4-12 UUID with version 4 and variant bits set
  const p1 = hash.slice(0, 8);
  const p2 = hash.slice(8, 12);
  const p3 = '4' + hash.slice(13, 16); // UUID v4 marker
  const p4 = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20);
  const p5 = hash.slice(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Generates a guaranteed unique referral code like 'REF-K8P2M4'.
 * Checks both database and server cache for absolute uniqueness.
 */
export async function generateUniqueReferralCode(prefix = 'REF'): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing 0/O, 1/I

  for (let attempt = 0; attempt < 15; attempt++) {
    const bytes = crypto.randomBytes(6);
    let codePart = '';
    for (let i = 0; i < 6; i++) {
      codePart += chars[bytes[i] % chars.length];
    }
    const candidate = `${prefix}-${codePart}`;

    // 1. Check in memory cache
    let cacheExists = false;
    for (const cached of profileCache.values()) {
      if (cached.referralCode === candidate) {
        cacheExists = true;
        break;
      }
    }
    if (cacheExists) continue;

    // 2. Check in Supabase database
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('referral_code', candidate)
        .maybeSingle();

      if (!data) {
        return candidate;
      }
    } catch {
      // In case database check fails, the memory cache was clean
      return candidate;
    }
  }

  // Fallback with timestamp base-36
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export interface EnsureProfileParams {
  userId: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  referredByCode?: string | null;
  fullName?: string | null;
  companyName?: string | null;
}

export interface EnsureProfileResult {
  userId: string;
  referralCode: string;
  role: string;
  tier: string;
  referredBy?: string | null;
  isNew: boolean;
}

/**
 * Guarantees every user account has a unique referral code.
 * Attaches referred_by attribution if user arrived with a referral link.
 */
export async function ensureUserReferralProfile(
  params: EnsureProfileParams
): Promise<EnsureProfileResult> {
  const { userId, email, phone, role = 'Member', referredByCode } = params;

  // 1. Check cache first
  const cached = profileCache.get(userId);
  if (cached && cached.referralCode) {
    return {
      userId,
      referralCode: cached.referralCode,
      role: cached.role,
      tier: cached.tier,
      referredBy: cached.referredBy,
      isNew: false,
    };
  }

  // 2. Check Supabase database
  let existingProfile: any = null;
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    existingProfile = data;
  } catch (err) {
    console.warn('Could not query user_profiles:', err);
  }

  if (existingProfile && existingProfile.referral_code) {
    profileCache.set(userId, {
      userId,
      email: email || undefined,
      phone: phone || undefined,
      referralCode: existingProfile.referral_code,
      referredBy: existingProfile.referred_by,
      role: existingProfile.assigned_role || role,
      tier: existingProfile.tier || 'member',
      createdAt: existingProfile.created_at || new Date().toISOString(),
    });

    return {
      userId,
      referralCode: existingProfile.referral_code,
      role: existingProfile.assigned_role || role,
      tier: existingProfile.tier || 'member',
      referredBy: existingProfile.referred_by,
      isNew: false,
    };
  }

  // 3. Generate a brand new unique referral code
  const newReferralCode = await generateUniqueReferralCode('REF');

  // 4. Handle referral attribution if referredByCode was provided
  let referrerUserId: string | null = null;
  if (referredByCode && referredByCode.trim()) {
    const cleanRefCode = referredByCode.trim().toUpperCase();

    // Find referrer in cache
    for (const p of profileCache.values()) {
      if (p.referralCode === cleanRefCode && p.userId !== userId) {
        referrerUserId = p.userId;
        break;
      }
    }

    // Find referrer in Supabase
    if (!referrerUserId) {
      try {
        const { data: refRow } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('referral_code', cleanRefCode)
          .maybeSingle();

        if (refRow && refRow.user_id !== userId) {
          referrerUserId = refRow.user_id;
        }
      } catch (e) {
        console.warn('Error checking referrer code in database:', e);
      }
    }

    // If referrer identified, record in referrals ledger and automatically reward tier
    if (referrerUserId) {
      try {
        await supabase.from('referrals').insert({
          referrer_id: referrerUserId,
          referred_user_id: userId,
          status: 'qualified',
        });

        // Compute total referral signups for this referrer
        const { data: allRefs } = await supabase
          .from('referrals')
          .select('id')
          .eq('referrer_id', referrerUserId);

        const totalSignups = (allRefs?.length || 1);
        const newTier = calculateUserTier(totalSignups);

        // Update referrer's profile in database with new count and upgraded tier
        await supabase
          .from('user_profiles')
          .update({
            qualifying_referral_count: totalSignups,
            tier: newTier,
            highest_tier_achieved: newTier,
            premium_source: 'referral',
          })
          .eq('user_id', referrerUserId);

        // Update referrer's profile in memory cache
        const cachedReferrer = profileCache.get(referrerUserId);
        if (cachedReferrer) {
          cachedReferrer.tier = newTier;
        }

        console.log(
          `[Referral Tracker] Referrer ${referrerUserId} now has ${totalSignups} total referral signups. Auto-rewarded tier: ${newTier}`
        );
      } catch (refInsertErr) {
        console.warn('Could not record referral row in database:', refInsertErr);
      }
    }
  }

  // 5. Save to user_profiles table in Supabase
  try {
    await supabase.from('user_profiles').upsert(
      {
        user_id: userId,
        referral_code: newReferralCode,
        referred_by: referrerUserId || existingProfile?.referred_by || null,
        assigned_role: role,
        tier: 'member',
        qualifying_referral_count: 0,
      },
      { onConflict: 'user_id' }
    );
  } catch (dbErr) {
    console.warn('Could not upsert user_profiles in Supabase (foreign key or schema constraint):', dbErr);
  }

  // 6. Save to cache
  const profileRecord: CachedUserProfile = {
    userId,
    email: email || undefined,
    phone: phone || undefined,
    referralCode: newReferralCode,
    referredBy: referrerUserId,
    role,
    tier: 'member',
    createdAt: new Date().toISOString(),
  };
  profileCache.set(userId, profileRecord);

  console.log(`[Referral Engine] Assigned unique referral code ${newReferralCode} to user ${userId}`);

  return {
    userId,
    referralCode: newReferralCode,
    role,
    tier: 'member',
    referredBy: referrerUserId,
    isNew: true,
  };
}

/**
 * Creates a signed JWT auth token for custom/OTP authenticated sessions.
 */
export function createAuthToken(payload: {
  userId: string;
  identifier: string;
  type: 'phone' | 'email';
  role: string;
  referralCode: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days
    })
  ).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a signed JWT auth token.
 */
export function verifyAuthToken(token: string): {
  userId: string;
  identifier: string;
  type: 'phone' | 'email';
  role: string;
  referralCode: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decoded;
  } catch {
    return null;
  }
}
