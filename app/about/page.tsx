import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About & Verification Engine — How NicheHire Guarantees Genuine Jobs',
  description:
    'Learn how NicheHire eliminates ghost jobs, scam listings, and aggregator noise through direct enterprise career portal scrapers and our strict 7-day freshness cutoff.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              NH
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                NicheHire
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                Verified Engine
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors">
              💼 Search Jobs
            </Link>
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors"
            >
              🏷️ Employer Pricing
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-xs"
            >
              Post a Job ➔
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-semibold">
            <span>🛡️</span> The Anti-Ghost Job Manifesto
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Built to Fix Everything Broken About <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Modern Job Boards.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed">
            Over 40% of jobs listed on traditional job aggregators are &ldquo;ghost jobs&rdquo; — expired postings, fake listings designed to harvest candidate data, or vacancies filled weeks ago. NicheHire was engineered with one non-negotiable rule: <strong>every job must be 100% genuine and under 7 days old.</strong>
          </p>
        </section>

        {/* The 4-Pillar Verification Engine */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">The 4-Pillar NicheHire Verification Engine</h2>
            <p className="text-xs text-gray-500 mt-1">
              How we validate thousands of positions every day before presenting them to you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900">Direct ATS & Career Portal Ingestion</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                We do not re-scrape sketchy third-party aggregator sites. Instead, our automated engine queries official enterprise ATS infrastructure (Greenhouse, Lever, SAP SuccessFactors, Workday) and directly scrapes verified corporate career portals (such as Yash Technologies, Bellurbis, Kimirica, Vercel, and Stripe).
              </p>
              <div className="text-[11px] font-semibold text-blue-700 bg-blue-50/60 px-3 py-1.5 rounded-lg border border-blue-100">
                ✓ Every apply link directs straight to the employer&apos;s authenticated domain.
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900">Strict &le; 7-Day Freshness Cutoff</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Most job boards keep postings alive for 90 to 180 days to inflate their listing counts. On NicheHire, if a job is more than 7 days old, it is automatically pruned from search results. You only spend your energy applying to jobs where recruiters are actively reviewing resumes right now.
              </p>
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/60 px-3 py-1.5 rounded-lg border border-emerald-100">
                ✓ Filter by 6h, 12h, 24h, or 3 days with real timestamps.
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900">6-Tier Geographic Proximity Engine</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                When you search for jobs in a city (like Indore, MP), other platforms flood you with irrelevant jobs from across the world. Our deterministic geographic hierarchy prioritizes jobs in: Local City &rarr; District &rarr; State Tech Hubs &rarr; State &rarr; India &rarr; Global Remote.
              </p>
              <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/60 px-3 py-1.5 rounded-lg border border-indigo-100">
                ✓ See local openings first without wading through international spam.
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-bold text-gray-900">Anti-Scam & Zero-Fee Guarantee</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Job seekers will never be charged a single rupee on NicheHire. We strictly prohibit fake employment offers, WhatsApp interview redirects, security deposit requests, and pyramid schemes. Any employer submitting a role must authenticate via a verified corporate domain.
              </p>
              <div className="text-[11px] font-semibold text-amber-800 bg-amber-50/60 px-3 py-1.5 rounded-lg border border-amber-100">
                ✓ 100% Free for candidates, always.
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Platform Stats */}
        <section className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Live Verification Telemetry</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">Numbers That Define Our Integrity</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-blue-300">&le; 7d</div>
                <div className="text-xs text-gray-300 mt-1">Strict Max Age</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-emerald-300">35+</div>
                <div className="text-xs text-gray-300 mt-1">Direct Career Portals</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-amber-300">100%</div>
                <div className="text-xs text-gray-300 mt-1">Direct Domain Links</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                <div className="text-3xl sm:text-4xl font-black text-purple-300">₹0</div>
                <div className="text-xs text-gray-300 mt-1">Cost to Candidates</div>
              </div>
            </div>

            <p className="text-xs text-blue-200/80 max-w-xl mx-auto">
              Our continuous crawlers monitor corporate career sites and update the directory around the clock so you never waste time on closed jobs.
            </p>
          </div>
        </section>

        {/* AI Apply Chances & Recruiter Outreach */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
                <span>🤖</span> Beyond Just Job Search
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900">AI-Powered Apply Guidance</h2>
              <p className="text-xs text-gray-500 mt-1">
                Drop your resume once, and our AI analyzes matching skills, experience gaps, and your chance rating.
              </p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              Try Resume Match ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xl mb-1">🎯</div>
              <h4 className="text-xs font-bold text-gray-900">High / Med / Low Chances</h4>
              <p className="text-[11px] text-gray-500 mt-1">Know your competitive edge before investing time into a 45-minute application.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xl mb-1">✉️</div>
              <h4 className="text-xs font-bold text-gray-900">Direct Recruiter Outreach</h4>
              <p className="text-[11px] text-gray-500 mt-1">Find official corporate HR emails and generate personalized cover email drafts in 1-click.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xl mb-1">🎙️</div>
              <h4 className="text-xs font-bold text-gray-900">Role-Specific Prep Guide</h4>
              <p className="text-[11px] text-gray-500 mt-1">Instant practice questions, company background research, and role talking points.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="text-center py-6 border-t border-gray-200 space-y-4">
          <h3 className="text-xl font-extrabold text-gray-900">Ready to Find Verified Opportunities?</h3>
          <p className="text-xs text-gray-500">No sign-up wall to search. Search instantly across verified listings.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Explore Live Jobs ➔
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 transition-colors"
            >
              For Employers & Recruiters
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
          <div className="flex justify-center gap-4 text-xs font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <Link href="/about" className="hover:text-blue-600">About & Trust</Link>
            <Link href="/pricing" className="hover:text-blue-600">Employer Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
