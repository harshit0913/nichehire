/**
 * QA Regression Test Suite: Search Relevance, Cross-Portal Suggestions,
 * Authentic ICAI Regulations, Strict Tier Ordering, and Authentication OTP
 */

import {
  normalizeSearchInput,
  doesJobMatchQuery,
  rankJobsStrictTierOrder,
  isInherentlyGlobalRole,
} from '../app/lib/searchRankingEngine';
import { detectGovtCrossPortalSuggestion } from '../app/lib/govtCrossPortal';
import {
  VERIFIED_PROFESSIONAL_EXAMS,
  VERIFIED_ARTICLESHIP_OPENINGS,
  evaluateICAIEligibility,
} from '../app/data/professionalExamsData';
import { VERIFIED_GOVT_EXAMS } from '../app/data/govtExamsData';
import {
  normalizeIdentifier,
  generateSecureOtp,
  maskIdentifier,
  otpStore,
} from '../app/lib/otpStore';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 NICHEHIRE QA REGRESSION TEST SUITE');
console.log('================================================================\n');

// ─── TEST 1: SRCH-004 Query Normalization ────────────────────────────────────
console.log('1. Testing SRCH-004: Query Normalization (Underscores, Hyphens, Spaces)');
const q1 = normalizeSearchInput('digital_marketing');
const q2 = normalizeSearchInput('digital marketing');
const q3 = normalizeSearchInput('digital-marketing');
const q4 = normalizeSearchInput('  digital   marketing  ');

assert(q1 === 'digital marketing', 'Underscore converted to space', `Got: "${q1}"`);
assert(q2 === 'digital marketing', 'Regular space query normalized', `Got: "${q2}"`);
assert(q3 === 'digital marketing', 'Hyphen converted to space', `Got: "${q3}"`);
assert(q4 === 'digital marketing', 'Extra whitespace collapsed', `Got: "${q4}"`);
assert(q1 === q2 && q2 === q3 && q3 === q4, 'All variants produce identical normalized query');

// ─── TEST 2: SRCH-007 Nonsense Queries Return Empty State ────────────────────
console.log('\n2. Testing SRCH-007: Gibberish/Nonsense Queries');
const mockCatalog = [
  {
    id: 'job-1',
    title: 'Digital Marketing Manager',
    company: 'GrowthWave Tech',
    location: 'Bengaluru',
    description: 'Lead digital marketing campaigns, SEO, SEM, and performance analytics.',
    workMode: 'Remote',
    geoTier: 5,
  },
  {
    id: 'job-2',
    title: 'Healthcare Sales Executive',
    company: 'CareHealth India',
    location: 'Mumbai',
    description: 'B2B enterprise sales for hospital management software and medical equipment.',
    workMode: 'Remote',
    geoTier: 5,
  },
  {
    id: 'job-3',
    title: 'Solution Architect',
    company: 'CloudMatrix',
    location: 'Hyderabad',
    description: 'Enterprise cloud infrastructure design using AWS and Kubernetes.',
    workMode: 'Remote',
    geoTier: 5,
  },
  {
    id: 'job-4',
    title: 'Care Coordinator',
    company: 'HomeCare Plus',
    location: 'Delhi NCR',
    description: 'Patient care scheduling and clinical nurse dispatch coordination.',
    workMode: 'Remote',
    geoTier: 5,
  },
];

const matchAbcd = mockCatalog.filter((j) => doesJobMatchQuery(j, 'abcd'));
const matchGfguy = mockCatalog.filter((j) => doesJobMatchQuery(j, 'gfguy'));
const rankedAbcd = rankJobsStrictTierOrder(matchAbcd, 'abcd', 'India');

assert(matchAbcd.length === 0, 'Searching "ABCD" returns 0 jobs', `Got: ${matchAbcd.length}`);
assert(matchGfguy.length === 0, 'Searching "gfguy" returns 0 jobs', `Got: ${matchGfguy.length}`);
assert(rankedAbcd.length === 0, 'Ranked result for nonsense query is empty array (triggers empty state)');

// ─── TEST 3: Combined Filters (Keyword + Work Mode) ──────────────────────────
console.log('\n3. Testing Combined Filters: "digital marketing" + "Remote"');
const cleanQueryDm = normalizeSearchInput('digital marketing');

