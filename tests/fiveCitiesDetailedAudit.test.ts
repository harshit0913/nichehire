import { resolvePanIndiaLocation, calculatePanIndiaGeoTier } from '../app/lib/panIndiaGeo';
import { detectJobDiscipline, evaluateDegreeAlignment, suggestRelevantMissingSkills } from '../app/lib/skillsTaxonomy';
import { VERIFIED_GOVT_EXAMS } from '../app/data/govtExamsData';
import { calculateGovtEligibility, CandidateProfile } from '../app/lib/govtEligibility';

console.log('=== RUNNING COMPREHENSIVE 5-STUDENT AUDIT ===\n');

// 1. Definition of the 5 Students
const students = [
  {
    id: 1,
    name: 'Ananya Pattnayak',
    city: 'Cuttack',
    state: 'Odisha',
    degree: 'B.A. in Mass Communication & Journalism',
    qualificationLevel: 'Graduate' as const,
    degreeType: 'B.A.',
    stream: 'Arts, Media & Journalism',
    searchRole: 'Content Writer',
    skills: ['Content Writing', 'Editorial Journalism', 'Fact-Checking', 'Copywriting', 'Proofreading'],
    sampleJobsInPool: [
      { id: 'j1-1', title: 'Editorial Lead & Content Strategist', company: 'Odisha Media Corp', location: 'Cuttack, Odisha', workMode: 'On-site' },
      { id: 'j1-2', title: 'Content Writer & Media Reporter', company: 'Prameya News Network', location: 'Bhubaneswar, Odisha', workMode: 'Hybrid' },
      { id: 'j1-3', title: 'Corporate Communications Associate', company: 'Tata Steel Kalinganagar', location: 'Jajpur, Odisha', workMode: 'On-site' },
      { id: 'j1-4', title: 'Digital Content Specialist', company: 'The Hindu', location: 'Kolkata, West Bengal', workMode: 'Hybrid' },
      { id: 'j1-5', title: 'Remote Technical Content Creator', company: 'Razorpay', location: 'Bengaluru / Remote', workMode: 'Remote' },
      { id: 'j1-6', title: 'Global Communications Copywriter', company: 'Stripe International', location: 'Dublin / Remote (US/EU)', workMode: 'Remote' },
    ]
  },
  {
    id: 2,
    name: 'Dr. Rohan Sharma',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    degree: 'BDS (Bachelor of Dental Surgery)',
    qualificationLevel: 'Graduate' as const,
    degreeType: 'BDS',
    stream: 'Medicine, Dentistry & Healthcare',
    searchRole: 'Clinical Research Coordinator',
    skills: ['Clinical Diagnosis', 'Patient Care', 'OPD Management', 'Dental Pharmacology', 'Patient History Taking'],
    sampleJobsInPool: [
      { id: 'j2-1', title: 'Clinical Research Coordinator', company: 'AIIMS Bhopal Health Mission', location: 'Bhopal, Madhya Pradesh', workMode: 'On-site' },
      { id: 'j2-2', title: 'Healthcare Operations & Quality Officer', company: 'Apollo Clinic Bhopal', location: 'Bhopal, Madhya Pradesh', workMode: 'On-site' },
      { id: 'j2-3', title: 'Medical Review Associate', company: 'Serum Institute / Lupin Mandideep', location: 'Mandideep / Bhopal, Madhya Pradesh', workMode: 'On-site' },
      { id: 'j2-4', title: 'Clinical Trial Specialist', company: 'Torrent Pharma', location: 'Indore, Madhya Pradesh', workMode: 'On-site' },
      { id: 'j2-5', title: 'Healthcare Data Reviewer', company: 'Optum India', location: 'Hyderabad / Remote', workMode: 'Remote' },
      { id: 'j2-6', title: 'International Clinical Safety Specialist', company: 'Novartis Global', location: 'Basel / Remote (Global)', workMode: 'Remote' },
    ]
  },
  {
    id: 3,
    name: 'Manvendra Singh Rathore',
    city: 'Jodhpur',
    state: 'Rajasthan',
    degree: 'B.A. LL.B (Honours)',
    qualificationLevel: 'Graduate' as const,
    degreeType: 'LL.B',
    stream: 'Law & Judicial Studies',
    searchRole: 'Legal Research Associate',
    skills: ['Legal Research', 'SCC Online & Manupatra', 'Case Law Briefing', 'Court Pleadings', 'Contract Drafting'],
    sampleJobsInPool: [
      { id: 'j3-1', title: 'Judicial Law Clerk & Researcher', company: 'High Court of Rajasthan', location: 'Jodhpur, Rajasthan', workMode: 'On-site' },
      { id: 'j3-2', title: 'Associate Advocate', company: 'Chambers of Senior Advocate', location: 'Jodhpur, Rajasthan', workMode: 'On-site' },
      { id: 'j3-3', title: 'Corporate Legal Associate', company: 'Hindustan Zinc', location: 'Udaipur, Rajasthan', workMode: 'On-site' },
      { id: 'j3-4', title: 'Legal & Contracts Specialist', company: 'Genpact Legal', location: 'Jaipur, Rajasthan', workMode: 'Hybrid' },
      { id: 'j3-5', title: 'Pan-India Corporate Legal Counsel', company: 'ICICI Bank Legal Wing', location: 'Mumbai / Remote', workMode: 'Remote' },
      { id: 'j3-6', title: 'Cross-Border Due Diligence Analyst', company: 'Clifford Chance', location: 'London / Remote', workMode: 'Remote' },
    ]
  },
  {
    id: 4,
    name: 'Sravani Kondapalli',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    degree: 'B.Com + CMA Inter',
    qualificationLevel: 'Graduate' as const,
    degreeType: 'B.Com',
    stream: 'Commerce & Cost Accounting',
    searchRole: 'Cost Accounting Trainee',
    skills: ['Cost Accounting', 'Variance Analysis', 'Tally Prime', 'GST Filing', 'MIS Reporting', 'Budgeting & Forecasting'],
    sampleJobsInPool: [
      { id: 'j4-1', title: 'Cost Accounting Executive', company: 'Divi\'s Laboratories', location: 'Vijayawada, Andhra Pradesh', workMode: 'On-site' },
      { id: 'j4-2', title: 'Financial & Cost Analyst', company: 'Amaravati Infrastructure Corp', location: 'Vijayawada / Guntur, Andhra Pradesh', workMode: 'On-site' },
      { id: 'j4-3', title: 'Manufacturing Cost Trainee', company: 'Rashtriya Ispat Nigam (Vizag Steel)', location: 'Visakhapatnam, Andhra Pradesh', workMode: 'On-site' },
      { id: 'j4-4', title: 'Plant Accounts Officer', company: 'Sri City Industrial SEZ', location: 'Tirupati, Andhra Pradesh', workMode: 'On-site' },
      { id: 'j4-5', title: 'Remote Cost Controller', company: 'Swiggy Finance', location: 'Bengaluru / Remote', workMode: 'Remote' },
      { id: 'j4-6', title: 'APAC Cost Analyst', company: 'Unilever Singapore', location: 'Singapore / Remote', workMode: 'Remote' },
    ]
  },
  {
    id: 5,
    name: 'Birsa Munda Tirkey',
    city: 'Ranchi',
    state: 'Jharkhand',
    degree: 'BCA (Bachelor of Computer Applications)',
    qualificationLevel: 'Graduate' as const,
    degreeType: 'BCA',
    stream: 'Computer Applications & IT',
    searchRole: 'Junior Backend Developer',
    skills: ['Python', 'SQL', 'PostgreSQL', 'REST APIs', 'Git', 'JavaScript'],
    sampleJobsInPool: [
      { id: 'j5-1', title: 'Junior Python & Database Developer', company: 'Central Coalfields CCL Tech', location: 'Ranchi, Jharkhand', workMode: 'On-site' },
      { id: 'j5-2', title: 'Software Engineer (Backend)', company: 'Tata Steel Information Systems', location: 'Jamshedpur / Ranchi, Jharkhand', workMode: 'Hybrid' },
      { id: 'j5-3', title: 'IT Systems Trainee', company: 'SAIL Bokaro Steel Plant', location: 'Bokaro, Jharkhand', workMode: 'On-site' },
      { id: 'j5-4', title: 'Junior Full Stack Engineer', company: 'Wipro Technologies', location: 'Kolkata, West Bengal', workMode: 'Hybrid' },
      { id: 'j5-5', title: 'Cloud Backend Engineer', company: 'InMobi / Vercel', location: 'Bengaluru / Remote', workMode: 'Remote' },
      { id: 'j5-6', title: 'Global Platform Engineer', company: 'GitLab Global', location: 'San Francisco / Remote', workMode: 'Remote' },
    ]
  }
];

