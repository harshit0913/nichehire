/**
 * Automated Fact-Check Safety Net Heuristic.
 *
 * Compares an original bullet against the AI-rewritten bullet.
 * Flags any new numeric metrics, percentages, currency amounts, or significant
 * skill-like terms present in the rewrite that were completely absent from the original text.
 *
 * NOTE: Not an exhaustive NLP fact verification engine — it acts as a high-fidelity
 * safety net to catch the clearest hallucination and fabrication patterns before the user reviews.
 */
export function flagPotentialFabrications(original: string, rewritten: string): string[] {
  const flags: string[] = [];
  const origLower = original.toLowerCase();

  // 1. Detect numbers, percentages, and metrics (e.g. 50%, $10k, ₹5L, 20x, 100+, 150ms)
  // Match numbers and potential quantities/units
  const metricRegex = /(?:\$|₹|€)?\b\d+(?:[.,]\d+)?(?:%|x|k|m|l|cr|ms|sec|s|hr|hrs|\+)?(?=[\s.,;!?)]|$)/gi;
  const rewrittenMetrics = rewritten.match(metricRegex) || [];

  for (const metric of rewrittenMetrics) {
    // Check if this exact number/metric token is already in original
    const cleaned = metric.toLowerCase().replace(/^[₹$€]/, '');
    if (!origLower.includes(cleaned) && !origLower.includes(metric.toLowerCase())) {
      // Exclude simple ordinal numbers like "1st", or common single digits if spelled out
      if (!flags.includes(metric)) {
        flags.push(metric);
      }
    }
  }

  // 2. Detect high-impact new technical keywords/tools (e.g. AWS, Docker, Kubernetes, React, Python)
  // If the rewritten text adds common tools not mentioned in original
  const TECH_TERMS = [
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'react', 'next.js', 'typescript',
    'python', 'golang', 'java', 'c++', 'sql', 'postgresql', 'mongodb', 'redis', 'graphql',
    'rest api', 'ci/cd', 'microservices', 'kafka', 'tailwind', 'jira', 'agile', 'scrum',
    'tableau', 'power bi', 'excel', 'tally', 'sap'
  ];

  for (const term of TECH_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const termRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (termRegex.test(rewritten) && !termRegex.test(original)) {
      if (!flags.some(f => f.toLowerCase() === term.toLowerCase())) {
        flags.push(term.toUpperCase());
      }
    }
  }

  return flags;
}

/**
 * Validates that Polish mode output strictly preserves a 1:1 mapping with original bullets.
 */
export function validateOneToOneMapping(
  originalBullets: string[],
  rewrittenBullets: string[]
): boolean {
  if (originalBullets.length !== rewrittenBullets.length) {
    return false;
  }
  // None of the rewritten bullets should be empty if original wasn't empty
  return rewrittenBullets.every((b, i) => !originalBullets[i].trim() || b.trim().length > 0);
}