// Strict AND filtering: query match AND workMode match
const filteredCombined = mockCatalog.filter((j) => {
  const matchesQuery = doesJobMatchQuery(j, cleanQueryDm);
  const matchesWorkMode = j.workMode === 'Remote';
  return matchesQuery && matchesWorkMode;
});

assert(filteredCombined.length === 1, 'Only genuine digital marketing role passes combined filter', `Count: ${filteredCombined.length}`);
assert(filteredCombined[0].title === 'Digital Marketing Manager', 'Matched job is Digital Marketing Manager');
assert(!filteredCombined.some((j) => j.title === 'Healthcare Sales Executive'), 'Healthcare Sales Executive excluded');
assert(!filteredCombined.some((j) => j.title === 'Solution Architect'), 'Solution Architect excluded');
assert(!filteredCombined.some((j) => j.title === 'Care Coordinator'), 'Care Coordinator excluded');

// ─── TEST 4: Government Term Leak & Cross-Portal Suggestions ────────────────
console.log('\n4. Testing Government Term Leak & Cross-Portal Suggestions');
const sscMatch = detectGovtCrossPortalSuggestion('SSC CGL');
const upscMatch = detectGovtCrossPortalSuggestion('UPSC');
const mppscMatch = detectGovtCrossPortalSuggestion('MPPSC');
const ibpsMatch = detectGovtCrossPortalSuggestion('IBPS PO');
const privateDevMatch = detectGovtCrossPortalSuggestion('React Developer');

assert(Boolean(sscMatch && sscMatch.isGovtExam), 'SSC CGL recognized as government exam');
assert(Boolean(upscMatch && upscMatch.isGovtExam), 'UPSC recognized as government exam');
assert(Boolean(mppscMatch && mppscMatch.isGovtExam), 'MPPSC recognized as state PSC');
assert(Boolean(ibpsMatch && ibpsMatch.isGovtExam), 'IBPS PO recognized as banking exam');
assert(privateDevMatch === null, 'Private developer role is NOT flagged as government exam');

if (sscMatch) {
  assert(sscMatch.targetUrl.startsWith('/govt-exams'), 'Cross-portal link points to /govt-exams');
}

// ─── TEST 5: CA Articleship Structural Exclusion & Authentic ICAI Regulations
console.log('\n5. Testing Structural Separation of CA Articleship & Authentic ICAI Rules');

// Check that VERIFIED_GOVT_EXAMS has 0 CA Articleship or CA Foundation entries
const caInGovt = VERIFIED_GOVT_EXAMS.filter(
  (e: any) =>
    e.id.includes('icai') ||
    e.title.toLowerCase().includes('chartered accountancy') ||
    e.entityType === 'ArticleshipOpportunity' ||
    e.entityType === 'ProfessionalExam'
);
assert(caInGovt.length === 0, 'VERIFIED_GOVT_EXAMS has 0 ICAI or Articleship entries', `Found: ${caInGovt.length}`);

// Check that professionalExamsData has dedicated structure
assert(VERIFIED_PROFESSIONAL_EXAMS.length >= 3, 'VERIFIED_PROFESSIONAL_EXAMS defines Foundation, Inter, Final');
assert(VERIFIED_ARTICLESHIP_OPENINGS.length >= 4, 'VERIFIED_ARTICLESHIP_OPENINGS defines authentic firms');

// Test ICAI New Scheme (2023+) Eligibility Engine
// Case A: Candidate with Both Intermediate Groups cleared + ICITSS
const eligibleArticleship = evaluateICAIEligibility({
  educationLevel: 'Graduate',
  caStatus: {
    bothIntermediateGroupsCleared: true,
    icitssCompleted: true,
  },
});
assert(eligibleArticleship.isEligibleForArticleship === true, 'Candidate with Both Groups + ICITSS is eligible for Articleship');
assert(eligibleArticleship.articleshipDurationYears === 2, 'Articleship duration is exactly 2 years under New Scheme (2023+)');

