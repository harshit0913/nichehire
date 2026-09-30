import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Check } from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

export const metadata = {
  title: 'Privacy Policy & DPDP Compliance — NicheHire',
  description: 'NicheHire Privacy Policy and DPDP Act 2023 compliance. In-memory ephemeral resume processing, browser-first storage, and zero data monetization.',
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
            NicheHire Privacy Policy &amp; Data Fiduciary Notice
          </h1>
          <p className="text-xs text-[#5B6478]">
            Last updated: September 27, 2026 • Effective Date: September 27, 2026 • Governing Law: Digital Personal Data Protection (DPDP) Act, 2023 (India)
          </p>
        </div>

        {/* Core Pillars Banner */}
        <div className="bg-white p-6 rounded-md border border-[#E4E7EC] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#12172B]">
            <Lock size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
            <span>Our Core Data Protection Commitments</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-[#5B6478]">
            <div className="p-3.5 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block font-semibold">1. Zero Data Selling</strong>
              <p>We never sell, broker, or monetize your resume, contact info, or personal identifiers to third-party telemarketers, credit agencies, or advertising brokers.</p>
            </div>
            <div className="p-3.5 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block font-semibold">2. Ephemeral In-Memory AI</strong>
              <p>Uploaded CVs are processed in temporary RAM buffers solely to extract structured skills and calculate fit scores. Raw files are never stored in cloud storage buckets.</p>
            </div>
            <div className="p-3.5 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <strong className="text-[#12172B] block font-semibold">3. Direct Portal Routing</strong>
              <p>Applications route directly to official enterprise ATS portals (e.g. Greenhouse, Workday, Lever). NicheHire acts as a direct discovery gateway, not a data custodian.</p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-xs text-[#5B6478] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">1. Information We Collect &amp; Architecture Principles</h2>
            <p>
              When you use NicheHire as a job seeker or employer, we process only the minimum necessary data required for job matching and employer verification:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Browser-First Local Storage:</strong> Candidate profile details (such as educational qualification, degree, domicile state, and draft resumes created via our Resume Builder) are persisted directly inside your device&apos;s browser <code className="text-[#12172B] bg-gray-100 px-1 py-0.5 rounded font-mono">localStorage</code>. They are not uploaded to central tracking servers.
              </li>
              <li>
                <strong>In-Memory Resume Parsing:</strong> When you upload a resume (PDF, DOCX) for AI skill screening or tailoring, the document is evaluated in an ephemeral server memory buffer by Google Gemini / Mammoth and immediately discarded. We do not maintain any persistent raw document storage buckets (e.g., AWS S3, Google Cloud Storage).
              </li>
              <li>
                <strong>Account Identifiers:</strong> Email address, encrypted authentication hashes, and optional display names managed through Supabase Authentication with Row-Level Security (RLS).
              </li>
              <li>
                <strong>Employer Verification Data:</strong> Corporate work email, corporate website domain, hiring hub locations, and 12-digit UPI Transaction Reference (UTR) numbers used solely for manual payment reconciliation by our founder.
              </li>
              <li>
                <strong>Zero Geolocation Persistence:</strong> When you use the &ldquo;Detect My Region&rdquo; feature, your device latitude and longitude are calculated against offline centroid boundaries purely in client-side memory to suggest your state and district. Raw GPS coordinates are never sent to or logged on our servers.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">2. Purpose of Processing &amp; AI Match Scoring</h2>
            <p>We process collected data exclusively for the following specified purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>AI Match Scoring:</strong> To evaluate skill overlap (50%), experience alignment (25%), and education requirements (20%) between your profile and verified job descriptions to output an objective High, Medium, or Low Match Score. NicheHire does not make automated hiring decisions or guarantee employment.
              </li>
              <li>
                <strong>ATS Tailoring &amp; Outreach Drafts:</strong> To generate customized cover emails and bullet point recommendations requested explicitly by you.
              </li>
              <li>
                <strong>Zero-Ghost-Job Verification:</strong> To authenticate corporate employer domains and ensure that job vacancies reflect active career portal openings.
              </li>
              <li>
                <strong>Bank UPI Reconciliation:</strong> To enable direct founder verification of employer membership payments without gateway fees or third-party card processors.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">3. Data Sovereignty &amp; Your DPDP Act Rights</h2>
            <p>
              In accordance with Section 11, 12, and 13 of the Digital Personal Data Protection Act, 2023, data principals hold the following statutory rights:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Right to Erasure &amp; Withdrawal:</strong> You may clear your locally stored profile data instantly using browser settings or request complete deletion of your account and application history by emailing our Data Protection Fiduciary.</li>
              <li><strong>Right to Access &amp; Portability:</strong> You may request a complete export of all data associated with your registered email address.</li>
              <li><strong>Right to Grievance Redressal:</strong> Any privacy concerns will be acknowledged within 24 hours and addressed within 7 business days.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">4. Security &amp; Storage Architecture</h2>
            <p>
              All data transmissions are encrypted using Transport Layer Security (TLS 1.3). Database tables are protected by AES-256 encryption at rest, and access controls are governed by strict Supabase Row Level Security (RLS) policies. No unauthenticated third parties or automated scrapers are granted access to candidate data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">5. Data Protection Fiduciary Contact</h2>
            <p>
              For statutory privacy notices, data erasure requests, or compliance inquiries under India&apos;s DPDP Act: <br />
              <strong className="text-[#12172B]">Data Protection Fiduciary:</strong> Harshit Mishra (Founder &amp; CEO, NicheHire) <br />
              <strong className="text-[#12172B]">Official Grievance Email:</strong> harshitmishra7073@gmail.com / harshit@nichehire.tech <br />
              <strong className="text-[#12172B]">Headquarters:</strong> India
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-[#E4E7EC] flex flex-wrap items-center justify-between gap-4 text-xs text-[#5B6478]">
          <p>© {new Date().getFullYear()} NicheHire. DPDP Act 2023 compliant privacy framework.</p>
          <div className="flex gap-4 font-medium text-[#12172B]">
            <Link href="/" className="hover:text-[#2B4EE6]">Home</Link>
            <Link href="/terms" className="hover:text-[#2B4EE6]">Terms of Service</Link>
            <Link href="/pricing" className="hover:text-[#2B4EE6]">Employer Pricing</Link>
            <Link href="/about" className="hover:text-[#2B4EE6]">About NicheHire</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
