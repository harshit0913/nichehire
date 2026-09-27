import { VERIFIED_GOVT_EXAMS, GovtExam } from '../data/govtExamsData';
import {
  STATE_UT_PSC_DIRECTORIES,
  CENTRAL_RECRUITMENT_TIMETABLE,
  StateUtPscInfo,
  CentralRecruitmentExam,
} from '../data/govtCalendarData';

export interface GovtCrossPortalMatch {
  isGovtExam: boolean;
  query: string;
  matchedTitle: string;
  conductingBody: string;
  category: 'central' | 'state' | 'regional' | 'psu';
  targetUrl: string;
  examId?: string;
  officialPortalUrl?: string;
  advisoryNote: string;
}

/**
 * Normalizes user search query by stripping special punctuation, underscores,
 * hyphens, and collapsing extra whitespace.
 */
export function normalizeSearchQuery(query: string = ''): string {
  return query
    .replace(/[_+\-]+/g, ' ')
    .replace(/[^\w\s&]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Common government exam/recruitment tokens and acronyms recognized across India
 */
const KNOWN_GOVT_ACRONYMS = new Set([
  'upsc',
  'ssc',
  'cgl',
  'chsl',
  'mts',
  'cpo',
  'rrb',
  'ntpc',
  'alp',
  'ibps',
  'sbi',
  'sbi po',
  'sbi clerk',
  'rbi',
  'rbi grade b',
  'nda',
  'cds',
  'afcat',
  'capf',
  'drdo',
  'isro',
  'nabard',
  'sebi',
  'sidbi',
  'mppsc',
  'bpsc',
  'uppsc',
  'kpsc',
  'tnpsc',
  'mpsc',
  'gpsc',
  'appsc',
  'tspsc',
  'rpsc',
  'wbpsc',
  'opsc',
  'hpsc',
  'ppsc',
  'jkpsc',
  'bssc',
  'upsssc',
  'mppeb',
  'vyapam',
  'esb',
  'iocl',
  'ongc',
  'bpcl',
  'hpcl',
  'gail',
  'ntpc psu',
  'sail',
  'bhel',
  'bel',
  'hal',
  'coal india',
  'aai',
  'barc',
  'npcil',
]);

/**
 * Inspects a query from the private job search bar.
 * If it matches any verified government recruitment, public service commission (PSC),
 * central examination timetable, or PSU recruitment, returns structured cross-portal guidance.
 */
export function detectGovtCrossPortalSuggestion(
  rawQuery: string = ''
): GovtCrossPortalMatch | null {
  const clean = normalizeSearchQuery(rawQuery);
  if (!clean || clean.length < 2) return null;

  // 1. Direct Acronym / Keyword Match
  const words = clean.split(' ').filter(Boolean);
  const hasAcronym =
    KNOWN_GOVT_ACRONYMS.has(clean) ||
    words.some((w) => KNOWN_GOVT_ACRONYMS.has(w));

  // 2. Check in VERIFIED_GOVT_EXAMS (Direct Active Openings)
  for (const exam of VERIFIED_GOVT_EXAMS) {
    const titleLow = normalizeSearchQuery(exam.title);
    const bodyLow = normalizeSearchQuery(exam.conductingBody);
    const idLow = exam.id.toLowerCase();

    const matchesTitle = titleLow.includes(clean) || clean.includes(titleLow);
    const matchesBody = bodyLow.includes(clean);
    const matchesId = idLow.includes(clean.replace(/\s+/g, '-'));

    // Check if multi-word token overlap
    const titleWords = titleLow.split(' ');
    const allWordsInTitle = words.length > 1 && words.every((w) => titleWords.includes(w));

    if (matchesTitle || matchesBody || matchesId || allWordsInTitle) {
      return {
        isGovtExam: true,
        query: rawQuery,
        matchedTitle: exam.title,
        conductingBody: exam.conductingBody,
        category: exam.category,
        targetUrl: `/govt-exams?q=${encodeURIComponent(rawQuery.trim())}`,
        examId: exam.id,
        officialPortalUrl: exam.officialLinks?.officialPortalUrl,
        advisoryNote: `"${rawQuery}" is an official government recruitment conducted by ${exam.conductingBody}. We track active gazette notifications, admit cards, and eligibility criteria on our dedicated Government Portal.`,
      };
    }
  }

  // 3. Check in STATE_UT_PSC_DIRECTORIES (All 36 States & UTs)
  for (const psc of STATE_UT_PSC_DIRECTORIES) {
    const pscCode = psc.shortCode.toLowerCase();
    const pscName = normalizeSearchQuery(psc.commissionName);

    if (
      clean === pscCode ||
      clean.includes(pscCode) ||
      pscName.includes(clean) ||
      psc.primaryExams.some((e) => normalizeSearchQuery(e).includes(clean))
    ) {
      return {
        isGovtExam: true,
        query: rawQuery,
        matchedTitle: `${psc.shortCode} State Competitive Examinations`,
        conductingBody: psc.commissionName,
        category: 'state',
        targetUrl: `/govt-exams?q=${encodeURIComponent(psc.shortCode)}`,
        officialPortalUrl: psc.officialWebsite,
        advisoryNote: `"${rawQuery}" is conducted by ${psc.commissionName} for ${psc.state} administrative and gazetted posts.`,
      };
    }
  }

  // 4. Check in CENTRAL_RECRUITMENT_TIMETABLE (UPSC, SSC, Railways, Banking)
  for (const central of CENTRAL_RECRUITMENT_TIMETABLE) {
    const titleLow = normalizeSearchQuery(central.title);
    const agencyLow = normalizeSearchQuery(central.agency);

    if (titleLow.includes(clean) || clean.includes(titleLow) || agencyLow.includes(clean)) {
      return {
        isGovtExam: true,
        query: rawQuery,
        matchedTitle: central.title,
        conductingBody: central.agency,
        category: 'central',
        targetUrl: `/govt-exams?q=${encodeURIComponent(rawQuery.trim())}`,
        examId: central.id,
        officialPortalUrl: central.officialPortal,
        advisoryNote: `"${rawQuery}" is an annual central recruitment cycle managed by ${central.agency}. Expected cycle: ${central.annualNotificationMonth}.`,
      };
    }
  }

  // 5. If query contains a recognized government acronym alone (e.g. "SSC", "UPSC", "MPPSC", "RRB")
  if (hasAcronym) {
    const matchedAcronym = Array.from(KNOWN_GOVT_ACRONYMS).find(
      (a) => a === clean || words.includes(a)
    );
    const upperAcronym = (matchedAcronym || clean).toUpperCase();
    return {
      isGovtExam: true,
      query: rawQuery,
      matchedTitle: `${upperAcronym} Recruitment & Competitive Examination`,
      conductingBody: `${upperAcronym} Public Authority`,
      category: 'central',
      targetUrl: `/govt-exams?q=${encodeURIComponent(rawQuery.trim())}`,
      advisoryNote: `"${rawQuery}" appears to be a government competitive examination or commission (${upperAcronym}). Explore verified notifications on the Government Jobs portal.`,
    };
  }

  return null;
}
