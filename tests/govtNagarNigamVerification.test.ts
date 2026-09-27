import { VERIFIED_GOVT_EXAMS } from '../app/data/govtExamsData';
import { NAGAR_NIGAM_DIRECTORY, STATE_MUNICIPAL_OVERVIEWS } from '../app/data/nagarNigamDirectory';
import { ALL_INDIA_DISTRICT_DIRECTORY } from '../app/data/allIndiaDistrictsData';

function runTests() {
  console.log('================================================================');
  console.log('🏛️ GOVT EXAMS, NAGAR NIGAM & DISTRICT DIRECTORY VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: MPPSC State Service 2026
  console.log('\n1. Testing MPPSC State Service 2026 Accuracy:');
  const mppsc = VERIFIED_GOVT_EXAMS.find(e => e.id === 'mppsc-state-service-2026');
  assert(!!mppsc, 'MPPSC State Service 2026 exists in VERIFIED_GOVT_EXAMS');
  if (mppsc) {
    assert(mppsc.importantDates.applyEndDate === '2026-04-03', `Application deadline is strictly 2026-04-03 (found: ${mppsc.importantDates.applyEndDate})`);
    assert(mppsc.officialGazetteRef?.includes('Advt. No. 29/2025'), `Gazette reference matches Advt. No. 29/2025 (found: ${mppsc.officialGazetteRef})`);
    assert(new Date(mppsc.importantDates.applyEndDate).getTime() < new Date('2026-09-28').getTime(), 'Exam application date is strictly in the past (closed)');
    assert(mppsc.officialLinks.officialPortalUrl.includes('mppsc.mp.gov.in'), 'Official portal is authentic mppsc.mp.gov.in');
  }

  // Test 2: State ULB & Municipal Overviews
  console.log('\n2. Testing Pan-India State ULB Directory (36 States & UTs):');
  const stateNames = STATE_MUNICIPAL_OVERVIEWS.map(o => o.state);
  assert(STATE_MUNICIPAL_OVERVIEWS.length >= 36, `All 36 States & UTs represented in overviews (found: ${STATE_MUNICIPAL_OVERVIEWS.length})`);
  assert(stateNames.includes('Madhya Pradesh'), 'Madhya Pradesh is present');
  assert(stateNames.includes('Uttar Pradesh'), 'Uttar Pradesh is present');
  assert(stateNames.includes('Bihar'), 'Bihar is present');
  assert(stateNames.includes('Maharashtra'), 'Maharashtra is present');
  assert(stateNames.includes('Delhi'), 'Delhi is present');

  // Test 3: Nagar Nigam Directory
  console.log('\n3. Testing Nagar Nigam Master Catalog (~250+ Municipal Corporations):');
  assert(NAGAR_NIGAM_DIRECTORY.length >= 250, `Nagar Nigam directory contains over 250 corporations (found: ${NAGAR_NIGAM_DIRECTORY.length})`);
  const indore = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Indore'));
  assert(!!indore, 'Indore Municipal Corporation is listed');
  if (indore) {
    assert(indore.officialPortalUrl.includes('imcindore.mp.gov.in'), 'Indore portal URL is authentic imcindore.mp.gov.in');
    assert(indore.state === 'Madhya Pradesh', 'Indore state is Madhya Pradesh');
  }
  const patna = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Patna'));
  assert(!!patna, 'Patna Municipal Corporation is listed');
  if (patna) {
    assert(patna.officialPortalUrl.includes('pmc.bihar.gov.in'), 'Patna portal URL is authentic pmc.bihar.gov.in');
  }
  const lucknow = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Lucknow'));
  assert(!!lucknow, 'Lucknow Municipal Corporation is listed');
  const thane = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Thane'));
  assert(!!thane, 'Thane Municipal Corporation is listed');
  const gvmc = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Greater Visakhapatnam'));
  assert(!!gvmc, 'GVMC Visakhapatnam is listed');
  const ludhiana = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Ludhiana'));
  assert(!!ludhiana, 'Ludhiana Municipal Corporation is listed');
  const gurugram = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Gurugram'));
  assert(!!gurugram, 'Gurugram Municipal Corporation is listed');
  const bhubaneswar = NAGAR_NIGAM_DIRECTORY.find(n => n.name.includes('Bhubaneswar'));
  assert(!!bhubaneswar, 'Bhubaneswar Municipal Corporation is listed');

  // Test 4: All-India Districts Catalog (780+ Districts)
  console.log('\n4. Testing Pan-India Administrative District Directory (780+ Districts):');
  assert(ALL_INDIA_DISTRICT_DIRECTORY.length >= 750, `District directory contains >= 750 districts (found: ${ALL_INDIA_DISTRICT_DIRECTORY.length})`);
  const muzaffarpur = ALL_INDIA_DISTRICT_DIRECTORY.find(d => d.district === 'Muzaffarpur');
  assert(!!muzaffarpur, 'Muzaffarpur district is cataloged');
  if (muzaffarpur) {
    assert(muzaffarpur.nicPortalUrl.includes('muzaffarpur.nic.in'), 'Muzaffarpur NIC portal is correct');
  }
  const indoreDist = ALL_INDIA_DISTRICT_DIRECTORY.find(d => d.district === 'Indore');
  assert(!!indoreDist, 'Indore district is cataloged');
  if (indoreDist) {
    assert(indoreDist.nicPortalUrl.includes('indore.nic.in'), 'Indore NIC portal is correct');
  }

  // Test 5: Zero Fake Dates / Authentic Gazette Rules
  console.log('\n5. Testing Zero Fake Dates & Historical Gazette Truth in Verified Govt Exams:');
  const now = new Date('2026-09-28T00:00:00.000Z').getTime();

  // AAI ATC (Advt 12/2026) - User reported fake 28 Sep deadline, true IBPS closure was 07 Sep 2026
  const aai = VERIFIED_GOVT_EXAMS.find(e => e.id === 'aai-je-atc-2026');
  assert(!!aai, 'AAI JE ATC exists in database');
  if (aai) {
    assert(aai.importantDates.applyEndDate === '2026-09-07', `AAI JE ATC apply deadline is strictly 2026-09-07 matching IBPS portal (found: ${aai.importantDates.applyEndDate})`);
    assert(new Date(aai.importantDates.applyEndDate).getTime() < now, 'AAI JE ATC application is strictly closed');
    assert(aai.officialGazetteRef?.includes('12/2026') || aai.officialGazetteRef?.includes('03/2026'), 'AAI JE ATC gazette ref is authentic');
  }

  // DRDO CEPTAM-11 - Closed 11-Jan-2026
  const drdo = VERIFIED_GOVT_EXAMS.find(e => e.id === 'drdo-ceptam-11');
  assert(!!drdo, 'DRDO CEPTAM exists in database');
  if (drdo) {
    assert(drdo.importantDates.applyEndDate === '2026-01-11', `DRDO CEPTAM-11 apply deadline is strictly 2026-01-11 (found: ${drdo.importantDates.applyEndDate})`);
    assert(new Date(drdo.importantDates.applyEndDate).getTime() < now, 'DRDO CEPTAM is strictly closed');
  }

  // BHEL Engineer Trainee - Closed 14-Feb-2025
  const bhel = VERIFIED_GOVT_EXAMS.find(e => e.id === 'bhel-et-2026');
  assert(!!bhel, 'BHEL ET exists in database');
  if (bhel) {
    assert(bhel.importantDates.applyEndDate === '2025-02-14', `BHEL ET apply deadline is strictly 2025-02-14 (found: ${bhel.importantDates.applyEndDate})`);
    assert(new Date(bhel.importantDates.applyEndDate).getTime() < now, 'BHEL ET is strictly closed');
  }

  // ONGC Graduate Trainee - Closed 31-Jul-2026
  const ongc = VERIFIED_GOVT_EXAMS.find(e => e.id === 'ongc-gt-2026');
  assert(!!ongc, 'ONGC GT exists in database');
  if (ongc) {
    assert(ongc.importantDates.applyEndDate === '2026-07-31', `ONGC GT apply deadline is strictly 2026-07-31 (found: ${ongc.importantDates.applyEndDate})`);
    assert(new Date(ongc.importantDates.applyEndDate).getTime() < now, 'ONGC GT is strictly closed');
  }

  // NTPC EET - Closed 29-May-2026
  const ntpc = VERIFIED_GOVT_EXAMS.find(e => e.id === 'ntpc-eet-2026');
  assert(!!ntpc, 'NTPC EET exists in database');
  if (ntpc) {
    assert(ntpc.importantDates.applyEndDate === '2026-05-29', `NTPC EET apply deadline is strictly 2026-05-29 (found: ${ntpc.importantDates.applyEndDate})`);
    assert(new Date(ntpc.importantDates.applyEndDate).getTime() < now, 'NTPC EET is strictly closed');
  }

  // Kerala PSC Divisional Accountant - Closed 29-Jan-2025
  const kpsc = VERIFIED_GOVT_EXAMS.find(e => e.id === 'kerala-psc-div-accountant-2026');
  assert(!!kpsc, 'Kerala PSC Div Accountant exists in database');
  if (kpsc) {
    assert(kpsc.importantDates.applyEndDate === '2025-01-29', `Kerala PSC Div Accountant apply deadline is strictly 2025-01-29 (found: ${kpsc.importantDates.applyEndDate})`);
    assert(new Date(kpsc.importantDates.applyEndDate).getTime() < now, 'Kerala PSC Div Accountant is strictly closed');
  }

  // UKPSC Combined State Civil Services PCS 2026 - Active, closes 29-Sep-2026
  const ukpsc = VERIFIED_GOVT_EXAMS.find(e => e.id === 'ukpsc-pcs-exam-2026');
  assert(!!ukpsc, 'UKPSC PCS 2026 exists in database');
  if (ukpsc) {
    assert(ukpsc.importantDates.applyEndDate === '2026-09-29', `UKPSC PCS apply deadline is 2026-09-29 (found: ${ukpsc.importantDates.applyEndDate})`);
    assert(ukpsc.officialLinks.officialPortalUrl.includes('psc.uk.gov.in'), 'UKPSC portal is authentic psc.uk.gov.in');
  }

  // RRB NTPC CEN 06/2026 - Upcoming, opens 08-Oct-2026
  const rrb = VERIFIED_GOVT_EXAMS.find(e => e.id === 'rrb-ntpc-2026');
  assert(!!rrb, 'RRB NTPC exists in database');
  if (rrb) {
    assert(rrb.importantDates.applyStartDate === '2026-10-08', `RRB NTPC start date is 2026-10-08 (found: ${rrb.importantDates.applyStartDate})`);
    assert(rrb.importantDates.applyEndDate === '2026-11-06', `RRB NTPC end date is 2026-11-06 (found: ${rrb.importantDates.applyEndDate})`);
  }

  // MPPSC SSE 2026 is closed
  assert(!VERIFIED_GOVT_EXAMS.some(e => e.id === 'mppsc-state-service-2026' && new Date(e.importantDates.applyEndDate).getTime() > now), 'MPPSC SSE 2026 is strictly confirmed NOT to have an active future application date');

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
