import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Check } from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

export const metadata = {
  title: 'Terms of Service — NicheHire',
  description: 'NicheHire Terms of Service. Direct portal job search rules, employer listing standards, and anti-scam pledges.',
};

export default function TermsOfServicePage() {
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
            <span className="text-xs font-medium text-[#5B6478]">Direct Verified Portal Rules</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] text-xs font-medium">
            <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Anti-Scam &amp; Zero Ghost Jobs Framework</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#12172B]">
            NicheHire Terms of Service
          </h1>
          <p className="text-xs text-[#5B6478]">
            Last updated: September 27, 2026 • Effective Date: September 27, 2026
          </p>
        </div>

        <div className="space-y-6 text-xs text-[#5B6478] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">1. Overview &amp; Acceptance of Terms</h2>
            <p>
              By accessing or using NicheHire (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), whether as a candidate or employer, you agree to be bound by these Terms of Service. NicheHire operates as a curated directory and direct career gateway connecting candidates to verified corporate career portals without third-party recruitment intermediaries.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">2. Candidate Free-Use Policy</h2>
            <p>
              NicheHire is 100% free for candidates. We strictly forbid charging job seekers any registration fees, security deposits, or interview processing payments. Any employer or third party demanding money from candidates will be permanently barred and reported to relevant law enforcement authorities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">3. Employer Verification &amp; Corporate Domain Rules</h2>
            <p>Employers posting vacancies or walk-in hiring drives on NicheHire agree to the following mandatory standards:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Must post using an authentic, verifiable corporate email domain (no generic @gmail.com or @yahoo.com addresses for paid featured postings).</li>
              <li>Every vacancy must link directly to an active ATS or official company career portal.</li>
              <li>Job listings must be genuine and active; multi-level marketing (MLM), pyramid schemes, or unverified work-from-home data entry schemes are strictly prohibited.</li>
              <li>Positions older than 7 calendar days or filled roles must be promptly updated or closed.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">4. Direct UPI Payments &amp; Verification Policy</h2>
            <p>
              Employer listing fees (e.g. ₹499 Featured #1 Placement or ₹1,999 Growth Bundle) are paid directly via bank UPI with zero gateway surcharge. Activation of featured placement occurs following manual verification of the 12-digit UTR against official bank statements by our founder (Harshit Mishra).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">5. Disclaimer of Endorsement</h2>
            <p>
              Job listings from corporate career portals (such as Google, Microsoft, Amazon, Tata Group, Stripe) are indexed and curated from public, authoritative company career portals for candidate convenience. NicheHire is an independent job discovery platform and does not claim official agency, sponsorship, or partnership with these entities unless explicitly stated.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[#12172B]">6. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any dispute arising out of or related to the use of NicheHire shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
