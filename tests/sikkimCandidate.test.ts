import { resolvePanIndiaLocation, calculatePanIndiaGeoTier } from '../app/lib/panIndiaGeo';
import { detectJobDiscipline, evaluateDegreeAlignment, suggestRelevantMissingSkills } from '../app/lib/skillsTaxonomy';

console.log('=== TESTING SIKKIM CANDIDATE (B.COM + MBA SUPPLY CHAIN) ===\n');

// 1. Geographic Resolution Test
const locState = resolvePanIndiaLocation('Sikkim');
console.log('1. Location "Sikkim" Resolution:');
console.log('   - State:', locState.state);
console.log('   - Code:', locState.stateCode);
console.log('   - Zone:', locState.zone);
console.log('   - Capital:', locState.capital);
console.log('   - Key Districts:', locState.districts);
console.log('   - Suggested Employers:', locState.suggestedEmployers);

const locGangtok = resolvePanIndiaLocation('Gangtok');
console.log('\n2. Location "Gangtok" Resolution:');
console.log('   - State:', locGangtok.state);
console.log('   - District:', locGangtok.matchedDistrict);
console.log('   - Matches State:', locGangtok.state === 'Sikkim');

// Proximity tests
const tierSameDistrict = calculatePanIndiaGeoTier('Gangtok', 'Gangtok');
const tierSameState = calculatePanIndiaGeoTier('Namchi, Sikkim', 'Gangtok');
const tierNational = calculatePanIndiaGeoTier('Bengaluru', 'Gangtok');

console.log('\n3. Proximity Tiers:');
console.log('   - Gangtok to Gangtok:', tierSameDistrict, '(Expected: 1)');
console.log('   - Namchi to Gangtok:', tierSameState, '(Expected: 3 or 4)');
console.log('   - Bengaluru to Gangtok:', tierNational, '(Expected: 5)');

// 4. Candidate & Job Profile Simulation
const candidateProfile = {
  name: 'Tenzing Dorjee',
  location: 'Gangtok, Sikkim',
  degrees: [
    { degree: 'MBA in Supply Chain Management', institution: 'Sikkim University' },
    { degree: 'B.Com (Honours)', institution: 'Sikkim Government College, Tadong' }
  ],
  skills: [
    'Supply Chain Management',
    'Inventory Control',
    'Logistics & Warehousing',
    'Vendor Management',
    'Tally Prime',
    'Bank Reconciliation',
    'GST Compliance'
  ]
};

const job1 = {
  title: 'Supply Chain Operations Trainee / Officer',
  company: 'Sun Pharma',
  location: 'Ranipool / Kumrek, Sikkim',
  description: 'Looking for MBA (Supply Chain / Logistics) or B.Com candidate for warehouse logistics, dispatch scheduling, SAP MM, and vendor coordination.'
};

const job2 = {
  title: 'Accounts & Commercial Executive',
  company: 'Cipla Limited',
  location: 'Rangpo, Sikkim',
  description: 'Requires B.Com graduate with knowledge of GST returns, Tally ERP/Prime, vendor billing, and store inventory audit.'
};

const job3 = {
  title: 'Full Stack React & Node Developer',
  company: 'TechCorp India',
  location: 'Bengaluru / Remote',
  description: 'Looking for B.Tech / BCA with expertise in React, TypeScript, Next.js, and PostgreSQL.'
};

console.log('\n4. Evaluating Job 1 (Supply Chain Role in Sikkim):');
const disc1 = detectJobDiscipline(`${job1.title} ${job1.description}`);
console.log('   - Detected Discipline:', disc1.name);
const degreeFit1 = evaluateDegreeAlignment(`${job1.title} ${job1.description}`, candidateProfile.degrees);
console.log('   - Degree Alignment:', degreeFit1.text, `(Score: ${degreeFit1.score})`);
const missingSkills1 = suggestRelevantMissingSkills(`${job1.title} ${job1.description}`, candidateProfile.skills);
console.log('   - Missing Skill Recommendations:', missingSkills1);

console.log('\n5. Evaluating Job 2 (B.Com Commercial/Accounts in Sikkim):');
const disc2 = detectJobDiscipline(`${job2.title} ${job2.description}`);
console.log('   - Detected Discipline:', disc2.name);
const degreeFit2 = evaluateDegreeAlignment(`${job2.title} ${job2.description}`, candidateProfile.degrees);
console.log('   - Degree Alignment:', degreeFit2.text, `(Score: ${degreeFit2.score})`);
const missingSkills2 = suggestRelevantMissingSkills(`${job2.title} ${job2.description}`, candidateProfile.skills);
console.log('   - Missing Skill Recommendations:', missingSkills2);

console.log('\n6. Evaluating Job 3 (Tech Developer - Cross Stream Verification):');
const disc3 = detectJobDiscipline(`${job3.title} ${job3.description}`);
console.log('   - Detected Discipline:', disc3.name);
const degreeFit3 = evaluateDegreeAlignment(`${job3.title} ${job3.description}`, candidateProfile.degrees);
console.log('   - Degree Alignment:', degreeFit3.text, `(Score: ${degreeFit3.score})`);
const missingSkills3 = suggestRelevantMissingSkills(`${job3.title} ${job3.description}`, candidateProfile.skills);
console.log('   - Missing Skill Recommendations:', missingSkills3);

console.log('\n7. Geographic Ranking for Candidate in Gangtok, Sikkim:');
const jobsToRank = [
  { id: '1', title: job1.title, loc: job1.location, tier: calculatePanIndiaGeoTier(job1.location, candidateProfile.location) },
  { id: '2', title: job2.title, loc: job2.location, tier: calculatePanIndiaGeoTier(job2.location, candidateProfile.location) },
  { id: '3', title: job3.title, loc: job3.location, tier: calculatePanIndiaGeoTier(job3.location, candidateProfile.location) },
];

jobsToRank.sort((a, b) => a.tier - b.tier);
jobsToRank.forEach((j, idx) => {
  console.log(`   Rank #${idx + 1}: [Tier ${j.tier}] ${j.title} at ${j.loc}`);
});

console.log('\n=== TEST COMPLETE ===');
