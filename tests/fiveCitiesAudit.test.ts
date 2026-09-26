import { resolvePanIndiaLocation, calculatePanIndiaGeoTier } from '../app/lib/panIndiaGeo';
import { detectJobDiscipline, evaluateDegreeAlignment, suggestRelevantMissingSkills } from '../app/lib/skillsTaxonomy';

console.log('================================================================');
console.log('AUDIT: 5 STUDENTS ACROSS 5 DIVERSE INDIAN STATES & DISCIPLINES');
console.log('(Only 1 Tech Candidate, 4 Non-Tech Degrees: Arts, Med, Law, CMA)');
console.log('================================================================\n');

interface StudentAuditProfile {
  id: number;
  name: string;
  city: string;
  state: string;
  stream: string;
  degrees: Array<{ degree: string; institution: string }>;
  candidateSkills: string[];
  targetJob: {
    title: string;
    company: string;
    location: string;
    description: string;
  };
}

const auditCohort: StudentAuditProfile[] = [
  // ─── 1. ARTS / JOURNALISM (Odisha) ──────────────────────────────────────────
  {
    id: 1,
    name: 'Ananya Pattnayak',
    city: 'Cuttack',
    state: 'Odisha',
    stream: 'Arts & Media (B.A. Mass Comm & Journalism)',
    degrees: [
      { degree: 'B.A. in Mass Communication & Journalism', institution: 'Ravenshaw University, Cuttack' },
    ],
    candidateSkills: [
      'Content Writing',
      'Editorial Journalism',
      'Fact-Checking',
      'Copywriting',
      'Proofreading',
    ],
    targetJob: {
      title: 'Senior News Desk Editor & Content Writer',
      company: 'Odisha Media Network / Prameya News',
      location: 'Cuttack / Bhubaneswar, Odisha',
      description: 'Seeking B.A. in Journalism / Mass Communication for editorial reporting, press release drafting, feature stories, and media communication.',
    },
  },

  // ─── 2. HEALTHCARE / MEDICINE (Madhya Pradesh) ──────────────────────────────
  {
    id: 2,
    name: 'Dr. Rohan Sharma',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    stream: 'Healthcare & Dentistry (BDS)',
    degrees: [
      { degree: 'BDS (Bachelor of Dental Surgery)', institution: 'Gandhi Medical College / Barkatullah University, Bhopal' },
    ],
    candidateSkills: [
      'Clinical Diagnosis',
      'Patient Care',
      'OPD Management',
      'Dental Pharmacology',
      'Patient History Taking',
    ],
    targetJob: {
      title: 'Clinical Research Coordinator & Healthcare Officer',
      company: 'AIIMS Bhopal Health Mission',
      location: 'Bhopal, Madhya Pradesh',
      description: 'Requirements: BDS / MBBS / Healthcare graduate for clinical trials monitoring, patient documentation, medical protocols, and ethical review.',
    },
  },

  // ─── 3. LAW & JUDICIARY (Rajasthan) ─────────────────────────────────────────
  {
    id: 3,
    name: 'Manvendra Singh Rathore',
    city: 'Jodhpur',
    state: 'Rajasthan',
    stream: 'Law & Constitutional Studies (B.A. LL.B)',
    degrees: [
      { degree: 'B.A. LL.B (Honours)', institution: 'National Law University (NLU), Jodhpur' },
    ],
    candidateSkills: [
      'Legal Research',
      'SCC Online & Manupatra',
      'Case Law Briefing',
      'Court Pleadings',
      'Contract Drafting',
    ],
    targetJob: {
      title: 'Legal Research Associate / Judicial Law Clerk',
      company: 'Chambers of Senior Advocate, Rajasthan High Court',
      location: 'Jodhpur, Rajasthan',
      description: 'Looking for Law Graduate / B.A. LL.B with strong background in Constitutional writ petitions, Civil Procedure Code (CPC), and case brief preparation.',
    },
  },

  // ─── 4. COMMERCE / COST ACCOUNTING (Andhra Pradesh) ─────────────────────────
  {
    id: 4,
    name: 'Sravani Kondapalli',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    stream: 'Commerce & Cost Accounting (B.Com + CMA)',
    degrees: [
      { degree: 'CMA Inter (Cost & Management Accountant)', institution: 'ICMAI Southern Region (Vijayawada Chapter)' },
      { degree: 'B.Com in Taxation & Finance', institution: 'Acharya Nagarjuna University, Guntur' },
    ],
    candidateSkills: [
      'Cost Accounting',
      'Variance Analysis',
      'Tally Prime',
      'GST Filing',
      'MIS Reporting',
      'Budgeting & Forecasting',
    ],
    targetJob: {
      title: 'Cost & Management Accounting Trainee',
      company: 'Rashtriya Ispat Nigam Limited (Vizag Steel) / Divi\'s Labs',
      location: 'Vijayawada / Visakhapatnam, Andhra Pradesh',
      description: 'Hiring B.Com / CMA / CA Inter for manufacturing cost auditing, bill of materials (BOM) analysis, working capital reconciliation, and excise compliance.',
    },
  },

  // ─── 5. THE ONLY TECH CANDIDATE (Jharkhand) ─────────────────────────────────
  {
    id: 5,
    name: 'Birsa Munda Tirkey',
    city: 'Ranchi',
    state: 'Jharkhand',
    stream: 'Technology & Computer Applications (BCA)',
    degrees: [
      { degree: 'BCA (Bachelor of Computer Applications)', institution: 'Birla Institute of Technology (BIT) Mesra, Ranchi' },
    ],
    candidateSkills: [
      'Python',
      'SQL',
      'PostgreSQL',
      'REST APIs',
      'Git',
      'JavaScript',
    ],
    targetJob: {
      title: 'Junior Backend & API Developer',
      company: 'Tata Steel Technical Services / CCL Tech Hub',
      location: 'Ranchi, Jharkhand',
      description: 'Hiring BCA / B.Tech graduate for backend API design, database schema optimization, Docker microservices, and system integration.',
    },
  },
];