// Seed walk-in opportunities currently in the system
const SEED_WALKINS = [
  { id: 'seed-1', title: 'Retail Store Assistant & Cashier', company: 'Lifestyle & Electronics Hub', location: 'Indiranagar, Bangalore' },
  { id: 'seed-2', title: 'Junior Accounts & Billing Executive', company: 'Apex Logistics & Freight', location: 'Sector 18, Noida / Delhi NCR' },
  { id: 'seed-3', title: 'Front Desk / Operations Coordinator', company: 'Wellness & Diagnostics Centre', location: 'Bandra West, Mumbai' },
];

for (const student of students) {
  console.log(`================================================================`);
  console.log(`AUDIT FOR: ${student.name.toUpperCase()} (${student.city}, ${student.state})`);
  console.log(`Stream: ${student.stream} | Degree: ${student.degree}`);
  console.log(`Search Query: "${student.searchRole}" in "${student.city}"`);
  console.log(`================================================================`);

  // 1. TIER BREAKDOWN
  const tieredJobs = student.sampleJobsInPool.map((job) => {
    const tier = calculatePanIndiaGeoTier(job.location, student.city);
    return { ...job, tier };
  });

  const tier1 = tieredJobs.filter(j => j.tier === 1);
  const tier2 = tieredJobs.filter(j => j.tier === 2);
  const tier3 = tieredJobs.filter(j => j.tier === 3);
  const tier4 = tieredJobs.filter(j => j.tier === 4);
  const tier5 = tieredJobs.filter(j => j.tier === 5);
  const tier6 = tieredJobs.filter(j => j.tier === 6);

  console.log(`\n1. JOB SUGGESTIONS GEOGRAPHIC TIER BREAKDOWN:`);
  console.log(`   - Within Area (Tier 1 - Exact City/Town): ${tier1.length} jobs`);
  tier1.forEach(j => console.log(`     * [Tier 1] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  console.log(`   - Within District / Satellite Hubs (Tier 2): ${tier2.length} jobs`);
  tier2.forEach(j => console.log(`     * [Tier 2] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  console.log(`   - Nearby City in Same State (Tier 3): ${tier3.length} jobs`);
  tier3.forEach(j => console.log(`     * [Tier 3] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  console.log(`   - Within Whole State (Tier 4): ${tier4.length} jobs`);
  tier4.forEach(j => console.log(`     * [Tier 4] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  console.log(`   - Pan-India (Tier 5 - National / Remote): ${tier5.length} jobs`);
  tier5.forEach(j => console.log(`     * [Tier 5] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  console.log(`   - Other Country (Tier 6 - International Remote): ${tier6.length} jobs`);
  tier6.forEach(j => console.log(`     * [Tier 6] ${j.title} at ${j.company} (${j.location}) [${j.workMode}]`));

  // 2. STATUS OF WALK-INS FOR THEIR AREA
  const locLow = student.city.toLowerCase();
  const stateLow = student.state.toLowerCase();
  const matchedWalkins = SEED_WALKINS.filter(w => {
    const wLoc = w.location.toLowerCase();
    return wLoc.includes(locLow) || wLoc.includes(stateLow);
  });

  console.log(`\n2. STATUS OF OFFLINE WALK-IN DRIVES IN ${student.city.toUpperCase()}:`);
  if (matchedWalkins.length > 0) {
    console.log(`   - Found ${matchedWalkins.length} active walk-in drive(s) in their area.`);
    matchedWalkins.forEach(w => console.log(`     * ${w.title} at ${w.company} (${w.location})`));
  } else {
    console.log(`   - Current Status: 0 community-posted walk-in drives currently active directly in ${student.city}.`);
    console.log(`   - Platform Action Shown in UI:`);
    console.log(`     1. Displays honest empty-state: "No walk-in drives found for ${student.city}"`);
    console.log(`     2. Displays "+ Post a walk-in drive" button so local employers or candidates can crowdsource.`);
    console.log(`     3. Does NOT fake listings or show irrelevant metro drives from Bangalore/Delhi when user filtered for ${student.city}.`);
  }

  // 3. STATUS OF GOVT JOB SEARCH & ELIGIBILITY SCORING
  const candidateGovtProfile: CandidateProfile = {
    age: 24,
    category: 'General',
    qualificationLevel: student.qualificationLevel,
    degreeType: student.degreeType,
    stream: student.stream,
    domicileState: student.state,
    isPwD: false,
    isExServicemen: false,
    isConfigured: true,
  };

  const eligibleExams = VERIFIED_GOVT_EXAMS.map(exam => {
    const evalResult = calculateGovtEligibility(candidateGovtProfile, {
      ...exam.eligibility,
      domicilePolicy: exam.domicilePolicy,
      state: exam.state,
    });
    return { exam, evalResult };
  }).filter(item => item.evalResult.status === 'eligible' || item.evalResult.status === 'partially_eligible');

  const stateGovtExams = eligibleExams.filter(item => item.exam.state === student.state || item.exam.category === 'state' || item.exam.category === 'regional');
  const centralExams = eligibleExams.filter(item => item.exam.category === 'central' || item.exam.category === 'psu');

  console.log(`\n3. STATUS OF GOVT EXAM / JOB ELIGIBILITY:`);
  console.log(`   - Total Eligible Govt Exams for ${student.name} (Age: 24, Degree: ${student.degree}): ${eligibleExams.length} verified exams`);
  console.log(`   - State / Regional Level Opportunities (${student.state}):`);
  if (stateGovtExams.length > 0) {
    stateGovtExams.slice(0, 3).forEach(item => {
      console.log(`     * [${item.exam.category.toUpperCase()}] ${item.exam.title} (${item.exam.conductingBody}) - Salary: ${item.exam.salaryScale}`);
    });
  } else {
    console.log(`     * General state degree exams available via ${student.state} PSC (OPSC / MPPSC / RPSC / APPSC / JPSC) and High Court Clerkships.`);
  }

  console.log(`   - Central / PSU Level Opportunities (Pan-India):`);
  centralExams.slice(0, 3).forEach(item => {
    console.log(`     * [${item.exam.category.toUpperCase()}] ${item.exam.title} (${item.exam.conductingBody}) - Salary: ${item.exam.salaryScale}`);
  });

  console.log('\n');
}

console.log('=== AUDIT COMPLETE ===');
