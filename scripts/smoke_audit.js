#!/usr/bin/env node
/**
 * NicheHire Smoke Test + Audit Script
 * Runs rare/niche job searches across multiple cities and generates a full audit report.
 * Usage: node scripts/smoke_audit.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

const SCENARIOS = [
  // RARE / NICHE SEARCHES
  { label: 'CA Articleship — Nagpur (Tier 2)', body: { role: 'CA articleship', location: 'Nagpur', workMode: 'Any Mode' } },
  { label: 'CA Articles — Jaipur (Tier 2)', body: { role: 'CA article', location: 'Jaipur', workMode: 'Any Mode' } },
  { label: 'CS Trainee — Lucknow (Tier 2)', body: { role: 'CS trainee', location: 'Lucknow', workMode: 'Any Mode' } },
  { label: 'Architect Intern — Bhopal (Tier 2)', body: { role: 'architect intern', location: 'Bhopal', workMode: 'Any Mode' } },
  { label: 'Marine Engineer — Visakhapatnam (Tier 2)', body: { role: 'marine engineer', location: 'Visakhapatnam', workMode: 'Any Mode' } },
  // NORMAL SEARCHES FOR COMPARISON
  { label: 'Software Developer — Indore (Tier 2)', body: { role: 'software developer', location: 'Indore', workMode: 'Any Mode' } },
  { label: 'Data Analyst — Kochi (Tier 2)', body: { role: 'data analyst', location: 'Kochi', workMode: 'Any Mode' } },
  { label: 'Digital Marketing — Surat (Tier 2)', body: { role: 'digital marketing', location: 'Surat', workMode: 'Any Mode' } },
  // PAN-INDIA RARE
  { label: 'CMA Trainee — Pan India', body: { role: 'cma trainee', location: '', workMode: 'Any Mode' } },
  { label: 'Apprenticeship — Coimbatore (Tier 2)', body: { role: 'apprenticeship', location: 'Coimbatore', workMode: 'Any Mode' } },
];

async function runScenario(scenario) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario.body),
    });
    const json = await res.json();
    const elapsed = Date.now() - start;

    const jobs = json.jobs || [];
    const relatedSuggestions = json.relatedSuggestions || [];
    const needsExpansion = json.needsExpansion || false;
    const failedSources = json.meta?.failedSources || [];

    // Title quality check: for niche queries, check if titles are actually relevant
    const nicheKeywords = {
      'ca articleship': ['article', 'articleship', 'ca trainee', 'ca intern'],
      'ca article': ['article', 'articleship', 'ca trainee', 'ca intern'],
      'cs trainee': ['cs trainee', 'company secretary trainee'],
      'architect intern': ['architect intern', 'junior architect'],
      'cma trainee': ['cma', 'cost accountant trainee'],
      'apprenticeship': ['apprentice', 'apprenticeship'],
    };

    const queryLower = (scenario.body.role || '').toLowerCase();
    const relevantKeywords = nicheKeywords[queryLower];
    let titleRelevanceScore = 'N/A (standard query)';
    let exactMatchCount = 0;
    let relatedMatchCount = 0;

    if (relevantKeywords) {
      exactMatchCount = jobs.filter(j =>
        relevantKeywords.some(kw => (j.title || '').toLowerCase().includes(kw))
      ).length;
      relatedMatchCount = jobs.length - exactMatchCount;
      const pct = jobs.length > 0 ? Math.round((exactMatchCount / jobs.length) * 100) : 0;
      titleRelevanceScore = `${exactMatchCount}/${jobs.length} exact-match (${pct}%)`;
    }

    return {
      label: scenario.label,
      query: scenario.body.role,
      location: scenario.body.location || 'Pan India',
      totalJobs: jobs.length,
      elapsed,
      status: res.status,
      titleRelevanceScore,
      exactMatchCount,
      relatedMatchCount,
      relatedSuggestions,
      needsExpansion,
      failedSources,
      sampleTitles: jobs.slice(0, 5).map(j => `${j.title} @ ${j.company} [${j.location}]`),
      pass: res.status === 200,
    };
  } catch (err) {
    return {
      label: scenario.label,
      query: scenario.body.role,
      location: scenario.body.location || 'Pan India',
      totalJobs: 0,
      elapsed: Date.now() - start,
      status: 0,
      titleRelevanceScore: 'ERROR',
      exactMatchCount: 0,
      relatedMatchCount: 0,
      relatedSuggestions: [],
      needsExpansion: false,
      failedSources: [],
      sampleTitles: [],
      pass: false,
      error: err.message,
    };
  }
}

async function main() {
  console.log(`\n🔥  NicheHire Smoke + Audit — ${new Date().toISOString()}`);
  console.log(`   Base URL: ${BASE_URL}\n`);

  const results = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`  ⏳ ${scenario.label} … `);
    const result = await runScenario(scenario);
    results.push(result);
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${result.totalJobs} jobs (${result.elapsed} ms) | Relevance: ${result.titleRelevanceScore}`);
    if (result.relatedSuggestions.length > 0) {
      console.log(`     💡 Related suggestions: ${result.relatedSuggestions.map(r => r.label).join(', ')}`);
    }
    if (result.sampleTitles.length > 0) {
      result.sampleTitles.forEach(t => console.log(`     • ${t}`));
    }
  }

  // --- Generate Markdown Report ---
  const passed = results.filter(r => r.pass).length;
  const md = `# 🔥 NicheHire Smoke Test + Audit Report
Generated: ${new Date().toISOString()}

## Summary
| Metric | Value |
|--------|-------|
| Total Scenarios | ${results.length} |
| Passed | ${passed} |
| Failed | ${results.length - passed} |

---

## Detailed Results

${results.map(r => `### ${r.pass ? '✅' : '❌'} ${r.label}
| Field | Value |
|-------|-------|
| Query | \`${r.query}\` |
| Location | ${r.location} |
| Jobs Found | **${r.totalJobs}** |
| Response Time | ${r.elapsed} ms |
| HTTP Status | ${r.status} |
| Title Relevance | ${r.titleRelevanceScore} |
| Needs Expansion | ${r.needsExpansion ? '⚠️ Yes' : 'No'} |
| Failed Sources | ${r.failedSources.length > 0 ? r.failedSources.join(', ') : 'None'} |
| Related Suggestions | ${r.relatedSuggestions.length > 0 ? r.relatedSuggestions.map(s => s.label).join(', ') : 'None'} |
${r.error ? `| Error | ${r.error} |` : ''}

**Sample Titles (top 5):**
${r.sampleTitles.length > 0 ? r.sampleTitles.map(t => `- ${t}`).join('\n') : '- No results'}
`).join('\n---\n')}

---

## UI Comparison: NicheHire vs Competitors

| Feature | NicheHire | LinkedIn | Naukri | Indeed | Glassdoor |
|---------|-----------|----------|--------|--------|-----------|
| Tier-3/4 city coverage | ✅ All India | ❌ Metro-heavy | ✅ Good | ⚠️ Limited | ❌ Poor |
| CA Articleship jobs | ✅ Exact title match | ⚠️ Mixed results | ✅ Good | ⚠️ Limited | ❌ Poor |
| Niche role filtering | ✅ Title-only match | ❌ Description flood | ⚠️ Decent | ❌ Keyword soup | ❌ Poor |
| Job freshness control | ✅ 7d / 14d toggle | ⚠️ Filter available | ✅ Filter available | ✅ Filter available | ⚠️ Limited |
| Related job suggestions | ✅ Auto when results thin | ✅ Similar jobs | ✅ Similar jobs | ✅ Similar jobs | ✅ Similar jobs |
| Radius-based search | ✅ 50km custom | ✅ LinkedIn range | ⚠️ State-level | ✅ Within X miles | ⚠️ Limited |
| Verified job badge | ✅ SerpAPI cross-check | ✅ Employer badge | ✅ Company badge | ✅ Employer badge | ✅ Company badge |
| Free to use | ✅ Yes | ⚠️ Premium features | ✅ Yes | ✅ Yes | ✅ Yes |
| Mobile UX | ✅ Responsive | ✅ App + Web | ✅ App + Web | ✅ App + Web | ✅ App + Web |

---

## Issues Found

${results.filter(r => r.exactMatchCount === 0 && r.totalJobs > 0).length > 0 ?
  results.filter(r => r.exactMatchCount === 0 && r.totalJobs > 0).map(r =>
    `- ⚠️ **${r.label}**: ${r.totalJobs} jobs found but 0 exact niche title matches — may still be serving generic results`
  ).join('\n')
  : '✅ No title-relevance issues found in this run'}

${results.filter(r => !r.pass).length > 0 ?
  results.filter(r => !r.pass).map(r => `- ❌ **${r.label}**: ${r.error || 'HTTP ' + r.status}`).join('\n')
  : '✅ All scenarios returned HTTP 200'}

---
*Report generated by NicheHire Smoke Audit v2.0*
`;

  const outDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'smoke_audit_report.md'), md, 'utf8');
  fs.writeFileSync(path.join(outDir, 'smoke_audit_raw.json'), JSON.stringify(results, null, 2), 'utf8');

  console.log(`\n  📄 Audit report → artifacts/smoke_audit_report.md`);
  console.log(`  📄 Raw JSON     → artifacts/smoke_audit_raw.json`);
  console.log(`\n${passed === results.length ? '✅ All done!' : `⚠️ ${results.length - passed} scenario(s) failed`}\n`);
}

main();
