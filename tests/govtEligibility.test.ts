// ─── Automated Test Suite: Govt Exam Eligibility Engine ─────────────────────
import {
  calculateGovtEligibility,
  CandidateProfile,
  ExamEligibilityCriteria,
} from '../app/lib/govtEligibility';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ Passed: ${testName}`);
  } else {
    console.error(`  ✕ FAILED: ${testName}`);
    if (failureDetails) console.error(`    Details: ${failureDetails}`);
  }
}

console.log('\n--- Running Govt Exam Eligibility Engine Test Suite (10 Cases) ---\n');

// Standard Base Central Exam (e.g. UPSC / SSC CGL)
const BASE_CENTRAL_EXAM: ExamEligibilityCriteria = {
  minAge: 21,
  maxAge: 30,
  ageRelaxation: { obc: 3, sc_st: 5, pwd: 10, ex_servicemen: 5 },
  domicilePolicy: 'open_all_india',
  minQualificationLevel: 'Graduate',
  mandatoryDegreeTypes: ['Any'],
  requiredStreams: ['Any'],
};

// 1. Age Over Limit (General)
{
  const candidate: CandidateProfile = {
    age: 33,
    category: 'General',
    qualificationLevel: 'Graduate',
    degreeType: 'B.Sc',
  };
  const res = calculateGovtEligibility(candidate, BASE_CENTRAL_EXAM);
  assert(res.status === 'ineligible', 'Case 1: General candidate age 33 (>30) is ineligible');
  assert(res.score === 15, 'Case 1 score is 15');
}

// 2. Category Relaxation (OBC)
{
  const candidate: CandidateProfile = {
    age: 33,
    category: 'OBC',
    qualificationLevel: 'Graduate',
    degreeType: 'B.Sc',
  };
  const res = calculateGovtEligibility(candidate, BASE_CENTRAL_EXAM);
  assert(res.status === 'eligible', 'Case 2: OBC candidate age 33 (<= 30+3) is 100% eligible');
}

// 3. Category Relaxation (SC/ST)
{
  const candidate: CandidateProfile = {
    age: 35,
    category: 'SC',
    qualificationLevel: 'Graduate',
    degreeType: 'B.Sc',
  };
  const res = calculateGovtEligibility(candidate, BASE_CENTRAL_EXAM);
  assert(res.status === 'eligible', 'Case 3: SC candidate age 35 (<= 30+5) is 100% eligible');
}

// 4. Hard Age Cap Enforcement (base 35, PwD+10 = 45, but hardMaxAgeCap = 42)
{
  const examWithHardCap: ExamEligibilityCriteria = {
    minAge: 21,
    maxAge: 35,
    ageRelaxation: { sc_st: 5, pwd: 10, hardMaxAgeCap: 42 },
    domicilePolicy: 'open_all_india',
    minQualificationLevel: 'Graduate',
    mandatoryDegreeTypes: ['Any'],
    requiredStreams: ['Any'],
  };
  const candidate: CandidateProfile = {
    age: 43,
    category: 'General',
    isPwD: true,
    qualificationLevel: 'Graduate',
  };
  const res = calculateGovtEligibility(candidate, examWithHardCap);
  assert(
    res.status === 'ineligible',
    'Case 4: Age 43 exceeds statutory hardMaxAgeCap of 42 despite PwD relaxation'
  );
}

// 5. Home-State Candidate on Quota Partial (MPPSC)
{
  const mppscExam: ExamEligibilityCriteria = {
    minAge: 21,
    maxAge: 33,
    state: 'Madhya Pradesh',
    domicilePolicy: 'quota_partial',
    ageRelaxation: { obc: 5, sc_st: 5 },
    minQualificationLevel: 'Graduate',
    mandatoryDegreeTypes: ['Any'],
    requiredStreams: ['Any'],
  };
  const mpCandidate: CandidateProfile = {
    age: 36,
    category: 'OBC',
    domicileState: 'Madhya Pradesh',
    qualificationLevel: 'Graduate',
  };
  const res = calculateGovtEligibility(mpCandidate, mppscExam);
  assert(
    res.status === 'eligible' && !res.isUnderUR,
    'Case 5: Home-state MP resident receives full OBC state relaxation (36 <= 33+5)'
  );
}

// 6. Out-of-State Candidate on Quota Partial (MPPSC): Strips relaxation & evaluates under UR
{
  const mppscExam: ExamEligibilityCriteria = {
    minAge: 21,
    maxAge: 33,
    state: 'Madhya Pradesh',
    domicilePolicy: 'quota_partial',
    ageRelaxation: { obc: 5, sc_st: 5 },
    minQualificationLevel: 'Graduate',
    mandatoryDegreeTypes: ['Any'],
    requiredStreams: ['Any'],
  };
  // Out-of-state candidate aged 36 (exceeds general max of 33, but within OBC 33+5)
  const outOfStateOBC: CandidateProfile = {
    age: 36,
    category: 'OBC',
    domicileState: 'Maharashtra',
    qualificationLevel: 'Graduate',
  };
  const res1 = calculateGovtEligibility(outOfStateOBC, mppscExam);
  assert(
    res1.status === 'ineligible' && res1.isUnderUR,
    'Case 6a: Out-of-state OBC candidate aged 36 is ineligible because state category relaxation is stripped under UR'
  );

  // Out-of-state candidate within general age limit (age 28 <= 33)
  const outOfStateYoung: CandidateProfile = {
    age: 28,
    category: 'OBC',
    domicileState: 'Maharashtra',
    qualificationLevel: 'Graduate',
  };
  const res2 = calculateGovtEligibility(outOfStateYoung, mppscExam);
  assert(
    res2.status === 'partially_eligible' && res2.isUnderUR && res2.badgeLabel === 'Eligible (UR Quota)',
    'Case 6b: Out-of-state candidate within general age limit is eligible under Unreserved (UR) quota'
  );
}

// 7. Out-of-State Candidate on Mandatory Domicile (District Post)
{
  const districtPost: ExamEligibilityCriteria = {
    minAge: 18,
    maxAge: 40,
    state: 'Madhya Pradesh',
    domicilePolicy: 'mandatory',
    ageRelaxation: { obc: 3, sc_st: 5 },
    minQualificationLevel: '12th',
    mandatoryDegreeTypes: ['Any'],
    requiredStreams: ['Any'],
  };
  const upCandidate: CandidateProfile = {
    age: 24,
    category: 'General',
    domicileState: 'Uttar Pradesh',
    qualificationLevel: '12th',
  };
  const res = calculateGovtEligibility(upCandidate, districtPost);
  assert(
    res.status === 'ineligible',
    'Case 7: Out-of-state candidate is ineligible for mandatory state-only post'
  );
}

// 8. Degree Level Succeeded, Degree Type Failed (M.Com applying for B.Tech JE)
{
  const btechPost: ExamEligibilityCriteria = {
    minAge: 21,
    maxAge: 30,
    ageRelaxation: {},
    domicilePolicy: 'open_all_india',
    minQualificationLevel: 'Graduate',
    mandatoryDegreeTypes: ['B.Tech', 'B.E.'],
    requiredStreams: ['Mechanical'],
  };
  const candidateWithMCom: CandidateProfile = {
    age: 25,
    category: 'General',
    qualificationLevel: 'PostGraduate', // Level is higher!
    degreeType: 'M.Com',               // But type is not engineering!
    stream: 'Commerce',
  };
  const res = calculateGovtEligibility(candidateWithMCom, btechPost);
  assert(
    res.status === 'ineligible',
    'Case 8: Higher degree (M.Com) cannot substitute for mandatory B.Tech degree requirement'
  );
}

// 9. Stream Mismatch (B.Tech Civil applying for Computer Science / IT Scientist)
{
  const csScientistPost: ExamEligibilityCriteria = {
    minAge: 21,
    maxAge: 28,
    ageRelaxation: {},
    domicilePolicy: 'open_all_india',
    minQualificationLevel: 'Graduate',
    mandatoryDegreeTypes: ['B.Tech', 'B.E.'],
    requiredStreams: ['Computer Science', 'IT'],
  };
  const civilEngineer: CandidateProfile = {
    age: 24,
    category: 'General',
    qualificationLevel: 'Graduate',
    degreeType: 'B.Tech',
    stream: 'Civil Engineering',
  };
  const res = calculateGovtEligibility(civilEngineer, csScientistPost);
  assert(
    res.status === 'ineligible',
    'Case 9: B.Tech in Civil is ineligible for Computer Science / IT specialized role'
  );
}

// 10. Incomplete Profile Handling
{
  const incompleteCandidate: CandidateProfile = {
    category: 'General',
    // Missing age and qualification
  };
  const res = calculateGovtEligibility(incompleteCandidate, BASE_CENTRAL_EXAM);
  assert(
    res.status === 'incomplete_profile',
    'Case 10: Incomplete candidate profile returns incomplete_profile gracefully without throwing'
  );
}

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.\n`);

if (passedCount !== totalCount) {
  process.exit(1);
}
