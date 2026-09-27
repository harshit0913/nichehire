'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PostJobModal from '../components/PostJobModal';
import EmployerMembershipModal from '../components/EmployerMembershipModal';
import { ArrowRight, Check, Sparkles, ShieldCheck, Clock, Zap, Building2, HelpCircle } from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';
import {
  EMPLOYER_MEMBERSHIP_PLANS,
  EmployerMembershipPlan,
  EmployerPlanId,
  EmployerActiveMembership,
} from '../types/employerMembership';

export default function PricingContent() {
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<EmployerPlanId>('pro');
  const [employerEmail, setEmployerEmail] = useState('');
  const [employerCompany, setEmployerCompany] = useState('');
  const [activeMembership, setActiveMembership] = useState<EmployerActiveMembership | null>(null);

  useEffect(() => {
    try {
      const email = localStorage.getItem('nichehire_employer_email') || '';
      const comp = localStorage.getItem('nichehire_employer_company') || '';
      setEmployerEmail(email);
      setEmployerCompany(comp);

      if (email) {
        const memStr = localStorage.getItem(`nichehire_employer_membership_${email}`);
        if (memStr) {
          setActiveMembership(JSON.parse(memStr));
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSelectTier = (planId: EmployerPlanId) => {
    setSelectedPlanId(planId);
    if (activeMembership && activeMembership.usedJobs < activeMembership.totalJobs && activeMembership.expiresAt > Date.now()) {
      setPostJobOpen(true);
    } else {
      setMembershipModalOpen(true);
    }
  };

  const handlePostRoleClick = () => {
    if (activeMembership && activeMembership.usedJobs < activeMembership.totalJobs && activeMembership.expiresAt > Date.now()) {
      setPostJobOpen(true);
    } else {
      setMembershipModalOpen(true);
    }
  };

  const handlePlanActivated = (membership: EmployerActiveMembership) => {
    setActiveMembership(membership);
    setMembershipModalOpen(false);
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
            <Link href="/employer/dashboard" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors">
              Recruiter Dashboard
            </Link>
            <button
              onClick={handlePostRoleClick}
              className="px-3.5 py-1.5 text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors inline-flex items-center gap-1 shadow-2xs"
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
            <span>Early adopter special: 1st job listing free for 10 days</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-normal text-[#12172B] tracking-tight leading-tight">
            Hire verified candidates fast. <br />
            <span className="font-serif italic text-[#12172B]">No recurring retainers. Transparent plans.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#5B6478] leading-relaxed">
            Avoid expensive monthly subscriptions before seeing verified results. Test our <strong className="text-[#12172B] font-semibold">free 10-day launch pilot</strong>, unlock our <strong className="text-[#12172B] font-semibold">₹299 Growth Tier (2 jobs / 14 days)</strong>, or scale with <strong className="text-[#12172B] font-semibold">₹599 Pro (5 jobs / 21 days)</strong> and <strong className="text-[#12172B] font-semibold">₹999 Enterprise (20 jobs / 30 days)</strong> with zero platform surcharge via direct bank UPI.
          </p>
          <div className="pt-1 flex justify-center">
            <Link
              href="/employer/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Zap size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-600" />
              <span>Direct Bank UPI (₹299, ₹599, ₹999) in Employer Workspace &rarr;</span>
            </Link>
          </div>
        </section>

        {/* 4 Pricing Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {EMPLOYER_MEMBERSHIP_PLANS.map((plan) => {
            const isPro = plan.id === 'pro';
            const isFree = plan.price === 0;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                  isPro
                    ? 'border-2 border-[#2B4EE6] shadow-md relative scale-[1.02]'
                    : 'border-[#E4E7EC] hover:border-[#12172B]/30 shadow-2xs'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#2B4EE6] text-white text-[11px] font-bold rounded-full shadow-xs uppercase tracking-wider">
                    Recommended • Best Value
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        isFree
                          ? 'bg-emerald-50 text-[#0E9F6E] border border-emerald-200'
                          : isPro
                          ? 'bg-[#2B4EE6]/10 text-[#2B4EE6] border border-[#2B4EE6]/20'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span className="text-[10px] font-medium text-[#5B6478]">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-[#12172B]">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-[#5B6478]">
                        / {plan.jobCount} {plan.jobCount === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-indigo-700 mt-0.5 flex items-center gap-1">
                      <Clock size={11} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>{plan.durationDays} Days Active Listing</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#5B6478] leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  <div className="pt-3 border-t border-[#E4E7EC] space-y-2 text-xs text-[#12172B]">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check
                          size={13}
                          strokeWidth={ICON_STROKE_WIDTH}
                          className={`shrink-0 mt-0.5 ${isPro ? 'text-[#2B4EE6]' : 'text-[#0E9F6E]'}`}
                        />
                        <span className="text-[11px] text-gray-700 leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectTier(plan.id)}
                    className={`w-full py-2.5 px-4 font-semibold text-xs rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-xs ${
                      isPro
                        ? 'bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white shadow-blue-500/20'
                        : isFree
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-white hover:bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC]'
                    }`}
                  >
                    <span>
                      {isFree
                        ? 'Claim 10-Day Free Post'
                        : `Activate ${plan.name} (₹${plan.price})`}
                    </span>
                    <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Enterprise Callout Banner */}
        <section className="bg-[#12172B] rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-[#12172B] shadow-lg">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Need high-volume campus hiring or ATS sync?
            </span>
            <h3 className="text-xl font-bold">Enterprise ATS Webhook Sync (Greenhouse, Lever, Workday)</h3>
            <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
              Sync all open roles automatically from your ATS with dedicated employer branding, multi-city placement, custom walk-in drives, and SLA candidate guarantees.
            </p>
          </div>
          <button
            onClick={() => handleSelectTier('enterprise')}
            className="px-5 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-bold text-xs rounded-xl whitespace-nowrap transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <span>Activate 20-Job Enterprise</span>
            <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
          </button>
        </section>

        {/* Why Post on NicheHire? */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] space-y-6 shadow-2xs">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-xl font-bold text-[#12172B]">Why modern employers choose NicheHire</h2>
            <p className="text-xs text-[#5B6478]">
              Move beyond the clutter of legacy job boards where your postings get lost in thousands of outdated listings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-bold text-[#12172B]">Direct portal applications</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Candidates don&apos;t apply to an opaque middleman database. They apply straight into your existing ATS or official company career portal pipeline.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-bold text-[#12172B]">Pre-screened candidate quality</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Our resume AI pre-screens skills and suggests applying only when candidates meet your technical requirements, reducing spam applications.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] space-y-1.5">
              <h3 className="text-xs font-bold text-[#12172B]">Google for Jobs optimization</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Every verified listing is automatically tagged with validated Schema.org JobPosting microdata to maximize organic search discovery across India.
              </p>
            </div>
          </div>
        </section>

        {/* Employer FAQ */}
        <section className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-[#12172B] text-center">Frequently asked questions</h2>
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-2xs">
              <h3 className="text-xs font-bold text-[#12172B]">Why flexible tiers instead of expensive monthly retainers?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Traditional job boards force recruiters into recurring retainers of ₹15,000+ per month that go largely unused. Our flexible tiers (Free 10-day pilot, ₹299 for 2 jobs/14 days, ₹599 for 5 jobs/21 days, and ₹999 for 20 jobs/30 days) give you total control to pay only for the openings you actively need.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-2xs">
              <h3 className="text-xs font-bold text-[#12172B]">How do I claim the Free Launch Pilot post?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Select &ldquo;Free Starter&rdquo; on the pricing grid and provide your official corporate work email (e.g. recruiter@company.com). Once our automated system validates your corporate domain, your post goes live for 10 days at zero cost.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-2xs">
              <h3 className="text-xs font-bold text-[#12172B]">How long do job postings stay active and can I override or cancel them?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                Postings stay active for 10 days on Free Starter, 14 days on Growth, 21 days on Pro, and 30 days on Enterprise. You can edit, override details, or cancel/close any listing anytime directly from your Employer Workspace.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-2xs">
              <h3 className="text-xs font-bold text-[#12172B]">How does candidate application routing work?</h3>
              <p className="text-xs text-[#5B6478] mt-1 leading-relaxed">
                All candidate clicks route straight to your official career portal URL or ATS application form. In addition, candidates with high match scores can reach out via direct recruiter email or verified phone if enabled.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-white border border-[#E4E7EC] rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-2xs">
          <h2 className="text-2xl font-bold text-[#12172B]">Ready to fill your critical openings?</h2>
          <p className="text-xs text-[#5B6478] max-w-lg mx-auto leading-relaxed">
            Launch with our Free 10-day starter or unlock Growth (₹299 for 2 jobs), Pro (₹599 for 5 jobs), or Enterprise (₹999 for 20 jobs). Verified listings go live in under 15 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => handleSelectTier('pro')}
              className="px-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>Get Pro Recruiter (₹599)</span>
              <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
            <button
              onClick={() => handleSelectTier('free')}
              className="px-5 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] font-medium text-xs rounded-xl border border-[#E4E7EC] transition-colors"
            >
              Claim Free Launch Post (10d)
            </button>
            <Link
              href="/employer/dashboard"
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Building2 size={13} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Go to Recruiter Dashboard</span>
            </Link>
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
            <Link href="/employer/dashboard" className="hover:text-[#2B4EE6]">Employer Workspace</Link>
          </div>
        </div>
      </footer>

      {/* Recruiter Job Posting Modal */}
      <PostJobModal
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
        initialPlan={selectedPlanId}
        isLoggedIn={Boolean(employerEmail)}
        employerEmail={employerEmail}
        activeMembership={activeMembership}
        onRequireAuth={() => {
          window.location.href = '/employer/dashboard';
        }}
        onRequireMembership={() => {
          setMembershipModalOpen(true);
        }}
        onSuccess={() => {
          if (employerEmail) {
            try {
              const memStr = localStorage.getItem(`nichehire_employer_membership_${employerEmail}`);
              if (memStr) setActiveMembership(JSON.parse(memStr));
            } catch {}
          }
        }}
      />

      {/* Employer Membership & UPI Modal */}
      <EmployerMembershipModal
        isOpen={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        employerEmail={employerEmail || 'recruiter@company.com'}
        companyName={employerCompany || 'Company'}
        onPlanActivated={handlePlanActivated}
      />
    </div>
  );
}
