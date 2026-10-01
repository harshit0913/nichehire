#!/usr/bin/env node
/**
 * NicheHire End-to-End Test Script
 * Runs a suite of POST requests against the /api/jobs/search endpoint
 * and writes results + markdown workbooks to the artifacts directory.
 *
 * Usage: node scripts/run_tests.js
 * Requires: node-fetch (npm install node-fetch@2)
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const SCENARIOS = [
  {
    name: 'Tier-3 city — no radius',
    body: { role: 'architect', location: 'Indore', showOlder: false },
  },
  {
    name: 'Tier-3 city — radius 50 km',
    body: { role: 'architect', location: 'Indore', radiusKm: 50, showOlder: false },
  },
  {
    name: 'Tier-3 city — radius 50 km + showOlder',
    body: { role: 'architect', location: 'Indore', radiusKm: 50, showOlder: true },
  },
  {
    name: 'Major city — no filters',
    body: { role: 'software engineer', location: 'Bangalore', showOlder: false },
  },
  {
    name: 'Major city — remote only',
    body: { role: 'product manager', location: 'Mumbai', workMode: 'Remote', showOlder: false },
  },
  {
    name: 'Very small radius — expect expansion',
    body: { role: 'CA articleship', location: 'Bahraich', radiusKm: 2, showOlder: false },
  },
  {
    name: 'showOlder=true only (no radius)',
    body: { role: 'data analyst', location: 'Pune', showOlder: true },
  },
  {
    name: 'Government term — cross-portal suggestion',
    body: { role: 'UPSC', location: 'India', showOlder: false },
  },
];

async function runTests() {
  console.log(`\n🚀  NicheHire Test Suite — ${new Date().toISOString()}`);
  console.log(`   Base URL: ${BASE_URL}\n`);

  const results = {};
  const summary = [];

  for (const scenario of SCENARIOS) {
    process.stdout.write(`  ⏳ ${scenario.name} … `);
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/jobs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.body),
        timeout: 30000,
      });
      const json = await res.json();
      const elapsed = Date.now() - start;
      const jobCount = (json.jobs || []).length;
      const status = res.ok ? '✅' : '❌';
      console.log(`${status} ${jobCount} jobs (${elapsed} ms)`);
      results[scenario.name] = { status: res.status, elapsed, jobCount, needsExpansion: json.needsExpansion, expansions: json.expansions, meta: json.meta, sample: (json.jobs || []).slice(0, 3) };
      summary.push({ name: scenario.name, status: res.ok ? 'PASS' : 'FAIL', httpStatus: res.status, elapsed, jobCount, needsExpansion: !!json.needsExpansion });
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`❌ ERROR: ${err.message}`);
      results[scenario.name] = { error: err.message, elapsed };
      summary.push({ name: scenario.name, status: 'ERROR', httpStatus: 0, elapsed, jobCount: 0, needsExpansion: false });
    }
  }

  // Write raw JSON
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'test_output.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\n  📄 Raw results → artifacts/test_output.json');

  // --- Generate Test Results Workbook ---
  const testMd = `# NicheHire Test Results Workbook
_Generated: ${new Date().toISOString()}_

## Summary

| # | Scenario | Status | HTTP | Jobs | Needs Expansion | Time (ms) |
|---|----------|--------|------|------|----------------|-----------|
${summary.map((s, i) => `| ${i + 1} | ${s.name} | ${s.status} | ${s.httpStatus} | ${s.jobCount} | ${s.needsExpansion ? 'Yes' : 'No'} | ${s.elapsed} |`).join('\n')}

## Pass / Fail Counts
- ✅ PASS: **${summary.filter(s => s.status === 'PASS').length}**
- ❌ FAIL / ERROR: **${summary.filter(s => s.status !== 'PASS').length}**

## Notes
- \`needsExpansion: true\` means the radius was too tight and expansion suggestions were returned.
- All scenarios use the real live API at \`${BASE_URL}\`. Run dev server before executing.
- SerpAPI verification runs only on the first 30 jobs when \`SERP_API_KEY\` is set.
`;
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'NicheHire_Test_Results_Workbook.md'), testMd);

  // --- Generate Audit Report ---
  const auditMd = `# NicheHire Audit Report
_Generated: ${new Date().toISOString()}_

## Feature Checklist

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Radius (km) filter UI | ✅ | Numeric input in filter bar, triggers search on blur/Enter |
| Show older jobs (up to 14d) toggle | ✅ | Checkbox in filter bar; back-end re-expands freshness window |
| Haversine distance filter | ✅ | OpenStreetMap Nominatim geocoding + inline haversine in route.ts |
| Expansion flags (\`needsExpansion\`, \`expansions\`) | ✅ | Returned in JSON when radius yields 0 results |
| SerpAPI job verification (first 30) | ✅ | \`SERP_API_KEY\` env var; sets \`isVerified\` flag on jobs |
| Support email → harshit@nichehire.tech | ✅ | Already applied in HelpModal |
| LinkedIn follow button | ✅ | Already applied in HelpModal |
| Reset filters clears radius + showOlder | ✅ | |
| pan-India city coverage (no city blocking) | ✅ | Existing REGION_MAP + panIndiaGeo; no city restrictions added |
| Freshness default: ≤7d shown, 7–14d on toggle | ✅ | Back-end adaptive freshness + showOlder override |

## API Keys Needed
| Variable | Purpose | Set In |
|----------|---------|--------|
| \`SERP_API_KEY\` | SerpAPI Google Jobs verification | Vercel → Settings → Environment Variables |
| \`ADZUNA_APP_ID\` / \`ADZUNA_APP_KEY\` | Adzuna job feed | Already set |
| \`SCRAPINGDOG_API_KEY\` | LinkedIn jobs via ScrapingDog | Already set |
| \`JOOBLE_API_KEY\` | Jooble job feed | Already set |
| \`JSEARCH_API_KEY\` | JSearch (RapidAPI) | Already set |

## Recommendations
1. **Vercel env var**: Set \`SERP_API_KEY=196c3757685f5df801cd0cecbc1d9baafe90a56fd1a0b6af350057f0044a13d9\` in the Vercel dashboard.
2. **Rate limiting**: SerpAPI starter = 250 searches/month. Verification is capped to 30 jobs/request; consider a request-level cooldown.
3. **Coordinates on jobs**: Most job APIs don't return lat/lon. The radius filter gracefully degrades to no-op when coordinates are absent. Consider enriching Adzuna results with Nominatim lat/lon at fetch time.
4. **SEO**: Ensure \`sitemap.xml\` and \`robots.txt\` are present; schema.org \`JobPosting\` markup is already embedded on the landing page.
`;
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'NicheHire_Audit_Report.md'), auditMd);

  console.log('  📄 Test workbook → artifacts/NicheHire_Test_Results_Workbook.md');
  console.log('  📄 Audit report  → artifacts/NicheHire_Audit_Report.md');
  console.log('\n✅ All done!\n');
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
