export type TierLevel = 'member' | 'rising' | 'trusted' | 'premium';

export interface UserPremiumStatus {
  userId: string;
  tier: TierLevel;
  qualifyingReferralCount: number;
  premiumSource: 'referral' | 'subscription' | 'bug_bounty' | null;
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
  assignedRole?: string;
  assignedRoleBy?: string;
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
  assignedRole?: string;
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

export const TIER_LIMITS: Record<TierLevel, { tailoredResumes: number; hrEmailDrafts: number }> = {
  member: { tailoredResumes: 3, hrEmailDrafts: 5 },
  rising: { tailoredResumes: 11, hrEmailDrafts: 20 },
  trusted: { tailoredResumes: 20, hrEmailDrafts: 35 },
  premium: { tailoredResumes: 50, hrEmailDrafts: 100 },
};

export const PREMIUM_LIMITS = {
  tailoredResumesPerMonth: 11,
  hrEmailDraftsPerMonth: 20,
};
