console.log('\n--- Running NicheHire Feedback & Anti-Spam Security Test Suite (4 Cases) ---\n');

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

// ─── Email Validation & Header Injection Defense ────────────────────────────
// Disallows CRLF (\r, \n), semicolons, commas, or multiple addresses to prevent SMTP header injection
export function validateSafeEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();

  // Strict check: No CRLF characters or commas/semicolons or consecutive dots
  if (/[\r\n;,]/.test(trimmed) || trimmed.includes('..')) return false;

  // Strict single-address RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

// ─── Input Sanitization Helper ──────────────────────────────────────────────
export function sanitizeFeedbackContent(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
    .replace(/<[^>]+>/g, '') // Strip all remaining HTML tags
    .trim()
    .slice(0, 2000); // Max 2000 chars
}

// ─── Rate Limiter Simulation ────────────────────────────────────────────────
class SlidingWindowMockLimiter {
  private windowMs: number;
  private maxRequests: number;
  private storage: Map<string, number[]> = new Map();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public check(key: string, now: number = Date.now()): { success: boolean; remaining: number } {
    const timestamps = this.storage.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.storage.set(key, validTimestamps);
      return { success: false, remaining: 0 };
    }

    validTimestamps.push(now);
    this.storage.set(key, validTimestamps);
    return { success: true, remaining: this.maxRequests - validTimestamps.length };
  }
}

// ─── Case 1: Valid Feedback Acceptance & Storage Formatting ─────────────────
const validBody = {
  type: 'bug',
  message: 'Filter dropdown does not update when selecting Bihar -> Muzaffarpur.',
  email: 'student@example.com',
  url: 'https://nichehire.in/govt-exams',
};

const sanitizedMessage = sanitizeFeedbackContent(validBody.message);
const isEmailValid = validateSafeEmail(validBody.email);

assert(
  sanitizedMessage === validBody.message && isEmailValid,
  'Case 1: Valid feedback passes sanitization and safe email validation'
);

// ─── Case 2: Script Tag & HTML Sanitization ──────────────────────────────────
const maliciousMessage = 'Great app! <script>alert("XSS")</script><img src="x" onerror="alert(1)"> Click here';
const cleanSanitized = sanitizeFeedbackContent(maliciousMessage);

assert(
  !cleanSanitized.includes('<script>') && !cleanSanitized.includes('onerror=') && cleanSanitized.includes('Great app!'),
  'Case 2: Strips all malicious script tags and injected HTML elements cleanly'
);

// ─── Case 3: Email Header Injection Rejection ───────────────────────────────
const injectionPayloads = [
  'victim@example.com\r\nBcc: spammer@attacker.com',
  'victim@example.com\nSubject: Injected Subject',
  'user1@example.com, user2@attacker.com',
  'user@example.com; malicious@attacker.com',
  'invalid-email-address',
  'user@domain..com',
];

const allRejected = injectionPayloads.every(payload => !validateSafeEmail(payload));
const legitimateEmailValid = validateSafeEmail('founder@nichehire.in');

assert(
  allRejected && legitimateEmailValid,
  'Case 3: Strictly rejects all 6 header injection payloads (CRLF, comma-separation, multiple recipients)'
);

// ─── Case 4: Sliding Window Rate Limiting (5/hour per IP) ───────────────────
const limiter = new SlidingWindowMockLimiter(5, 60 * 60 * 1000);
const testIp = '103.21.244.2';
const startTime = Date.now();

// 5 rapid submissions allowed
let allowedCount = 0;
for (let i = 0; i < 5; i++) {
  if (limiter.check(testIp, startTime + i * 1000).success) {
    allowedCount++;
  }
}

// 6th submission blocked with HTTP 429
const sixthAttempt = limiter.check(testIp, startTime + 6000);

assert(
  allowedCount === 5 && !sixthAttempt.success,
  'Case 4: Enforces 5 submissions/hour ceiling; 6th rapid submission is blocked (HTTP 429)'
);

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.\n`);
if (passedCount !== totalCount) {
  process.exit(1);
}