// Case B: Direct Entry Commerce Graduate (>= 55%)
const directEntryGrad = evaluateICAIEligibility({
  educationLevel: 'Graduate',
  degrees: [{ degree: 'B.Com (Honours)', percentage: 68 }],
});
assert(directEntryGrad.isEligibleForDirectEntryIntermediate === true, 'Commerce graduate with 68% is eligible for Direct Entry');
assert(directEntryGrad.isEligibleForArticleship === false, 'Direct entry student cannot start articleship until passing Both Groups');

// Case C: 12th Standard Student
const schoolStudent = evaluateICAIEligibility({
  educationLevel: '12th',
});
assert(schoolStudent.isEligibleForFoundation === true, 'Class 12 student is eligible for CA Foundation');

// ─── TEST 6: Strict Tiered Ordering & Inherently Global Exception ─────────────
console.log('\n6. Testing Strict Tiered Ordering & Global Sector Exceptions');

const mixedLocationJobs = [
  { id: 'j-nat', title: 'Senior Accounts Officer', location: 'India-wide Remote', geoTier: 5, postedAt: 500 },
  { id: 'j-state', title: 'Accounts Executive', location: 'Bhopal, MP', geoTier: 4, postedAt: 600 },
  { id: 'j-intl', title: 'Global Controller', location: 'London, UK', geoTier: 6, postedAt: 700 },
  { id: 'j-local', title: 'Chartered Accountant', location: 'Indore', geoTier: 1, postedAt: 800 },
  { id: 'j-hub', title: 'Finance Associate', location: 'Ujjain (Indore Cluster)', geoTier: 2, postedAt: 900 },
];

const rankedRegular = rankJobsStrictTierOrder(mixedLocationJobs, 'account', 'Indore');

// Verify strictly ascending order of tiers: 1 -> 2 -> 4 -> 5 -> 6
const tiersInOrder = rankedRegular.map((j) => j.geoTier);
let isStrictlyAscending = true;
for (let i = 1; i < tiersInOrder.length; i++) {
  if (tiersInOrder[i] < tiersInOrder[i - 1]) {
    isStrictlyAscending = false;
    break;
  }
}
assert(isStrictlyAscending, 'Jobs are arranged in strictly non-decreasing geographic tier order', `Tiers: ${tiersInOrder.join(', ')}`);
assert(rankedRegular[0].id === 'j-local', 'Tier 1 (Indore) is first');
assert(rankedRegular[1].id === 'j-hub', 'Tier 2 (Ujjain) is second');
assert(rankedRegular[rankedRegular.length - 1].id === 'j-intl', 'Tier 6 (London) is at the very end');

// Test Inherently Global Sector Flags
assert(isInherentlyGlobalRole('petroleum engineer') === true, 'Petroleum Engineer is inherently global');
assert(isInherentlyGlobalRole('subsea drilling engineer') === true, 'Subsea Drilling Engineer is inherently global');
assert(isInherentlyGlobalRole('marine engineer') === true, 'Marine Engineer is inherently global');
assert(isInherentlyGlobalRole('commercial pilot') === false, 'Pilot without avionics/aerospace not matching');
assert(isInherentlyGlobalRole('software engineer') === false, 'Software Engineer is NOT inherently global');
assert(isInherentlyGlobalRole('digital marketing') === false, 'Digital Marketing is NOT inherently global');

// ─── TEST 7: OTP Security, Normalization & Rate Limiting ──────────────────────
console.log('\n7. Testing OTP Security, Masking & Normalization');

const normPhone = normalizeIdentifier('9876543210');
assert(normPhone.isValid && normPhone.identifier === '+919876543210', 'Phone normalized to +91');

const normEmail = normalizeIdentifier('Candidate@Gmail.COM');
assert(normEmail.isValid && normEmail.identifier === 'candidate@gmail.com', 'Email normalized to lowercase');

const maskedPhone = maskIdentifier(normPhone.identifier, 'phone');
assert(maskedPhone.includes('3210'), 'Masked phone shows last 4 digits');

const otp1 = generateSecureOtp();
const otp2 = generateSecureOtp();
assert(/^\d{6}$/.test(otp1), 'Generated OTP is exactly 6 digits');
assert(/^\d{6}$/.test(otp2), 'Second OTP is exactly 6 digits');

console.log('\n================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
