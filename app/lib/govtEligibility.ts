// ─── Government Exam Eligibility Scoring Engine ─────────────────────────────
// Deterministic rule-based evaluation of Age, Degree, Stream, Category Relaxation,
// and Domicile Policies under DoPT and State Commission guidelines.

export type CandidateCategory = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';

export type QualificationLevel = '10th' | '12th' | 'Diploma' | 'Graduate' | 'PostGraduate';

export interface CandidateProfile {
  age?: number;
  category: CandidateCategory;
  qualificationLevel?: QualificationLevel;
  degreeType?: string; // e.g. 'B.Tech', 'B.E.', 'B.Com', 'B.Sc', 'BA', 'LLB', 'MBBS', 'MBA', 'M.Tech', 'Diploma', '10th', '12th'
  stream?: string;     // e.g. 'Computer Science', 'Mechanical', 'Civil', 'Electrical', 'Commerce', 'Law', 'General'
  domicileState?: string;
  isPwD?: boolean;
  isExServicemen?: boolean;
}

export type DomicilePolicy = 'mandatory' | 'quota_partial' | 'open_all_india';

export interface AgeRelaxation {
  obc?: number;           // Standard +3 years
  sc_st?: number;         // Standard +5 years
  pwd?: number;           // Standard +10 years
  ex_servicemen?: number; // Standard +5 years
  hardMaxAgeCap?: number; // Statutory ceiling (e.g. 45) that no relaxation can exceed
  rulesNote?: string;
}

export interface ExamEligibilityCriteria {
  minAge: number;
  maxAge: number;
  ageRelaxation: AgeRelaxation;
  domicilePolicy: DomicilePolicy;
  state?: string;
  minQualificationLevel: QualificationLevel;
  mandatoryDegreeTypes: string[]; // e.g. ['B.Tech', 'B.E.'] or ['Any']
  requiredStreams: string[];      // e.g. ['Computer Science', 'IT'] or ['Any']
}

export interface EligibilityCheckResult {
  status: 'eligible' | 'partially_eligible' | 'ineligible' | 'incomplete_profile';
  score: number; // 0 to 100
  badgeLabel: string;
  isUnderUR: boolean; // Out-of-state candidate evaluated strictly under General/UR rules
  summary: string;
  checks: {
    criterion: string;
    passed: boolean;
    message: string;
    candidateVal?: string;
    requiredVal?: string;
  }[];
}

const QUALIFICATION_RANK: Record<QualificationLevel, number> = {
  '10th': 1,
  '12th': 2,
  'Diploma': 3,
  'Graduate': 4,
  'PostGraduate': 5,
};

/**
 * Calculates candidate eligibility for a government exam.
 * 100% deterministic, zero network calls, zero server telemetry.
 */
