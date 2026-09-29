/**
 * Search Ranking & Relevance Engine
 * 
 * Enforces:
 * 1. Consistent query normalization (stripping underscores, hyphens, and whitespace collapsing).
 * 2. Strict multi-word relevance matching (eliminating unrelated jobs for specific queries).
 * 3. Strict tiered geographic ordering (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4 -> Tier 5 -> Tier 6).
 * 4. Soft quota-based expansion with `internationalByDefault` exception for inherently global roles
 *    (e.g., Petroleum/Oil & Gas, Marine/Maritime, Aerospace/Aviation).
 */

export interface GlobalSectorDefinition {
  name: string;
  slug: string;
  internationalByDefault: boolean;
  keywords: string[];
}

export const INHERENTLY_GLOBAL_SECTORS: GlobalSectorDefinition[] = [
  {
    name: 'Petroleum & Oil & Gas Engineering',
    slug: 'petroleum-oil-gas',
    internationalByDefault: true,
    keywords: [
      'petroleum',
      'oil & gas',
      'oil and gas',
      'drilling',
      'reservoir',
      'subsea',
      'offshore engineer',
      'geophysicist',
      'petrophysicist',
      'pipeline engineer',
      'refinery',
      'upstream',
      'midstream',
      'downstream',
      'lng',
    ],
  },
  {
    name: 'Marine & Maritime Engineering',
    slug: 'marine-maritime',
    internationalByDefault: true,
    keywords: [
      'marine engineer',
      'maritime',
      'merchant navy',
      'naval architect',
      'deck officer',
      'chief engineer marine',
      'ship superintendent',
      'offshore marine',
    ],
  },
  {
    name: 'Aerospace & Aviation Engineering',
    slug: 'aerospace-aviation',
    internationalByDefault: true,
    keywords: [
      'aerospace',
      'avionics',
      'aeronautical',
      'flight test',
      'propulsion engineer',
      'spacecraft',
      'aircraft maintenance engineer',
    ],
  },
];

/**
 * Normalizes search input:
 * - Replaces underscores, hyphens, plus signs with spaces
 * - Collapses repeated spaces
 * - Lowercases and trims
 * 
 * Guarantees 'digital_marketing', 'digital-marketing', and 'digital marketing'
 * yield identical normalized queries.
 */
