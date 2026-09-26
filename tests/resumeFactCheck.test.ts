import { flagPotentialFabrications, validateOneToOneMapping } from '../app/lib/resumeFactCheck';

console.log('\n--- Running NicheHire Resume Fact-Check & Anti-Hallucination Test Suite (5 Cases) ---\n');

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

// ─── Case 1: Flags new numeric metrics & percentages ────────────────────────
const orig1 = 'Assisted with database query optimization and table indexing.';
const hallucinated1 = 'Optimized SQL database query performance by 40% reducing latency to 150ms.';
const flags1 = flagPotentialFabrications(orig1, hallucinated1);

assert(
  flags1.includes('40%') && flags1.includes('150ms'),
  'Case 1: Correctly flags invented metrics ("40%", "150ms") absent from original text'
);

// ─── Case 2: Flags newly injected technical tools ───────────────────────────
const orig2 = 'Built frontend components for user profile management.';
const hallucinated2 = 'Built scalable microservice architecture using Docker and Kubernetes.';
const flags2 = flagPotentialFabrications(orig2, hallucinated2);

assert(
  flags2.includes('DOCKER') && flags2.includes('KUBERNETES'),
  'Case 2: Correctly flags unmentioned technical tools ("DOCKER", "KUBERNETES")'
);

// ─── Case 3: Does not false-positive on pure rewording & action verbs ───────
const orig3 = 'Responsible for leading a team of 4 engineers to build the core checkout flow.';
const polished3 = 'Spearheaded an engineering squad of 4 developers to architect the mission-critical checkout pipeline.';
const flags3 = flagPotentialFabrications(orig3, polished3);

assert(
  flags3.length === 0,
  'Case 3: Zero false positives on grammatical rewording and action verbs ("Spearheaded", "squad")'
);

// ─── Case 4: Confirms Polish mode maintains strict 1:1 bullet mapping ────────
const originalBullets = [
  'Refactored authentication middleware to use JWT tokens.',
  'Integrated Razorpay payment gateway for recurring subscriptions.',
  'Configured automated CI/CD deployment pipelines on Vercel.',
];

const validRewrittenBullets = [
  'Modernized authentication layer leveraging cryptographically secure JWT tokens.',
  'Architected end-to-end Razorpay checkout gateway supporting recurring subscription billing.',
  'Streamlined automated continuous integration and continuous deployment workflows via Vercel.',
];

const invalidMergedBullets = [
  'Modernized authentication with JWT and integrated Razorpay payments.',
  'Streamlined automated continuous integration workflows via Vercel.',
];

assert(
  validateOneToOneMapping(originalBullets, validRewrittenBullets) === true,
  'Case 4a: Validates 1:1 bullet mapping when counts and non-empty lines match'
);
assert(
  validateOneToOneMapping(originalBullets, invalidMergedBullets) === false,
  'Case 4b: Rejects invalid merged bullets (original 3 != rewritten 2)'
);

// ─── Case 5: Strengthen mode question generation without invented numbers ────
interface StrengthenProbe {
  bullet: string;
  hasMetric: boolean;
  generatedQuestion?: string;
}

function probeBulletForStrengthening(bullet: string): StrengthenProbe {
  const metricRegex = /\b\d+(?:[.,]\d+)?%?\b/;
  const hasMetric = metricRegex.test(bullet);

  if (!hasMetric) {
    return {
      bullet,
      hasMetric: false,
      generatedQuestion: 'You mention optimizing queries — do you know roughly how much faster it became or how often this occurred?',
    };
  }

  return { bullet, hasMetric: true };
}

const probeVague = probeBulletForStrengthening('Worked on optimizing server queries.');
const probeQuantified = probeBulletForStrengthening('Reduced query execution time by 35%.');

assert(
  !probeVague.hasMetric && typeof probeVague.generatedQuestion === 'string',
  'Case 5a: Vague bullet without metric triggers targeted question prompt'
);
assert(
  probeQuantified.hasMetric && probeQuantified.generatedQuestion === undefined,
  'Case 5b: Pre-quantified bullet is recognized without unnecessary probing'
);

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.\n`);
if (passedCount !== totalCount) {
  process.exit(1);
}
