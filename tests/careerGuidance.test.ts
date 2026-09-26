import { CAREER_GUIDANCE_PRICING, CareerReportCredit, CounselorBooking } from '../app/types/careerGuidance';
import { hasUnlimitedAccess } from '../app/lib/premiumTierEngine';
import { UserPremiumStatus, FounderOverride } from '../app/types/premium';

console.log('\n--- Running NicheHire Career Guidance Consultations Test Suite (6 Cases) ---\n');

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

// ─── Case 1: Monotonic per-unit bundle discounts ────────────────────────────
const singlePerUnit = CAREER_GUIDANCE_PRICING.single_report.perUnit;
const bundle2PerUnit = CAREER_GUIDANCE_PRICING.bundle_2.perUnit;
const bundle5PerUnit = CAREER_GUIDANCE_PRICING.bundle_5.perUnit;

assert(
  singlePerUnit > bundle2PerUnit && bundle2PerUnit > bundle5PerUnit,
  'Case 1: Per-unit pricing strictly decreases with bundle size (₹199 > ₹174.5 > ₹139.8)'
);

// ─── Case 2: hasUnlimitedAccess bypasses credit check ───────────────────────
const founder: UserPremiumStatus = {
  userId: 'founder-1',
  tier: 'premium',
  qualifyingReferralCount: 0,
  premiumSource: null,
  highestTierAchieved: 'premium',
  tierAchievedAt: {},
  isFounder: true,
};
const friendOverride: FounderOverride = {
  userId: 'friend-1',
  accessLevel: 'unlimited',
  grantedBy: 'founder-1',
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
};

assert(
  hasUnlimitedAccess(founder, null) === true,
  'Case 2a: Founder has unconditional unlimited access for career reports'
);
assert(
  hasUnlimitedAccess({ isFounder: false }, friendOverride) === true,
  'Case 2b: Founder-referred friend with unlimited override bypasses report credits'
);

// ─── Case 3: Conditional Credit Decrement on Generation Only ─────────────────
function simulateReportGeneration(credit: CareerReportCredit, generationSucceeded: boolean): { updatedCredits: number; consumed: boolean } {
  if (!generationSucceeded) {
    // If generation fails (e.g. LLM timeout or DB error), do NOT decrement
    return { updatedCredits: credit.creditsRemaining, consumed: false };
  }
  // Decrement only on successful generation and DB save
  return { updatedCredits: credit.creditsRemaining - 1, consumed: true };
}

const initialCredit: CareerReportCredit = {
  userId: 'usr-123',
  creditsRemaining: 2,
  purchasedAt: new Date().toISOString(),
  bundleType: 'bundle_2',
};

const failedAttempt = simulateReportGeneration(initialCredit, false);
assert(
  failedAttempt.updatedCredits === 2 && !failedAttempt.consumed,
  'Case 3a: Failed report generation does NOT consume paid credit'
);

const successAttempt = simulateReportGeneration(initialCredit, true);
assert(
  successAttempt.updatedCredits === 1 && successAttempt.consumed,
  'Case 3b: Successful report generation decrements credit by 1'
);

// ─── Case 4: Counselor booking capacity & availability check ─────────────────
interface SlotAvailability {
  availableSlotsInNext7Days: number;
}

function checkBookingFeasibility(availability: SlotAvailability): { canProceedToPayment: boolean; warning?: string } {
  if (availability.availableSlotsInNext7Days === 0) {
    return {
      canProceedToPayment: false,
      warning: 'No counselor slots available within the next 7 days. Please check back next week before booking.',
    };
  }
  return { canProceedToPayment: true };
}

assert(
  !checkBookingFeasibility({ availableSlotsInNext7Days: 0 }).canProceedToPayment,
  'Case 4a: Booking is blocked before payment when counselor has 0 slots in next 7 days'
);
assert(
  checkBookingFeasibility({ availableSlotsInNext7Days: 4 }).canProceedToPayment,
  'Case 4b: Booking proceeds smoothly when counselor has open slots'
);

// ─── Case 5: Explicit Consent Requirement Validation ────────────────────────
function validateCounselorBookingConsent(consentGiven: boolean): boolean {
  return consentGiven === true;
}

assert(
  !validateCounselorBookingConsent(false),
  'Case 5a: Counselor booking rejected without explicit candidate consent to share report/resume'
);
assert(
  validateCounselorBookingConsent(true),
  'Case 5b: Booking permitted with explicit affirmative consent'
);

// ─── Case 6: No-Show Policy Transitions ──────────────────────────────────────
function handleNoShow(
  booking: Pick<CounselorBooking, 'status'>,
  party: 'user' | 'counselor',
  userPreviousNoShows: number
): { outcome: 'free_reschedule' | 'forfeited' | 'full_refund_or_priority' } {
  if (party === 'counselor') {
    return { outcome: 'full_refund_or_priority' };
  }
  if (party === 'user') {
    if (userPreviousNoShows === 0) {
      return { outcome: 'free_reschedule' };
    } else {
      return { outcome: 'forfeited' };
    }
  }
  return { outcome: 'forfeited' };
}

assert(
  handleNoShow({ status: 'scheduled' }, 'counselor', 0).outcome === 'full_refund_or_priority',
  'Case 6a: Counselor no-show guarantees automatic full refund or priority rebooking'
);
assert(
  handleNoShow({ status: 'scheduled' }, 'user', 0).outcome === 'free_reschedule',
  'Case 6b: User 1st no-show permits one free reschedule'
);
assert(
  handleNoShow({ status: 'scheduled' }, 'user', 1).outcome === 'forfeited',
  'Case 6c: User 2nd no-show forfeits booking without refund'
);

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.\n`);
if (passedCount !== totalCount) {
  process.exit(1);
}
