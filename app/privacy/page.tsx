import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Check } from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

export const metadata = {
  title: 'Privacy Policy — NicheHire',
  description: 'NicheHire Privacy Policy and DPDP Act compliance. In-memory resume processing with zero data selling guarantee.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#12172B] font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-[#5B6478] hover:text-[#12172B] transition-colors">
            <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Back to Job Search</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
            <span className="text-xs font-medium text-[#5B6478]">DPDP Act 2023 Compliant</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] text-xs font-medium">
            <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Candidate Data Sovereignty Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#12172B]">
            NicheHire Privacy Policy
          </h1>
          <p className="text-xs text-[#5B6478]">
            Last updated: September 27, 2026 • Effective Date: September 27, 2026
          </p>
        </div>

        {/* Core Pillars Banner */}
        <div className="bg-white p-6 rounded-md border border-[#E4E7EC] space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#12172B]">
            <Lock size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
            <span>Our 3 Core Privacy Commitments</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-[#5B6478]">
            <div className="p-3 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block">1. Zero Data Selling</strong>
              <p>We never sell, rent, or monetize your resume, contact info, or personal identifiers to third-party telemarketers or external brokers.</p>
            </div>
            <div className="p-3 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block">2. In-Memory Resume Parsing</strong>
              <p>Uploaded CVs are processed in-memory solely to generate fit scores and ATS tailor recommendations. Raw files are not permanently retained.</p>
            </div>
            <div className="p-3 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block">3. Direct Employer Linkage</strong>
              <p>Applications route directly to official enterprise portals (e.g. Greenhouse, Workday, Lever). NicheHire acts as a direct discovery gateway.</p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-xs text-[#5B6478] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">1. Information We Collect</h2>
            <p>
              When you use NicheHire as a job seeker or employer, we may collect the following categories of data:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Identifiers:</strong> Email address, encrypted password hash, and optional display name managed securely through Supabase Authentication.</li>
              <li><strong>Candidate Resume Data:</strong> Work history, skills, qualifications, and educational background provided voluntarily during AI matching or Resume Builder workflows.</li>
              <li><strong>Employer Verification Data:</strong> Corporate work email, organization name, corporate portal URL, and UPI Transaction Reference (UTR) for verified payment reconciliation.</li>
              <li><strong>Technical Telemetry:</strong> Anonymized browser type, query role, optional city/district location (only when geolocation is explicitly authorized by you), and session timestamps.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">2. How We Use Your Data</h2>
            <p>We process collected data exclusively for the following legitimate purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To match candidate skills against active job descriptions and calculate objective High / Medium / Low Apply Chances.</li>
              <li>To generate customized, ATS-aligned resume drafts and interview preparation questionnaires requested by the user.</li>
              <li>To verify employer corporate domain authority and uphold our zero-ghost-job policy.</li>
              <li>To facilitate UPI payment verification by our founder against bank transaction records without intermediary surcharge.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">3. Data Retention &amp; Deletion</h2>
            <p>
              Under the Digital Personal Data Protection (DPDP) Act 2023, you hold full sovereignty over your personal records. You may request permanent deletion of your profile, referral codes, and saved jobs at any time by contacting our data fiduciary team via the feedback portal or at founder@nichehire.in.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">4. Security &amp; Storage Architecture</h2>
            <p>
              All database communications are encrypted in transit using TLS 1.3 and at rest with AES-256. Database authentication and Row Level Security (RLS) are strictly enforced across our Supabase cluster. No unauthenticated third-party scrapers have access to user records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">5. Contact Data Protection Officer</h2>
            <p>
              For grievances, queries, or formal data deletion notices, contact: <br />
              <strong className="text-[#12172B]">Data Protection Fiduciary:</strong> Harshit Mishra (Founder, NicheHire) <br />
              <strong className="text-[#12172B]">Email:</strong> harshit0913@gmail.com / feedback portal.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
