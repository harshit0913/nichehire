import {
  TierLevel,
  UserPremiumStatus,
  FounderOverride,
  AccessResult,
  PREMIUM_LIMITS,
} from '../types/premium';

/**
 * Universal quota bypass helper.
 * Returns true if the user is the founder or has an explicit unlimited override.
 * Call this across ALL gated routes (tailoring, guidance, HR drafts, resume AI).
 */
export function hasUnlimitedAccess(
  user: Pick<UserPremiumStatus, 'isFounder'>,
  override?: Pick<FounderOverride, 'accessLevel'> | { access_level?: any } | null
): boolean {
  if (user.isFounder === true) return true;
  const level = (override as any)?.accessLevel ?? (override as any)?.access_level;
  if (level === 'unlimited') return true;
  return false;
}

/**
 * Resolves the full access state, tier level, and badge for a user.
 * Explicitly maps founder overrides:
 * - 'unlimited' -> level: 'unlimited', quotaBypass: true, badge: 'referral'
 * - 'premium'   -> level: 'premium',   quotaBypass: false, badge: 'referral'
 * - 'basic'     -> level: 'member',    quotaBypass: false, badge: 'none'
 * - 'revoked'   -> level: 'revoked',   quotaBypass: false, badge: 'none'
 *
 * NOTE: `override` must ALWAYS be sourced server-side from the database/session,
 * NEVER trusted from client-supplied request parameters.
 */
export function resolveAccess(
  user: UserPremiumStatus,
  override?: FounderOverride | { access_level?: any; [key: string]: any } | null
): AccessResult {
  // 1. Founder Account: unconditional unlimited bypass
  if (user.isFounder === true) {
    return {
      level: 'unlimited',
      quotaBypass: true,
      badge: 'founder',
    };
  }

  // 2. Active Founder Override for direct referral
  if (override) {
    const level = (override as any)?.accessLevel ?? (override as any)?.access_level;
    switch (level) {
      case 'unlimited':
        return {
          level: 'unlimited',
          quotaBypass: true,
          badge: 'referral',
        };
      case 'premium':
        return {
          level: 'premium',
          quotaBypass: false,
          badge: 'referral',
        };
      case 'basic':
        // Clean type-safe mapping of 'basic' to standard 'member' tier
        return {
          level: 'member',
          quotaBypass: false,
          badge: 'none',
        };
      case 'revoked':
        return {
          level: 'revoked',
          quotaBypass: false,
          badge: 'none',
        };
    }
  }

  // 3. Fall through to standard tier calculation
  const calculatedTier = calculateUserTier(
    user.qualifyingReferralCount,
    user.subscriptionStatus,
    user.highestTierAchieved
  );

  let badge: AccessResult['badge'] = 'none';
  if (calculatedTier === 'premium') {
    badge = user.subscriptionStatus === 'active' ? 'subscription' : 'earned';
  } else if (calculatedTier === 'trusted' || calculatedTier === 'rising') {
    badge = 'earned';
  }

  return {
    level: calculatedTier,
    quotaBypass: false,
    badge,
  };
}

/**
 * Computes user tier based on qualifying referrals, subscription status, and tier stickiness.
 */
export function calculateUserTier(
  referralCount: number,
  subscriptionStatus?: string | null,
  highestTierAchieved?: TierLevel
): TierLevel {
  const isSubscriptionActive = subscriptionStatus === 'active';

  // Tier 4: Premium (100+ referrals OR active ₹199/mo subscription)
  if (referralCount >= 100 || isSubscriptionActive) {
    return 'premium';
  }

  // Tier 3: Trusted (50+ referrals)
  if (referralCount >= 50 || highestTierAchieved === 'trusted') {
    return 'trusted';
  }

  // Tier 2: Rising (10+ referrals)
  if (referralCount >= 10 || highestTierAchieved === 'rising') {
    return 'rising';
  }

  return 'member';
}

/**
 * Enforces usage limits for cost-bearing features.
 */
export function checkUsageLimit(
  user: Pick<UserPremiumStatus, 'isFounder' | 'tier'>,
  feature: 'tailored_resume' | 'hr_email_draft',
  currentUsage: number,
  override?: Pick<FounderOverride, 'accessLevel'> | { access_level?: any } | null
): { allowed: boolean; remaining: number; quotaBypass: boolean } {
  // Unlimited quota bypass for Founder or unlimited override
  if (hasUnlimitedAccess(user, override)) {
    return { allowed: true, remaining: 9999, quotaBypass: true };
  }

  // Access revoked
  const overrideLevel = (override as any)?.accessLevel ?? (override as any)?.access_level;
  if (overrideLevel === 'revoked') {
    return { allowed: false, remaining: 0, quotaBypass: false };
  }

  const limit =
    feature === 'tailored_resume'
      ? PREMIUM_LIMITS.tailoredResumesPerMonth
      : PREMIUM_LIMITS.hrEmailDraftsPerMonth;

  const remaining = Math.max(0, limit - currentUsage);

  return {
    allowed: remaining > 0,
    remaining,
    quotaBypass: false,
  };
}

/**
 * Returns the anchor date for resetting monthly quotas.
 * - Paying subscribers: subscription renewal anniversary date.
 * - Referral-earned / free users: 1st of current calendar month.
 */
export function getMonthlyResetAnchor(
  premiumSource?: 'referral' | 'subscription' | null,
  subscriptionRenewsAt?: string
): string {
  if (premiumSource === 'subscription' && subscriptionRenewsAt) {
    const renewDate = new Date(subscriptionRenewsAt);
    if (!isNaN(renewDate.getTime())) {
      return renewDate.toISOString().slice(0, 10);
    }
  }

  // Default: Calendar month (YYYY-MM-01)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
