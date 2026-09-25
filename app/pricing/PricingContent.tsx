'use client';

import { useState } from 'react';
import Link from 'next/link';
import PostJobModal from '../components/PostJobModal';

export default function PricingContent() {
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'single' | 'growth'>('single');

  const openModalWithTier = (tier: 'free' | 'single' | 'growth') => {
    setSelectedTier(tier);
    setPostJobOpen(true);
  };

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
                For Employers
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors">
              💼 Candidate Search
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors">
              🛡️ Verification Engine
            </Link>
            <button
              onClick={() => openModalWithTier('single')}
              className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-xs"
            >
              Post a Job ➔
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span>🎁</span> Early Adopter Launch Special: Claim Your 1st Post Free
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Hire Faster with Verified Placement. <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              No Recurring Retainers. Pay Per Role.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed">
            Don&apos;t get locked into expensive monthly subscriptions before seeing results. Start with our <strong>₹4,999 single-post tier</strong> or test our <strong>free launch pilot</strong> to prove that our verified direct-portal model produces higher-intent tech hires.
          </p>
        </section>

        {/* Pricing Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: Free Launch Pilot (Inventory Builder) */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider border border-emerald-100">
                Launch Pilot
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">₹0</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    100% Free
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium">1st post for corporate employers</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Test applicant quality and hiring speed with zero financial commitment.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span><strong>1 Verified Job Post</strong> (Active 14 days)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Direct apply link to your <strong>Official Career Portal</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Google for Jobs <strong>Schema.org SEO Indexing</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Automated <strong>Domain Authenticity Check</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Standard candidate applicant feed</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('free')}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors border border-emerald-200"
              >
                Claim Free Launch Post ➔
              </button>
            </div>
          </div>

          {/* Card 2: Single Verified Post (THE MAIN OFFER - Elevated & Highlighted) */}
          <div className="bg-white rounded-3xl p-8 border-2 border-blue-600 shadow-xl flex flex-col justify-between relative transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-sm">
              Main Offer • Most Popular
            </div>

            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                Single Verified Post
              </div>
              <div>
                <span className="text-4xl font-black text-gray-900">₹4,999</span>
                <span className="text-xs text-gray-500 font-medium ml-1.5">/ single post (30 days)</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pay-per-hire with zero recurring commitments. Ideal to fill your key opening fast.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>1 Featured Verified Post</strong> (Active 30 days)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>#1 Top Placement</strong> on search results &amp; category feeds</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>Direct Recruiter Outreach Email</strong> enabled</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>Automated <strong>AI Candidate Fit Scoring</strong> &amp; skill gap tags</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>Priority Google for Jobs <strong>Schema.org Re-indexing</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>Verified Corporate Employer Seal</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('single')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Post Verified Role for ₹4,999 ➔
              </button>
            </div>
          </div>

          {/* Card 3: Growth 3-Pack */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider">
                Growth 3-Pack
              </div>
              <div>
                <span className="text-4xl font-black text-gray-900">₹11,999</span>
                <span className="text-xs text-gray-500 font-medium ml-1.5">/ 3 posts bundle</span>
                <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Save ₹3,000 (₹3,999 / post)</div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                For scaling startups or teams hiring for multiple engineering or product positions.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span><strong>3 Featured Verified Posts</strong> (Active 30 days each)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span><strong>Priority Placement</strong> on all 3 listings</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span><strong>Direct Recruiter Email Outreach</strong> on all roles</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Instant candidate match alerts &amp; screening</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Dedicated WhatsApp &amp; email recruiter support</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('growth')}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-xl transition-colors"
              >
                Get 3-Post Pack for ₹11,999 ➔
              </button>
            </div>
          </div>
        </section>

        {/* Enterprise Callout Banner */}
        <section className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Need High-Volume or ATS Sync?</span>
            <h3 className="text-xl sm:text-2xl font-bold">Enterprise ATS Webhook Sync (Greenhouse, Lever, Workday)</h3>
            <p className="text-xs text-gray-300 max-w-xl">
              Sync all open roles automatically from your ATS with dedicated employer branding, priority local placement, and SLA guarantees.
            </p>
          </div>
          <button
            onClick={() => openModalWithTier('growth')}
            className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-xl whitespace-nowrap transition-colors shadow-md"
          >
            Inquire Enterprise ➔
          </button>
        </section>

        {/* Why Post on NicheHire? */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900">Why Modern Employers Choose NicheHire</h2>
            <p className="text-xs text-gray-500 mt-1">
              Move beyond the clutter of legacy job boards where your postings get lost in thousands of outdated listings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="text-2xl">⚡</div>
              <h3 className="text-sm font-bold text-gray-900">Direct Portal Traffic</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Candidates don&apos;t apply to an opaque middleman database. They apply straight into your existing ATS or career portal pipeline.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
              <div className="text-2xl">🎯</div>
              <h3 className="text-sm font-bold text-gray-900">Higher Candidate Quality</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Our resume AI pre-screens skills and suggests applying only when candidates meet your technical requirements, reducing spam applications.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
              <div className="text-2xl">🔍</div>
              <h3 className="text-sm font-bold text-gray-900">Google for Jobs Optimization</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Every verified listing is automatically tagged with validated Schema.org JobPosting microdata to maximize organic search discovery.
              </p>
            </div>
          </div>
        </section>

        {/* Employer FAQ */}
        <section className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Why single-post instead of expensive monthly retainers?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Most teams don&apos;t hire 50 engineers every month. Traditional job boards force recruiters into recurring commitments that go unused. Our ₹4,999 single-post model gives you complete flexibility: pay only when you have an active role to fill.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">How do I claim the Free Launch Pilot post?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Select &ldquo;Launch Pilot&rdquo; on the posting form and provide your official corporate work email (e.g. name@company.com). Once our automated crawler validates your corporate domain, your post goes live for 14 days at ₹0 cost.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">How long do job postings stay active?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Single verified posts stay active for 30 days and are flagged with freshness badges (&lt; 24h, &lt; 3d, &lt; 7d). You can edit or close the post anytime.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">How does candidate application routing work?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                All candidate clicks route straight to your official career portal URL or ATS application form. In addition, candidates with high match scores can reach out via direct recruiter email if enabled.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white text-center space-y-4 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to Fill Your Critical Tech Role?</h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto">
            Launch with our ₹4,999 single verified post or claim your 1st post free. Verified listings go live in under 15 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => openModalWithTier('single')}
              className="px-8 py-3.5 bg-white hover:bg-gray-100 text-blue-700 font-extrabold text-xs rounded-xl shadow-lg transition-transform transform hover:scale-105"
            >
              Post Verified Job (₹4,999) ➔
            </button>
            <button
              onClick={() => openModalWithTier('free')}
              className="px-6 py-3.5 bg-blue-700/80 hover:bg-blue-800 text-white font-bold text-xs rounded-xl border border-blue-400 transition-colors"
            >
              Claim Free Launch Post (₹0)
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
          <div className="flex justify-center gap-4 text-xs font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600">Candidate Search</Link>
            <Link href="/about" className="hover:text-blue-600">About &amp; Trust</Link>
            <Link href="/pricing" className="hover:text-blue-600">Employer Pricing</Link>
          </div>
        </div>
      </footer>

      {/* Recruiter Job Posting Modal */}
      <PostJobModal
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
        initialPlan={selectedTier}
      />
    </div>
  );
}
