import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About & Verification Engine — How NicheHire Guarantees Genuine Jobs',
  description:
    'Learn how NicheHire eliminates ghost jobs, scam listings, and aggregator noise through direct enterprise career portal scrapers and our strict 7-day freshness cutoff.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#12172B] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#12172B] flex items-center justify-center text-white font-bold text-xs">
              NH
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-base text-[#12172B] tracking-tight">
                NicheHire
              </span>
              <span className="ml-2 px-1.5 py-0.5 text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] rounded border border-[#A7F3D0]">
                Verified Direct
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4 text-xs font-medium">
            <Link href="/" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors">
              Search jobs
            </Link>
            <Link
              href="/pricing"
              className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors"
            >
              Employer pricing
            </Link>
            <Link
              href="/pricing"
              className="px-3.5 py-1.5 text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors"
            >
              Post a job ➔
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
        {/* Hero Section */}
        <section className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] text-xs text-[#5B6478]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
            <span>The anti-ghost job manifesto</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-normal text-[#12172B] tracking-tight leading-tight">
            Built to fix everything broken about <br />
            <span className="font-serif italic text-[#12172B]">traditional job boards.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#5B6478] leading-relaxed">
            Many job seekers on conventional aggregators struggle with &ldquo;ghost jobs&rdquo; — expired postings, scraped duplicates, or vacancies filled weeks ago. NicheHire was engineered with one non-negotiable principle: <strong className="text-[#12172B] font-semibold">direct navigation to official corporate portals, zero recruiter spam, and radical transparency.</strong>
          </p>
        </section>

        {/* The 4-Pillar Verification Engine */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-medium text-[#5B6478]">Our verification architecture</span>
            <h2 className="text-2xl font-semibold text-[#12172B]">The 4-pillar verification engine</h2>
            <p className="text-xs text-[#5B6478]">
              How we validate opportunities before presenting them in your feed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pillar 1 */}
            <div className="p-6 bg-white rounded-md border border-[#E4E7EC] space-y-3">
              <div className="w-8 h-8 rounded bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-base font-semibold text-[#12172B]">Direct ATS &amp; career portal ingestion</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                We do not re-scrape third-party aggregator sites. Instead, our automated engine queries official enterprise ATS infrastructure (Greenhouse, Lever, SAP SuccessFactors, Workday) and directly scrapes verified corporate career portals (such as Google, Microsoft, Amazon, Tata Group, Vercel, and Stripe).
              </p>
              <div className="text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] px-2.5 py-1.5 rounded border border-[#A7F3D0]">
                ✓ Every apply link directs straight to the employer&apos;s authenticated domain.
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 bg-white rounded-md border border-[#E4E7EC] space-y-3">
              <div className="w-8 h-8 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#0E9F6E] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-base font-semibold text-[#12172B]">Strict ≤ 7-day freshness cutoff</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Most job boards keep postings alive for 90 to 180 days to artificially inflate listing counts. On NicheHire, if a job is more than 7 days old, it is automatically purged from the index. You only spend your energy applying to jobs where hiring teams are actively reviewing candidates.
              </p>
              <div className="text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] px-2.5 py-1.5 rounded border border-[#A7F3D0]">
                ✓ Filter by 6h, 12h, 24h, or 3 days with real timestamps.
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 bg-white rounded-md border border-[#E4E7EC] space-y-3">
              <div className="w-8 h-8 rounded bg-[#F7F8FA] border border-[#E4E7EC] text-[#2B4EE6] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-base font-semibold text-[#12172B]">Hierarchical geographic proximity engine</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                When you search for jobs in a city (like Bangalore, Delhi NCR, or Mumbai), other platforms flood you with irrelevant jobs worldwide. Our deterministic geographic hierarchy prioritizes jobs in: Local City → District → State Hubs → State → India → Global Remote.
              </p>
              <div className="text-[11px] font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 px-2.5 py-1.5 rounded border border-[#2B4EE6]/20">
                ✓ See local openings first without wading through international spam.
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 bg-white rounded-md border border-[#E4E7EC] space-y-3">
              <div className="w-8 h-8 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#D97B0A] flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-base font-semibold text-[#12172B]">Anti-scam &amp; zero-fee guarantee</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Job seekers will never be charged a single rupee on NicheHire. We strictly prohibit fake employment offers, WhatsApp interview redirects, security deposit requests, and pyramid schemes. Any employer submitting a role must authenticate via a verified corporate domain.
              </p>
              <div className="text-[11px] font-medium text-[#12172B] bg-[#F7F8FA] px-2.5 py-1.5 rounded border border-[#E4E7EC]">
                ✓ 100% Free for candidates, always.
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Platform Stats */}
        <section className="bg-[#12172B] text-white rounded-md p-6 sm:p-10 border border-[#12172B]">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div>
              <span className="text-xs font-medium text-gray-400">Live verification telemetry</span>
              <h2 className="text-2xl font-semibold mt-1">Numbers that define our integrity</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded border border-white/10 bg-white/5">
                <div className="text-2xl sm:text-3xl font-bold text-white">≤ 7d</div>
                <div className="text-xs text-gray-400 mt-1">Strict max age</div>
              </div>
              <div className="p-4 rounded border border-white/10 bg-white/5">
                <div className="text-2xl sm:text-3xl font-bold text-[#0E9F6E]">35+</div>
                <div className="text-xs text-gray-400 mt-1">Direct portals</div>
              </div>
              <div className="p-4 rounded border border-white/10 bg-white/5">
                <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
                <div className="text-xs text-gray-400 mt-1">Direct links</div>
              </div>
              <div className="p-4 rounded border border-white/10 bg-white/5">
                <div className="text-2xl sm:text-3xl font-bold text-[#0E9F6E]">₹0</div>
                <div className="text-xs text-gray-400 mt-1">Cost to candidates</div>
              </div>
            </div>

            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              Our continuous crawlers monitor corporate career sites and update the directory around the clock so you never waste time on closed jobs.
            </p>
          </div>
        </section>

        {/* AI Apply Chances & Recruiter Outreach */}
        <section className="bg-white rounded-md border border-[#E4E7EC] p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-[#5B6478]">Candidate decision support</span>
              <h2 className="text-xl font-semibold text-[#12172B]">AI-powered application guidance</h2>
              <p className="text-xs text-[#5B6478] mt-1">
                Drop your resume once, and our AI analyzes matching skills, experience gaps, and your chance rating.
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors"
            >
              Try resume match ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <h4 className="text-xs font-semibold text-[#12172B]">High / Med / Low chances</h4>
              <p className="text-xs text-[#5B6478] leading-relaxed">Know your competitive edge before investing time into a lengthy application form.</p>
            </div>
            <div className="p-4 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <h4 className="text-xs font-semibold text-[#12172B]">Direct recruiter outreach</h4>
              <p className="text-xs text-[#5B6478] leading-relaxed">Find official corporate HR emails and generate personalized cover email drafts in 1-click.</p>
            </div>
            <div className="p-4 bg-[#F7F8FA] rounded border border-[#E4E7EC] space-y-1">
              <h4 className="text-xs font-semibold text-[#12172B]">Role-specific prep guide</h4>
              <p className="text-xs text-[#5B6478] leading-relaxed">Instant practice questions, company background research, and role talking points.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="text-center py-6 border-t border-[#E4E7EC] space-y-3">
          <h3 className="text-xl font-semibold text-[#12172B]">Ready to find verified opportunities?</h3>
          <p className="text-xs text-[#5B6478]">No sign-up wall to search. Search instantly across verified listings.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link
              href="/"
              className="px-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors"
            >
              Explore live jobs ➔
            </Link>
            <Link
              href="/pricing"
              className="px-5 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-medium text-xs rounded border border-[#E4E7EC] transition-colors"
            >
              For employers &amp; recruiters
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E4E7EC] py-8 text-center text-xs text-[#5B6478]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
          <div className="flex justify-center gap-4 text-xs font-medium text-[#12172B]">
            <Link href="/" className="hover:text-[#2B4EE6]">Home</Link>
            <Link href="/about" className="hover:text-[#2B4EE6]">About &amp; trust</Link>
            <Link href="/pricing" className="hover:text-[#2B4EE6]">Employer pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
