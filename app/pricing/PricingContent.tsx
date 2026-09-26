'use client';

import { useState } from 'react';
import Link from 'next/link';
import PostJobModal from '../components/PostJobModal';
import { ArrowRight, Check } from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

export default function PricingContent() {
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'single' | 'growth'>('single');

  const openModalWithTier = (tier: 'free' | 'single' | 'growth') => {
    setSelectedTier(tier);
    setPostJobOpen(true);
  };

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
              <span className="ml-2 px-1.5 py-0.5 text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] rounded border border-[#E4E7EC]">
                For Employers
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4 text-xs font-medium">
            <Link href="/" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors">
              Candidate search
            </Link>
            <Link href="/about" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors">
              Verification engine
            </Link>
            <button
              onClick={() => openModalWithTier('single')}
              className="px-3.5 py-1.5 text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors inline-flex items-center gap-1"
            >
              <span>Post a verified role</span>
              <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
        {/* Hero Section */}
        <section className="text-center space-y-3.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] text-xs text-[#5B6478]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
            <span>Early adopter special: Claim your 1st post free</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-normal text-[#12172B] tracking-tight leading-tight">
            Hire faster with verified placement. <br />
            <span className="font-serif italic text-[#12172B]">No recurring retainers. Pay per role.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#5B6478] leading-relaxed">
            Avoid expensive monthly subscriptions before seeing verified results. Start with our <strong className="text-[#12172B] font-semibold">₹4,999 single-post tier</strong> or test our <strong className="text-[#12172B] font-semibold">free launch pilot</strong> to prove that our direct-portal model yields higher-intent engineering and product hires.
          </p>
        </section>

        {/* Pricing Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Free Launch Pilot */}
          <div className="bg-white rounded-md p-6 sm:p-7 border border-[#E4E7EC] flex flex-col justify-between hover:border-[#12172B]/30 transition-colors">
            <div className="space-y-3.5">
              <div className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]">
                Launch pilot
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#12172B]">₹0</span>
                  <span className="text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                    100% Free
                  </span>
                </div>
                <span className="text-xs text-[#5B6478]">1st post for corporate employers</span>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Test applicant quality and hiring speed with zero financial commitment.
              </p>

              <div className="pt-4 border-t border-[#E4E7EC] space-y-2.5 text-xs text-[#12172B]">
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>1 Verified Job Post (Active 14 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Direct apply link to your official career portal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Google for Jobs Schema.org SEO indexing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Automated corporate domain validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Standard candidate applicant feed</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openModalWithTier('free')}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-medium text-xs rounded border border-[#E4E7EC] transition-colors inline-flex items-center justify-center gap-1"
              >
                <span>Claim free launch post</span>
                <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>
          </div>

          {/* Card 2: Single Verified Post (THE MAIN OFFER) */}
          <div className="bg-white rounded-md p-6 sm:p-7 border-2 border-[#2B4EE6] flex flex-col justify-between relative">
            <div className="absolute -top-3 left-6 px-2.5 py-0.5 bg-[#2B4EE6] text-white text-[11px] font-medium rounded">
              Main offer • Recommended
            </div>

            <div className="space-y-3.5">
              <div className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#2B4EE6]/10 text-[#2B4EE6] border border-[#2B4EE6]/20">
                Single verified post
              </div>
              <div>
                <span className="text-3xl font-bold text-[#12172B]">₹4,999</span>
                <span className="text-xs text-[#5B6478] ml-1.5">/ single post (30 days)</span>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Pay-per-hire with zero recurring commitments. Ideal to fill your key opening fast.
              </p>

              <div className="pt-4 border-t border-[#E4E7EC] space-y-2.5 text-xs text-[#12172B]">
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>1 Featured Verified Post (Active 30 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>Priority top placement on search results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>Direct recruiter outreach email enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>Automated AI Candidate Fit Scoring &amp; skill tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>Schema.org real-time re-indexing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                  <span>Verified Corporate Employer Seal</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openModalWithTier('single')}
                className="w-full py-2.5 px-4 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors inline-flex items-center justify-center gap-1"
              >
                <span>Post verified role for ₹4,999</span>
                <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>
          </div>

          {/* Card 3: Growth 3-Pack */}
          <div className="bg-white rounded-md p-6 sm:p-7 border border-[#E4E7EC] flex flex-col justify-between hover:border-[#12172B]/30 transition-colors">
            <div className="space-y-3.5">
              <div className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC]">
                Growth 3-pack
              </div>
              <div>
                <span className="text-3xl font-bold text-[#12172B]">₹11,999</span>
                <span className="text-xs text-[#5B6478] ml-1.5">/ 3 posts bundle</span>
                <div className="text-[11px] text-[#0E9F6E] font-medium mt-0.5">Save ₹3,000 (₹3,999 / post)</div>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                For scaling teams hiring for multiple engineering or product openings.
              </p>

              <div className="pt-4 border-t border-[#E4E7EC] space-y-2.5 text-xs text-[#12172B]">
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>3 Featured Verified Posts (Active 30 days each)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Priority placement across all 3 roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Direct recruiter outreach enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Candidate match alerts &amp; screening</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Dedicated WhatsApp &amp; email support</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openModalWithTier('growth')}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC] font-medium text-xs rounded transition-colors inline-flex items-center justify-center gap-1"
              >
                <span>Get 3-post pack for ₹11,999</span>
                <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>
          </div>
        </section>

        {/* Enterprise Callout Banner */}
        <section className="bg-[#12172B] rounded-md p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-[#12172B]">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-xs font-medium text-[#5B6478]">Need high-volume or ATS sync?</span>
            <h3 className="text-xl font-semibold">Enterprise ATS Webhook Sync (Greenhouse, Lever, Workday)</h3>
            <p className="text-xs text-gray-300 max-w-xl">
              Sync all open roles automatically from your ATS with dedicated employer branding, priority local placement, and SLA guarantees.
            </p>
          </div>
          <button
            onClick={() => openModalWithTier('growth')}
            className="px-5 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-medium text-xs rounded whitespace-nowrap transition-colors inline-flex items-center gap-1"
          >
            <span>Inquire Enterprise</span>
            <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
          </button>
        </section>

        {/* Why Post on NicheHire? */}
        <section className="bg-white rounded-md p-6 sm:p-8 border border-[#E4E7EC] space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-xl font-semibold text-[#12172B]">Why modern employers choose NicheHire</h2>
            <p className="text-xs text-[#5B6478]">
              Move beyond the clutter of legacy job boards where your postings get lost in thousands of outdated listings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-semibold text-[#12172B]">Direct portal traffic</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Candidates don&apos;t apply to an opaque middleman database. They apply straight into your existing ATS or career portal pipeline.
              </p>
            </div>

            <div className="p-4 rounded border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-semibold text-[#12172B]">Higher candidate quality</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Our resume AI pre-screens skills and suggests applying only when candidates meet your technical requirements, reducing spam applications.
              </p>
            </div>

            <div className="p-4 rounded border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-semibold text-[#12172B]">Google for Jobs optimization</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Every verified listing is automatically tagged with validated Schema.org JobPosting microdata to maximize organic search discovery.
              </p>
            </div>
          </div>
        </section>

        {/* Employer FAQ */}
        <section className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-xl font-semibold text-[#12172B] text-center">Frequently asked questions</h2>
          <div className="space-y-3">
            <div className="p-4 bg-white rounded border border-[#E4E7EC]">
              <h3 className="text-xs font-semibold text-[#12172B]">Why single-post instead of expensive monthly retainers?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Most teams don&apos;t hire 50 engineers every month. Traditional job boards force recruiters into recurring commitments that go unused. Our ₹4,999 single-post model gives you complete flexibility: pay only when you have an active role to fill.
              </p>
            </div>

            <div className="p-4 bg-white rounded border border-[#E4E7EC]">
              <h3 className="text-xs font-semibold text-[#12172B]">How do I claim the Free Launch Pilot post?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Select &ldquo;Launch Pilot&rdquo; on the posting form and provide your official corporate work email (e.g. name@company.com). Once our automated system validates your corporate domain, your post goes live for 14 days at ₹0 cost.
              </p>
            </div>

            <div className="p-4 bg-white rounded border border-[#E4E7EC]">
              <h3 className="text-xs font-semibold text-[#12172B]">How long do job postings stay active?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Single verified posts stay active for 30 days and are flagged with freshness badges (&lt; 24h, &lt; 3d, &lt; 7d). You can edit or close the post anytime.
              </p>
            </div>

            <div className="p-4 bg-white rounded border border-[#E4E7EC]">
              <h3 className="text-xs font-semibold text-[#12172B]">How does candidate application routing work?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                All candidate clicks route straight to your official career portal URL or ATS application form. In addition, candidates with high match scores can reach out via direct recruiter email if enabled.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-white border border-[#E4E7EC] rounded-md p-8 sm:p-10 text-center space-y-3">
          <h2 className="text-2xl font-semibold text-[#12172B]">Ready to fill your critical tech role?</h2>
          <p className="text-xs text-[#5B6478] max-w-lg mx-auto leading-relaxed">
            Launch with our ₹4,999 single verified post or claim your 1st post free. Verified listings go live in under 15 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => openModalWithTier('single')}
              className="px-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors inline-flex items-center gap-1"
            >
              <span>Post verified job (₹4,999)</span>
              <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
            <button
              onClick={() => openModalWithTier('free')}
              className="px-5 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-medium text-xs rounded border border-[#E4E7EC] transition-colors"
            >
              Claim free launch post (₹0)
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E4E7EC] py-8 text-center text-xs text-[#5B6478]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
          <div className="flex justify-center gap-4 text-xs font-medium text-[#12172B]">
            <Link href="/" className="hover:text-[#2B4EE6]">Candidate search</Link>
            <Link href="/about" className="hover:text-[#2B4EE6]">About &amp; trust</Link>
            <Link href="/pricing" className="hover:text-[#2B4EE6]">Employer pricing</Link>
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
