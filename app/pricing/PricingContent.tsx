'use client';

import { useState } from 'react';
import Link from 'next/link';
import PostJobModal from '../components/PostJobModal';

export default function PricingContent() {
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'starter' | 'growth' | 'enterprise'>('growth');

  const openModalWithTier = (tier: 'starter' | 'growth' | 'enterprise') => {
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
              onClick={() => setPostJobOpen(true)}
              className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-xs"
            >
              Post a Job ➔
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-semibold">
            <span>✨</span> Transparent Employer Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Reach Verified, High-Intent Candidates. <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Zero Spam. Zero Ghost Applications.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-gray-600 leading-relaxed">
            Candidates flock to NicheHire because our strict 7-day rule and direct ATS verification guarantee fresh, genuine openings. Post your vacancy directly to qualified software engineers, data analysts, and tech professionals.
          </p>
        </section>

        {/* Pricing Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider">
                Starter
              </div>
              <div>
                <span className="text-4xl font-black text-gray-900">₹4,999</span>
                <span className="text-xs text-gray-500 font-medium ml-1.5">/ post (30 days)</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ideal for fast-growing startups or teams hiring for a single critical position.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span><strong>1 Verified Job Post</strong> (Active 30 days)</span>
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
                  <span>Automated <strong>Candidate Fit Rating</strong> badges</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                  <span>Verified Corporate Employer Badge</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('starter')}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-xl transition-colors"
              >
                Post 1 Job for ₹4,999 ➔
              </button>
            </div>
          </div>

          {/* Growth Plan (Featured) */}
          <div className="bg-white rounded-3xl p-8 border-2 border-blue-600 shadow-xl flex flex-col justify-between relative transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-sm">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                Growth Hiring
              </div>
              <div>
                <span className="text-4xl font-black text-gray-900">₹14,999</span>
                <span className="text-xs text-gray-500 font-medium ml-1.5">/ month</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                For scaling companies needing a predictable pipeline of vetted applicants.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>Up to 5 Active Verified Posts</strong> concurrently</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>Featured Placement</strong> on top of search queries</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span><strong>Direct Recruiter Outreach Email</strong> enabled</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>Instant candidate notifications for matching resumes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>High-priority Google for Jobs re-indexing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600 font-bold text-sm">✓</span>
                  <span>Dedicated email & WhatsApp recruiter support</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('growth')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                Choose Growth for ₹14,999 ➔
              </button>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider">
                Enterprise ATS Sync
              </div>
              <div>
                <span className="text-4xl font-black text-gray-900">₹49,999</span>
                <span className="text-xs text-gray-500 font-medium ml-1.5">/ month</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Seamless bi-directional integration for tech enterprises with multiple hiring teams.
              </p>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span><strong>Unlimited Job Listings</strong> via automated ATS sync</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Greenhouse, Lever, Workday & SAP SuccessFactors</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Dedicated Company Hub & Employer Branding</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Tier-1 Proximity priority across all regional searches</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-purple-600 font-bold text-sm">✓</span>
                  <span>Dedicated Account Manager & SLA guarantee</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => openModalWithTier('enterprise')}
                className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs rounded-xl transition-colors border border-purple-200"
              >
                Inquire Enterprise ➔
              </button>
            </div>
          </div>
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
              <h3 className="text-sm font-bold text-gray-900">How does the domain verification work?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                When you post a job, you must provide your corporate work email (e.g. name@company.com) and an official career portal URL. Our automated crawler verifies domain ownership, SSL validity, and active hiring status before granting the &ldquo;Verified Employer&rdquo; badge.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">How long do job postings stay active?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Postings are active for 30 days on our platform, but highlighted with real-time freshness badges (&lt; 24h, &lt; 3d, &lt; 7d). You can pause, edit, or mark a role as filled at any time.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Can we connect our ATS directly?</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Yes! On our Enterprise tier, we provide direct webhook and API synchronization with Greenhouse, Lever, Workday, SmartRecruiters, and SAP SuccessFactors so your jobs are automatically published and closed in sync.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white text-center space-y-4 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to Hire Better Tech Talent?</h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto">
            Submit your job opening today. Verified listings go live in under 15 minutes after automated verification.
          </p>
          <button
            onClick={() => setPostJobOpen(true)}
            className="px-8 py-3.5 bg-white hover:bg-gray-100 text-blue-700 font-extrabold text-xs rounded-xl shadow-lg transition-transform transform hover:scale-105"
          >
            Post a Verified Job Now ➔
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
          <div className="flex justify-center gap-4 text-xs font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600">Candidate Search</Link>
            <Link href="/about" className="hover:text-blue-600">About & Trust</Link>
            <Link href="/pricing" className="hover:text-blue-600">Employer Pricing</Link>
          </div>
        </div>
      </footer>

      {/* Recruiter Job Posting Modal */}
      <PostJobModal
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
      />
    </div>
  );
}