export function calculateGovtEligibility(
  candidate: CandidateProfile,
  exam: ExamEligibilityCriteria
): EligibilityCheckResult {
  const checks: EligibilityCheckResult['checks'] = [];

  // Check 1: Incomplete Profile Guard
  if (candidate.age === undefined || !candidate.qualificationLevel) {
    return {
      status: 'incomplete_profile',
      score: 50,
      badgeLabel: 'Profile Incomplete',
      isUnderUR: false,
      summary: 'Add your age and qualification in the profile drawer to view your personalized eligibility match.',
      checks: [
        {
          criterion: 'Profile Completion',
          passed: false,
          message: 'Age or educational qualification is missing in candidate profile.',
        },
      ],
    };
  }

  let isUnderUR = false;
  let hasIneligibleFailure = false;
  let hasPartialWarning = false;

  // ─── 1. Domicile Verification ─────────────────────────────────────────────
  const isStateExam = exam.state && exam.state !== 'All India';
  const isHomeStateCandidate = !isStateExam || (candidate.domicileState && candidate.domicileState.toLowerCase() === exam.state?.toLowerCase());

  if (exam.domicilePolicy === 'mandatory') {
    if (!isHomeStateCandidate) {
      hasIneligibleFailure = true;
      checks.push({
        criterion: 'Domicile Requirement',
        passed: false,
        message: `Restricted strictly to permanent residents of ${exam.state}. Candidate domicile: ${candidate.domicileState || 'Not set'}.`,
        candidateVal: candidate.domicileState || 'Out-of-State',
        requiredVal: `${exam.state} Domicile Only`,
      });
    } else {
      checks.push({
        criterion: 'Domicile Requirement',
        passed: true,
        message: `Home state domicile verified (${exam.state}). Full state reservation quotas apply.`,
        candidateVal: candidate.domicileState || exam.state,
        requiredVal: exam.state,
      });
    }
  } else if (exam.domicilePolicy === 'quota_partial') {
    if (!isHomeStateCandidate) {
      // Out-of-state candidate is eligible under Unreserved (UR) quota only!
      // In Indian public exams, out-of-state candidates do NOT receive home-state category reservations
      isUnderUR = true;
      checks.push({
        criterion: 'Domicile & Quota',
        passed: true,
        message: `Eligible under Open / Unreserved (UR) quota. State category reservations (${candidate.category}) apply only to ${exam.state} residents.`,
        candidateVal: `${candidate.domicileState || 'Out-of-state'} (UR)`,
        requiredVal: `Open to All-India under UR quota`,
      });
    } else {
      checks.push({
        criterion: 'Domicile & Quota',
        passed: true,
        message: `Home state resident (${exam.state}). Eligible for state reservation quota and category concessions.`,
        candidateVal: `${exam.state} (${candidate.category})`,
        requiredVal: `${exam.state} Resident`,
      });
    }
  } else {
    // Open All India (UPSC, SSC, Railways, PSUs)
    checks.push({
      criterion: 'Citizenship / Domicile',
      passed: true,
      message: 'All-India opening. Open to citizens from all states with national reservation rules.',
      candidateVal: candidate.domicileState || 'India',
      requiredVal: 'All India',
    });
  }

  // ─── 2. Age & Category Relaxation Verification ─────────────────────────────
  const baseMinAge = exam.minAge;
  const baseMaxAge = exam.maxAge;

  // Compute allowed category relaxation:
  // If out-of-state candidate on a quota_partial state exam, category relaxation is stripped!
  let categoryRelaxationYears = 0;
  if (!isUnderUR) {
    if (candidate.category === 'OBC' && exam.ageRelaxation.obc) {
      categoryRelaxationYears = Math.max(categoryRelaxationYears, exam.ageRelaxation.obc);
    } else if ((candidate.category === 'SC' || candidate.category === 'ST') && exam.ageRelaxation.sc_st) {
      categoryRelaxationYears = Math.max(categoryRelaxationYears, exam.ageRelaxation.sc_st);
    }
    if (candidate.isPwD && exam.ageRelaxation.pwd) {
      categoryRelaxationYears += exam.ageRelaxation.pwd;
    }
    if (candidate.isExServicemen && exam.ageRelaxation.ex_servicemen) {
      categoryRelaxationYears += exam.ageRelaxation.ex_servicemen;
    }
  }

  let effectiveMaxAge = baseMaxAge + categoryRelaxationYears;

  // Apply statutory hardMaxAgeCap if stipulated (e.g. capped at 45)
  let hardCapTriggered = false;
  if (exam.ageRelaxation.hardMaxAgeCap && effectiveMaxAge > exam.ageRelaxation.hardMaxAgeCap) {
    effectiveMaxAge = exam.ageRelaxation.hardMaxAgeCap;
    hardCapTriggered = true;
  }

  const age = candidate.age;
  if (age < baseMinAge) {
    hasIneligibleFailure = true;
    checks.push({
      criterion: 'Age Limit',
      passed: false,
      message: `Candidate age (${age} yrs) is below minimum required age (${baseMinAge} yrs).`,
      candidateVal: `${age} yrs`,
      requiredVal: `Min ${baseMinAge} yrs`,
    });
  } else if (age > effectiveMaxAge) {
    hasIneligibleFailure = true;
    const relaxationText = isUnderUR
      ? 'Evaluated as General/UR (state category relaxation not applicable to out-of-state candidates).'
      : hardCapTriggered
      ? `Age exceeds statutory hard maximum cap of ${exam.ageRelaxation.hardMaxAgeCap} yrs.`
      : categoryRelaxationYears > 0
      ? `Base max: ${baseMaxAge} yrs + ${categoryRelaxationYears} yrs ${candidate.category} relaxation = ${effectiveMaxAge} yrs.`
      : `Base max: ${baseMaxAge} yrs (no relaxation).`;

    checks.push({
      criterion: 'Age Limit',
      passed: false,
      message: `Candidate age (${age} yrs) exceeds maximum limit of ${effectiveMaxAge} yrs. ${relaxationText}`,
      candidateVal: `${age} yrs`,
      requiredVal: `Max ${effectiveMaxAge} yrs`,
    });
  } else {
    const note = categoryRelaxationYears > 0
      ? `Age ${age} yrs is within relaxed limit of ${effectiveMaxAge} yrs (${baseMaxAge} base + ${categoryRelaxationYears} yrs ${candidate.category}).`
      : isUnderUR
      ? `Age ${age} yrs meets General/UR max limit of ${baseMaxAge} yrs.`
      : `Age ${age} yrs is within standard limits (${baseMinAge}–${baseMaxAge} yrs).`;

    checks.push({
      criterion: 'Age Limit',
      passed: true,
      message: note,
      candidateVal: `${age} yrs`,
      requiredVal: `${baseMinAge}–${effectiveMaxAge} yrs`,
    });
  }

  // ─── 3. Educational Qualification Level ────────────────────────────────────
  const candRank = QUALIFICATION_RANK[candidate.qualificationLevel];
  const reqRank = QUALIFICATION_RANK[exam.minQualificationLevel];

  if (candRank < reqRank) {
    hasIneligibleFailure = true;
    checks.push({
      criterion: 'Educational Level',
      passed: false,
      message: `Candidate qualification (${candidate.qualificationLevel}) does not meet minimum level (${exam.minQualificationLevel}).`,
      candidateVal: candidate.qualificationLevel,
      requiredVal: `Min ${exam.minQualificationLevel}`,
    });
  } else {
    checks.push({
      criterion: 'Educational Level',
      passed: true,
      message: `Candidate meets or exceeds minimum education requirement (${candidate.qualificationLevel} >= ${exam.minQualificationLevel}).`,
      candidateVal: candidate.qualificationLevel,
      requiredVal: `Min ${exam.minQualificationLevel}`,
    });
  }

  // ─── 4. Joint Degree Type Verification ────────────────────────────────────
  const requiresSpecificDegree = !exam.mandatoryDegreeTypes.includes('Any');
  if (requiresSpecificDegree) {
    const candidateDegree = (candidate.degreeType || '').toLowerCase().trim();
    const degreeMatches = exam.mandatoryDegreeTypes.some((deg) => {
      const target = deg.toLowerCase();
      return candidateDegree.includes(target) || (target === 'b.tech' && candidateDegree.includes('btech')) || (target === 'b.e.' && candidateDegree.includes('be'));
    });

    if (!degreeMatches) {
      hasIneligibleFailure = true;
      checks.push({
        criterion: 'Mandatory Degree Type',
        passed: false,
        message: `Requires ${exam.mandatoryDegreeTypes.join(' / ')}. Candidate holds ${candidate.degreeType || candidate.qualificationLevel}. Higher degrees cannot substitute for professional technical credentials.`,
        candidateVal: candidate.degreeType || candidate.qualificationLevel,
        requiredVal: exam.mandatoryDegreeTypes.join(' / '),
      });
    } else {
      checks.push({
        criterion: 'Mandatory Degree Type',
        passed: true,
        message: `Degree credential verified: ${candidate.degreeType}.`,
        candidateVal: candidate.degreeType,
        requiredVal: exam.mandatoryDegreeTypes.join(' / '),
      });
    }
  }

  // ─── 5. Joint Stream / Discipline Verification ────────────────────────────
  const requiresSpecificStream = !exam.requiredStreams.includes('Any');
  if (requiresSpecificStream) {
    const candidateStream = (candidate.stream || '').toLowerCase().trim();
    const streamMatches = exam.requiredStreams.some((stream) => {
      const target = stream.toLowerCase();
      return candidateStream.includes(target) || (target.includes('computer') && candidateStream.includes('it'));
    });

    if (!candidateStream || candidateStream === 'general') {
      hasPartialWarning = true;
      checks.push({
        criterion: 'Stream / Discipline',
        passed: true,
        message: `Role requires specialized stream (${exam.requiredStreams.join(', ')}). Confirm your academic discipline in the official notification.`,
        candidateVal: candidate.stream || 'Unspecified',
        requiredVal: exam.requiredStreams.join(' / '),
      });
    } else if (!streamMatches) {
      hasIneligibleFailure = true;
      checks.push({
        criterion: 'Stream / Discipline',
        passed: false,
        message: `Requires stream in ${exam.requiredStreams.join(' / ')}. Candidate stream is ${candidate.stream}.`,
        candidateVal: candidate.stream,
        requiredVal: exam.requiredStreams.join(' / '),
      });
    } else {
      checks.push({
        criterion: 'Stream / Discipline',
        passed: true,
        message: `Academic stream verified: ${candidate.stream}.`,
        candidateVal: candidate.stream,
        requiredVal: exam.requiredStreams.join(' / '),
      });
    }
  }

  // ─── Final Verdict Calculation ─────────────────────────────────────────────
  if (hasIneligibleFailure) {
    return {
      status: 'ineligible',
      score: 15,
      badgeLabel: 'Ineligible',
      isUnderUR,
      summary: checks.find((c) => !c.passed)?.message || 'Does not meet prescribed statutory eligibility criteria.',
      checks,
    };
  }

  if (hasPartialWarning || isUnderUR) {
    const urNote = isUnderUR ? ' (Eligible under Open / UR Quota)' : '';
    return {
      status: 'partially_eligible',
      score: 75,
      badgeLabel: isUnderUR ? 'Eligible (UR Quota)' : 'Check Stream / Criteria',
      isUnderUR,
      summary: isUnderUR
        ? `Eligible to apply under Open / Unreserved (UR) category. General age limits and application fees apply${urNote}.`
        : 'Meets general qualification and age requirements; verify stream specifics in notification.',
      checks,
    };
  }

  return {
    status: 'eligible',
    score: 100,
    badgeLabel: '100% Eligible',
    isUnderUR: false,
    summary: 'Meets all prescribed age, category relaxation, educational qualification, and domicile criteria.',
    checks,
  };
}
