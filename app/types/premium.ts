export type TierLevel = 'member' | 'rising' | 'trusted' | 'premium';

export interface UserPremiumStatus {
  userId: string;
  tier: TierLevel;
  qualifyingReferralCount: number;
  premiumSource: 'referral' | 'subscription' | null;
  subscriptionStatus?: 'active' | 'cancelled' | 'past_due' | null;
  subscriptionRenewsAt?: string; // ISO date
  tierAchievedAt: {
    rising?: string;
    trusted?: string;
    premium?: string;
  };
  highestTierAchieved: TierLevel;
  isFounder?: boolean;          // Set strictly via database/admin action
  referredByUserId?: string;
}

export interface FounderOverride {
  userId: string;
  accessLevel: 'unlimited' | 'premium' | 'basic' | 'revoked';
  grantedBy: string;           // Founder's userId
  createdAt: string;
  updatedAt: string;
  note?: string;
}

export interface AccessResult {
  level: 'unlimited' | 'premium' | 'trusted' | 'rising' | 'member' | 'revoked';
  quotaBypass: boolean;
  badge: 'founder' | 'referral' | 'subscription' | 'earned' | 'none';
}

export interface PremiumUsage {
  userId: string;
  periodStart: string; // ISO date, resets monthly
  tailoredResumeCount: number;
  hrEmailDraftCount: number;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: 'provisional' | 'qualified' | 'flagged_fraud';
  createdAt: string;
  qualifiedAt?: string;
  deviceFingerprintHash?: string;
}

export const PREMIUM_LIMITS = {
  tailoredResumesPerMonth: 11,
  hrEmailDraftsPerMonth: 20,
};