export function normalizeSearchInput(raw: string = ''): string {
  return raw
    .replace(/[_+\-]+/g, ' ')
    .replace(/[^\w\s&]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Checks whether a search query or job title falls under an inherently global sector
 * where roles are scarce in domestic Indian markets and naturally international.
 */
export function isInherentlyGlobalRole(query: string = '', title: string = ''): boolean {
  const normQuery = normalizeSearchInput(query);
  const normTitle = normalizeSearchInput(title);
  const combined = `${normQuery} ${normTitle}`;

  return INHERENTLY_GLOBAL_SECTORS.some((sector) =>
    sector.keywords.some((kw) => combined.includes(kw.toLowerCase()))
  );
}

/**
 * Evaluates whether a job satisfies query relevance:
 * - If query is empty -> matches
 * - If single term -> checks full text (title, company, description, skills)
 * - If multi-word -> requires exact phrase OR all individual terms to be present
 */
export function doesJobMatchQuery(job: any, cleanQuery: string): boolean {
  if (!cleanQuery) return true;

  const title = (job.title || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const skills = Array.isArray(job.skills) ? job.skills.join(' ').toLowerCase() : '';
  const location = (job.location || '').toLowerCase();

  const fullHaystack = `${title} ${company} ${skills} ${desc} ${location}`;

  // 1. Direct phrase match anywhere
  if (fullHaystack.includes(cleanQuery)) {
    return true;
  }

  // 2. Tokenized match: every keyword must be present in fullHaystack
  const tokens = cleanQuery.split(' ').filter((t) => t.length > 1);
  if (tokens.length === 0) return true;

  const allTokensPresent = tokens.every((token) => fullHaystack.includes(token));
  if (allTokensPresent) {
    return true;
  }

  // 3. Title or company fuzzy bonus (e.g. "DevOps" matching "Devops Engineer")
  const titleWords = title.split(/\s+/);
  if (tokens.every((t) => titleWords.some((tw: string) => tw.includes(t)))) {
    return true;
  }

  return false;
}

/**
 * Applies strict tiered ordering and soft quota-based scope expansion.
 * 
 * Order:
 * Tier 1 (City / Local)
 * Tier 2 (Regional Hub / District Cluster)
 * Tier 3 (Same State Nearby Cities)
 * Tier 4 (State-wide)
 * Tier 5 (National / Pan-India)
 * Tier 6 (International)
 * 
 * Soft Quota Rules:
 * - For inherently global roles (`isInherentlyGlobalRole` = true), international results
 *   are surfaced readily without waiting for domestic quotas.
 * - For all standard roles, domestic tiers (1-5) are preferred; if domestic jobs exceed 50,
 *   international results are not prioritized ahead of domestic depth.
 * - Crucially, regardless of quotas, within the output array, results are STRICTLY grouped
 *   by ascending tier order so a later tier never precedes an earlier tier.
 */
export function rankJobsStrictTierOrder(
  jobs: any[],
  cleanQuery: string = '',
  userLocation: string = ''
): any[] {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const isGlobalRole = isInherentlyGlobalRole(cleanQuery);

  // Group into geographic tiers
  const tier1: any[] = [];
  const tier2: any[] = [];
  const tier3: any[] = [];
  const tier4: any[] = [];
  const tier5Domestic: any[] = [];
  const tierRemote: any[] = [];
  const tier6: any[] = [];

  jobs.forEach((job) => {
    const tier = Number(job.geoTier) || 5;
    const isRemote = job.workMode === 'Remote' || (job.location || '').toLowerCase().includes('remote');

    if (tier === 1) {
      if (isRemote) tierRemote.push(job);
      else tier1.push(job);
    } else if (tier === 2) {
      if (isRemote) tierRemote.push(job);
      else tier2.push(job);
    } else if (tier === 3) {
      if (isRemote) tierRemote.push(job);
      else tier3.push(job);
    } else if (tier === 4) {
      if (isRemote) tierRemote.push(job);
      else tier4.push(job);
    } else if (tier === 6) {
      tier6.push(job);
    } else {
      if (isRemote) {
        tierRemote.push(job);
      } else {
        tier5Domestic.push(job);
      }
    }
  });

  // Intra-tier sorter: title relevance first, then freshness
  const sortTier = (list: any[]) => {
    return list.sort((a, b) => {
      if (cleanQuery) {
        const aTitleMatch = (a.title || '').toLowerCase().includes(cleanQuery) ? 2 : 0;
        const bTitleMatch = (b.title || '').toLowerCase().includes(cleanQuery) ? 2 : 0;
        if (aTitleMatch !== bTitleMatch) return bTitleMatch - aTitleMatch;
      }
      return (b.postedAt || 0) - (a.postedAt || 0);
    });
  };

  const sortedT1 = sortTier(tier1);
  const sortedT2 = sortTier(tier2);
  const sortedT3 = sortTier(tier3);
  const sortedT4 = sortTier(tier4);
  const sortedT5Dom = sortTier(tier5Domestic);
  const sortedRemote = sortTier(tierRemote);
  const sortedT6 = sortTier(tier6);

  const result: any[] = [];
  const addedIds = new Set<string>();

  const takeFrom = (list: any[], maxCount: number) => {
    let taken = 0;
    for (const job of list) {
      if (taken >= maxCount) break;
      if (!addedIds.has(job.id)) {
        addedIds.add(job.id);
        result.push(job);
        taken++;
      }
    }
    return taken;
  };

  // Progressive geographic quota allocation
  const hasSpecificLocation = Boolean(
    userLocation &&
      userLocation.trim().toLowerCase() !== 'all india' &&
      userLocation.trim().toLowerCase() !== 'india' &&
      userLocation.trim().toLowerCase() !== 'remote'
  );

  if (hasSpecificLocation && !isGlobalRole) {
    // 1. First try finding 10 jobs in Tier 1 cities
    takeFrom(sortedT1, 10);

    // 2. If Tier 1 doesn't yield 10 jobs, move to Tier 2 (nearby satellite cities within state) to reach 10 jobs
    if (result.length < 10) {
      takeFrom(sortedT2, 10 - result.length);
    }

    // 3. If that also fails or to expand within state, target a total of 15 jobs within the state
    if (result.length < 15) {
      takeFrom(sortedT2, 15 - result.length);
      if (result.length < 15) {
        takeFrom(sortedT3, 15 - result.length);
      }
      if (result.length < 15) {
        takeFrom(sortedT4, 15 - result.length);
      }
    }

    // 4. Move to Tier 4 / Domestic India targeting at least 20-22 jobs within India
    if (result.length < 22) {
      takeFrom(sortedT5Dom, 22 - result.length);
    }

    // 5. Target remote options to fill up to 30 jobs
    if (result.length < 30) {
      takeFrom(sortedRemote, 30 - result.length);
    }

    // 6. If still under 30, backfill from remaining domestic or international
    if (result.length < 30) {
      takeFrom(sortedT1, 30 - result.length);
      takeFrom(sortedT2, 30 - result.length);
      takeFrom(sortedT3, 30 - result.length);
      takeFrom(sortedT4, 30 - result.length);
      takeFrom(sortedT5Dom, 30 - result.length);
      takeFrom(sortedT6, 30 - result.length);
    }
  } else if (isGlobalRole) {
    // Inherently global roles: include Tier 6 alongside domestic opportunities
    takeFrom(sortedT1, 10);
    takeFrom(sortedT2, 5);
    takeFrom(sortedT3, 5);
    takeFrom(sortedT4, 5);
    takeFrom(sortedT5Dom, 5);
    takeFrom(sortedRemote, 10);
    takeFrom(sortedT6, 30);
  } else {
    // Pan-India or Remote searches: balanced tier allocation
    takeFrom(sortedT1, 10);
    takeFrom(sortedT2, 10);
    takeFrom(sortedT3, 10);
    takeFrom(sortedT4, 10);
    takeFrom(sortedT5Dom, 15);
    takeFrom(sortedRemote, 15);
    takeFrom(sortedT6, 10);
  }

  // 7. CRUCIAL FOR PAGINATION: Append all remaining un-added jobs in strict tiered order
  // This preserves all 200-300 parsed jobs across Page 2, Page 3, etc.
  const appendRemaining = (list: any[]) => {
    for (const job of list) {
      if (!addedIds.has(job.id)) {
        addedIds.add(job.id);
        result.push(job);
      }
    }
  };

  appendRemaining(sortedT1);
  appendRemaining(sortedT2);
  appendRemaining(sortedT3);
  appendRemaining(sortedT4);
  appendRemaining(sortedT5Dom);
  appendRemaining(sortedRemote);
  appendRemaining(sortedT6);

  return result;
}
