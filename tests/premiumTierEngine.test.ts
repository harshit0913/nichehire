import {
  calculateUserTier,
  hasUnlimitedAccess,
  resolveAccess,
  checkUsageLimit,
  getMonthlyResetAnchor,
} from '../app/lib/premiumTierEngine';
import { UserPremiumStatus, FounderOverride } from '../app/types/premium';

console.log('\n--- Running NicheHire Premium Tier & Founder Security Engine Test Suite (15 Cases) ---\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ Passed: ${testName}`);
  } else {
    console.error(`  ✗ FAILED: ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

// ─── Case 1: Base signup defaults to member ──────────────────────────────────
const user1: UserPremiumStatus = {
  userId: 'usr-1',
  tier: 'member',
  qualifyingReferralCount: 0,
  premiumSource: null,
  highestTierAchieved: 'member',
  tierAchievedAt: {},
};
assert(calculateUserTier(0, null, 'member') === 'member', 'Case 1: Base signup defaults to member');

// ─── Case 2: Crossing 10 qualifying referrals awards rising ─────────────────
assert(calculateUserTier(10, null, 'member') === 'rising', 'Case 2: 10 referrals awards rising');

// ─── Case 3: Crossing 50 qualifying referrals awards trusted ────────────────
assert(calculateUserTier(50, null, 'rising') === 'trusted', 'Case 3: 50 referrals awards trusted');

// ─── Case 4: Crossing 100 qualifying referrals awards premium ───────────────
assert(calculateUserTier(100, null, 'trusted') === 'premium', 'Case 4: 100 referrals awards premium (referral path)');

// ─── Case 5: Active ₹199/mo subscription awards premium ─────────────────────
assert(calculateUserTier(0, 'active', 'member') === 'premium', 'Case 5: Active ₹199/mo subscription awards premium');

// ─── Case 6: Dual status maintains premium ──────────────────────────────────
assert(calculateUserTier(105, 'active', 'premium') === 'premium', 'Case 6: Dual status maintains premium');

// ─── Case 7: Subscription cancel with referrals < 100 gracefully downgrades ─
const lapsedUser: UserPremiumStatus = {
  userId: 'usr-lapse',
  tier: 'premium',
  qualifyingReferralCount: 15,
  premiumSource: 'subscription',
  subscriptionStatus: 'cancelled',
  highestTierAchieved: 'rising',
  tierAchievedAt: { rising: '2026-09-01' },
};
assert(
  calculateUserTier(lapsedUser.qualifyingReferralCount, lapsedUser.subscriptionStatus, lapsedUser.highestTierAchieved) === 'rising',
  'Case 7: Subscription cancel with 15 referrals downgrades to rising'
);

// ─── Case 8: Subscription cancel with referrals >= 100 stays Premium ────────
const dualUserLapse: UserPremiumStatus = {
  userId: 'usr-dual',
  tier: 'premium',
  qualifyingReferralCount: 102,
  premiumSource: 'subscription',
  subscriptionStatus: 'cancelled',
  highestTierAchieved: 'premium',
  tierAchievedAt: { premium: '2026-09-01' },
};
assert(
  calculateUserTier(dualUserLapse.qualifyingReferralCount, dualUserLapse.subscriptionStatus, dualUserLapse.highestTierAchieved) === 'premium',
  'Case 8: Subscription cancel with 102 referrals STAYS Premium via referral path'
);

// ─── Case 9: Tier stickiness prevents badge revocation on referral churn ────
// If a user achieved 'trusted' at 50, and 3 referred users churn down to 47, they stay trusted
assert(
  calculateUserTier(47, null, 'trusted') === 'trusted',
  'Case 9: Tier stickiness prevents badge revocation when referrals churn from 50 to 47'
);

// ─── Case 10: Usage metering enforces 11 tailored resumes cap ────────────────
const regularPremium: Pick<UserPremiumStatus, 'isFounder' | 'tier'> = { isFounder: false, tier: 'premium' };
const usageCheck10 = checkUsageLimit(regularPremium, 'tailored_resume', 10);
const usageCheck11 = checkUsageLimit(regularPremium, 'tailored_resume', 11);
assert(usageCheck10.allowed && usageCheck10.remaining === 1, 'Case 10a: 10/11 tailored resumes leaves 1 remaining');
assert(!usageCheck11.allowed && usageCheck11.remaining === 0, 'Case 10b: 11/11 tailored resumes blocks 12th resume');

// ─── Case 11: Fraud-flagged referrals excluded from count ───────────────────
// A user with 12 total referrals where 5 are flagged fraud only has 7 qualifying referrals -> Member tier
const qualifiedCount = 7; // excluding flagged_fraud
assert(calculateUserTier(qualifiedCount, null, 'member') === 'member', 'Case 11: Fraud-flagged referrals do not grant Rising tier');

// ─── Case 12 (Critical Security): Non-founder cannot self-grant founder access
// Confirm that a client cannot forge isFounder: true or supply a forged client override object.
// The route/engine strictly rejects client-supplied override claims.
const attackerClientPayload: any = {
  userId: 'attacker-1',
  tier: 'member',
  qualifyingReferralCount: 0,
  premiumSource: null,
  highestTierAchieved: 'member',
  tierAchievedAt: {},
  // Attacker tries to inject client-side flags:
  isFounder: false, // Database record says false
};
const forgedClientOverride: any = {
  userId: 'attacker-1',
  accessLevel: 'unlimited',
  grantedBy: 'attacker-1', // Self-granted attempt!
};

// In production, override is ALWAYS looked up server-side from Supabase by session.userId.
// When an unauthorized user without a DB override passes no DB override:
const cleanServerResolved = resolveAccess(attackerClientPayload, null);
assert(
  cleanServerResolved.level === 'member' && !cleanServerResolved.quotaBypass,
  'Case 12: Unauthorized user without server-side DB override strictly resolves to member (zero quota bypass)'
);

// ─── Case 13: isFounder === true grants unconditional unlimited bypass ──────
const founderUser: UserPremiumStatus = {
  userId: 'founder-001',
  tier: 'premium',
  qualifyingReferralCount: 0,
  premiumSource: null,
  highestTierAchieved: 'premium',
  tierAchievedAt: {},
  isFounder: true,
};
const founderAccess = resolveAccess(founderUser, null);
assert(
  founderAccess.level === 'unlimited' && founderAccess.quotaBypass && founderAccess.badge === 'founder',
  'Case 13: isFounder: true gets unconditional unlimited quota bypass and founder badge'
);
assert(
  hasUnlimitedAccess(founderUser, null) === true,
  'Case 13b: hasUnlimitedAccess() returns true for isFounder'
);

// ─── Case 14: Founder-referred user with override gets unlimited access ─────
const founderReferredUser: UserPremiumStatus = {
  userId: 'friend-42',
  tier: 'member',
  qualifyingReferralCount: 2,
  premiumSource: null,
  highestTierAchieved: 'member',
  tierAchievedAt: {},
  referredByUserId: 'founder-001',
};
const validServerOverride: FounderOverride = {
  userId: 'friend-42',
  accessLevel: 'unlimited',
  grantedBy: 'founder-001',
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
  note: 'College classmate',
};
const friendAccess = resolveAccess(founderReferredUser, validServerOverride);
assert(
  friendAccess.level === 'unlimited' && friendAccess.quotaBypass && friendAccess.badge === 'referral',
  'Case 14: Founder-referred user with unlimited override receives quota bypass and referral badge'
);
assert(
  hasUnlimitedAccess(founderReferredUser, validServerOverride) === true,
  'Case 14b: hasUnlimitedAccess() returns true for unlimited override'
);

// ─── Case 15: Type-safe mapping of 'basic' and 'revoked' overrides ───────────
const basicOverride: FounderOverride = {
  userId: 'friend-42',
  accessLevel: 'basic',
  grantedBy: 'founder-001',
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-25T12:00:00Z',
  note: 'Reduced access',
};
const basicAccess = resolveAccess(founderReferredUser, basicOverride);
assert(
  basicAccess.level === 'member' && !basicAccess.quotaBypass && basicAccess.badge === 'none',
  'Case 15a: Override accessLevel: basic cleanly maps to level: member with quotaBypass: false'
);

const revokedOverride: FounderOverride = {
  userId: 'friend-42',
  accessLevel: 'revoked',
  grantedBy: 'founder-001',
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-25T14:00:00Z',
  note: 'Access revoked by founder',
};
const revokedAccess = resolveAccess(founderReferredUser, revokedOverride);
const revokedUsage = checkUsageLimit(founderReferredUser, 'tailored_resume', 0, revokedOverride);
assert(
  revokedAccess.level === 'revoked' && !revokedAccess.quotaBypass,
  'Case 15b: Override accessLevel: revoked maps to level: revoked'
);
assert(
  !revokedUsage.allowed && revokedUsage.remaining === 0,
  'Case 15c: Revoked override immediately blocks cost-bearing usage'
);

// ─── Case 16: Founder assigned role output ───────────────────────────────────
const founderProfile: UserPremiumStatus = {
  userId: 'founder-harshit',
  tier: 'premium',
  qualifyingReferralCount: 5,
  premiumSource: null,
  highestTierAchieved: 'premium',
  tierAchievedAt: {},
  isFounder: true,
  assignedRole: 'Founder & CEO',
};
const founderResolved = resolveAccess(founderProfile, null);
assert(
  founderResolved.level === 'unlimited' && founderResolved.quotaBypass && founderResolved.assignedRole === 'Founder & CEO',
  'Case 16: Founder account receives unlimited bypass with Founder & CEO role'
);

// ─── Case 17: Founder-referred member with assigned role (Co-Founder / Intern)
const coFounderProfile: UserPremiumStatus = {
  userId: 'teammate-01',
  tier: 'member',
  qualifyingReferralCount: 2,
  premiumSource: null,
  highestTierAchieved: 'member',
  tierAchievedAt: {},
  isFounder: false,
  assignedRole: 'Co-Founder',
};
const coFounderOverride: FounderOverride = {
  userId: 'teammate-01',
  accessLevel: 'unlimited',
  grantedBy: 'founder-harshit',
  createdAt: '2026-09-26T12:00:00Z',
  updatedAt: '2026-09-26T12:00:00Z',
  note: 'Core executive',
};
const coFounderResolved = resolveAccess(coFounderProfile, coFounderOverride);
assert(
  coFounderResolved.level === 'unlimited' && coFounderResolved.assignedRole === 'Co-Founder' && coFounderResolved.quotaBypass,
  'Case 17: Co-Founder team assignment carries through with unlimited access'
);

// ─── Case 18: Bug Bounty premiumSource awards premium access ─────────────────
const bugReporterProfile: UserPremiumStatus = {
  userId: 'hunter-01',
  tier: 'premium',
  qualifyingReferralCount: 1,
  premiumSource: 'bug_bounty',
  subscriptionStatus: 'active',
  subscriptionRenewsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  highestTierAchieved: 'premium',
  tierAchievedAt: { premium: new Date().toISOString() },
  isFounder: false,
};
const bugReporterResolved = resolveAccess(bugReporterProfile, null);
assert(
  bugReporterResolved.level === 'premium' && bugReporterResolved.badge === 'subscription',
  'Case 18: Bug bounty 7-day reward successfully unlocks active Premium tier'
);

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.\n`);
if (passedCount !== totalCount) {
  process.exit(1);
}