// Execute the audit
for (const student of auditCohort) {
  console.log(`────────────────────────────────────────────────────────────────`);
  console.log(`STUDENT #${student.id}: ${student.name.toUpperCase()}`);
  console.log(`Stream: ${student.stream}`);
  console.log(`Location: ${student.city}, ${student.state}`);
  console.log(`────────────────────────────────────────────────────────────────`);

  // 1. Geo Resolution
  const geo = resolvePanIndiaLocation(student.city);
  console.log(`[GEO RESOLUTION]`);
  console.log(`  - Query City: "${student.city}" -> Resolved State: ${geo.state} (${geo.stateCode}), Zone: ${geo.zone}`);
  console.log(`  - Matched District / Capital: ${geo.matchedDistrict}`);
  console.log(`  - Prominent Local Employers: ${geo.suggestedEmployers.slice(0, 4).join(', ')}`);

  // 2. Discipline Detection for Target Role
  const disc = detectJobDiscipline(`${student.targetJob.title} ${student.targetJob.description}`, student.targetJob.title);
  console.log(`\n[DISCIPLINE DETECTION]`);
  console.log(`  - Target Role: "${student.targetJob.title}"`);
  console.log(`  - Detected Discipline: ${disc.name} (ID: ${disc.id})`);

  // 3. Degree Alignment Evaluation
  const eduEval = evaluateDegreeAlignment(
    `${student.targetJob.title} ${student.targetJob.description}`,
    student.degrees
  );
  console.log(`\n[QUALIFICATION & DEGREE FIT]`);
  console.log(`  - Candidate Degrees: ${student.degrees.map(d => d.degree).join(' + ')}`);
  console.log(`  - Degree Fit: ${eduEval.aligned ? 'ALIGNED ✓' : 'NOT ALIGNED ✗'}`);
  console.log(`  - Degree Score: ${eduEval.score} / 25 pts`);
  console.log(`  - Alignment Rationale: "${eduEval.text}"`);

  // 4. Missing Skill Recommendations (Zero Tech Bias Verification)
  const missingSkills = suggestRelevantMissingSkills(
    `${student.targetJob.title} ${student.targetJob.description}`,
    student.candidateSkills
  );
  console.log(`\n[MISSING SKILL RECOMMENDATIONS]`);
  console.log(`  - Candidate Existing Skills: ${student.candidateSkills.slice(0, 3).join(', ')}...`);
  console.log(`  - Recommended Skills: [ ${missingSkills.map(s => `"${s}"`).join(', ')} ]`);

  // Verify non-tech candidates do NOT receive tech suggestions
  const techKeywords = ['react', 'python', 'javascript', 'docker', 'node', 'devops', 'git'];
  const hasTechBleed = student.id !== 5 && missingSkills.some(s => techKeywords.some(k => s.toLowerCase().includes(k)));
  console.log(`  - Zero Tech Bias Verification: ${!hasTechBleed ? 'PASSED ✓ (Zero tech bleed)' : 'FAILED ✗ (Contains tech keywords)'}`);

  // 5. Geographic Proximity Tiering
  const tierLocal = calculatePanIndiaGeoTier(student.targetJob.location, student.city);
  const tierNational = calculatePanIndiaGeoTier('Bengaluru, Karnataka', student.city);
  console.log(`\n[GEOGRAPHIC PROXIMITY TIERING]`);
  console.log(`  - Job in ${student.targetJob.location}: Tier ${tierLocal} (${tierLocal <= 3 ? 'Local / In-State Match ✓' : 'Other'})`);
  console.log(`  - Job in Bengaluru: Tier ${tierNational} (Pan-India National Tier)`);
  console.log('\n');
}

console.log('================================================================');
console.log('AUDIT SUMMARY: ALL 5 STUDENTS TESTED ACROSS ALL 5 INDIAN STATES');
console.log('================================================================');
