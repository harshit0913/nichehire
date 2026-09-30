/**
 * GoogleForJobsJsonLd
 * Renders Google for Jobs structured data (schema.org/JobPosting) as a
 * server-safe <script type="application/ld+json"> block.
 *
 * Usage: render this inside the page that lists jobs so Googlebot can index
 * individual job postings and surface them in Google Search / Google for Jobs.
 *
 * Docs: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.nichehire.tech';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  salary?: string;
  description: string;
  url: string;
  postedAt?: number; // unix timestamp (ms)
  lastVerifiedAt?: string; // ISO string
}

function toIso(ts?: number | string): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString();
  return ts;
}

function mapEmploymentType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('full')) return 'FULL_TIME';
  if (t.includes('part')) return 'PART_TIME';
  if (t.includes('contract')) return 'CONTRACTOR';
  if (t.includes('intern')) return 'INTERN';
  return 'OTHER';
}

function buildJobPostingSchema(job: JobPosting) {
  // Google for Jobs requires a valid datePosted in ISO format
  const datePosted = toIso(job.postedAt);
  // Jobs older than 6 months are deprioritised; keep validThrough ~30 days ahead
  const validThrough = new Date(
    job.postedAt ? job.postedAt + 30 * 24 * 60 * 60 * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${job.title} at ${job.company}`,
    datePosted,
    validThrough,
    employmentType: mapEmploymentType(job.type),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      sameAs: job.url,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'India',
        addressCountry: 'IN',
      },
    },
    url: `${BASE_URL}/?jobId=${job.id}`,
    identifier: {
      '@type': 'PropertyValue',
      name: 'NicheHire',
      value: job.id,
    },
  };

  // Work-from-home flag (Google for Jobs feature)
  if (job.workMode === 'Remote') {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'India',
    };
  }

  // Salary (optional but improves CTR significantly in Google for Jobs)
  if (job.salary && job.salary.trim().length > 0) {
    const salaryText = job.salary.trim();
    // Try to extract a numeric range from text like "₹8–12 LPA" or "8-12 LPA"
    const match = salaryText.match(/(\d[\d,.]*)\s*[–\-]\s*(\d[\d,.]*)/);
    if (match) {
      const minVal = parseFloat(match[1].replace(/,/g, ''));
      const maxVal = parseFloat(match[2].replace(/,/g, ''));
      // Detect LPA → multiply to yearly INR (1 LPA = 100,000 INR)
      const isLpa = /lpa/i.test(salaryText);
      schema.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: isLpa ? minVal * 100000 : minVal,
          maxValue: isLpa ? maxVal * 100000 : maxVal,
          unitText: 'YEAR',
        },
      };
    }
  }

  return schema;
}

interface GoogleForJobsJsonLdProps {
  /** Pass up to 20 jobs — Google indexes up to 20 postings per page */
  jobs: JobPosting[];
}

/**
 * Drop this inside any server component (e.g. layout.tsx or a dedicated
 * server wrapper) to inject Google for Jobs structured data.
 *
 * NOTE: This component has no 'use client' — it renders pure HTML on the server.
 */
export default function GoogleForJobsJsonLd({ jobs }: GoogleForJobsJsonLdProps) {
  if (!jobs || jobs.length === 0) return null;

  // Limit to first 20; build one ld+json block per job for clarity
  const schemas = jobs.slice(0, 20).map(buildJobPostingSchema);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={`job-schema-${i}`}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data only, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

// Also export a standalone website schema for use in layout.tsx
export function WebsiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NicheHire',
    alternateName: 'NicheHire — Your Job Buddy!!',
    url: BASE_URL,
    description:
      'Verified job listings under 7 days old, direct from company career portals. Zero ghost jobs, AI candidate fit scoring, recruiter drafts, and public sector exams.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Organization schema
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NicheHire',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'harshit@nichehire.tech',
      contactType: 'customer support',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [
      'https://github.com/harshit1834/nichehire',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
