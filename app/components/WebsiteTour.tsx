'use client';

import { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  LocateFixed,
  GraduationCap,
  Footprints,
  Briefcase,
  Sparkles,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface WebsiteTourProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
}

export default function WebsiteTour({ isOpen, onClose, userId }: WebsiteTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      const key = `nichehire_tour_completed_${userId || 'guest'}`;
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore
    }
    onClose();
  };

  const steps = [
    {
      title: 'Welcome to NicheHire',
      subtitle: 'Verified direct career portal placement — Zero aggregators, zero ghost jobs.',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center">
          <Building2 size={24} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
      ),
      tag: 'Direct Career Portals',
      points: [
        'Apply directly on official company websites (Google, Microsoft, Tata, HDFC, Deloitte, Stripe).',
        'Strict freshness rule: All listings are actively verified and purged if over 7–21 days old.',
        'Direct HR email outreach templates and ATS optimization assistance.',
      ],
      highlight: 'Every job card takes you straight to the authentic corporate hiring portal with 0 middleman fees.',
    },
    {
      title: 'Hyper-Local to Pan-India Search',
      subtitle: 'From your home district to your state capital, across India and global hubs.',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0E9F6E] flex items-center justify-center">
          <LocateFixed size={24} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
      ),
      tag: '6-Tier Radius Hierarchy',
      points: [
        'Local City & District (Within 25 km) — Immediate local openings.',
        'Regional Belt & State Capital — Broadened opportunities across your state.',
        'Pan-India & Remote Work — High-paying roles across major metropolitan centers.',
      ],
      highlight: 'Use 1-click GPS detection or type any town/district to see matching local and state-wide jobs.',
    },
    {
      title: 'Every Field & Academic Stream',
      subtitle: 'Equal priority for Commerce, Arts, Law, Management, Medical & Technology.',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <GraduationCap size={24} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
      ),
      tag: 'Comprehensive Taxonomy',
      points: [
        'Commerce & Finance: CA Articleship, B.Com, CMA, CS, Banking, Financial Analyst, GST.',
        'Management & Logistics: MBA, BBA, BMS, Supply Chain, Operations, Human Resources.',
        'Legal & Public Service: LLB, BA LLB, High Court Clerkships, Legal Advisory, Compliance.',
        'Arts, Humanities & Healthcare: BA, Content, Media, MBBS, Healthcare Administration.',
      ],
      highlight: 'Filtered taxonomy ensures non-technical talent discovers dedicated, high-growth career tracks.',
    },
    {
      title: 'Verified Walk-Ins & Govt Jobs',
      subtitle: 'In-person hiring drives in your city plus official public sector vacancies.',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Footprints size={24} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
      ),
      tag: 'Community Walk-Ins & PSU',
      points: [
        'Offline Walk-Ins: Discover verified in-person interviews with venue addresses and timings.',
        'Community Contribution: Know a local hiring drive? Post it directly to help fellow candidates.',
        'Govt Jobs Calendar: UPSC, SSC, Banking (IBPS/SBI), Railways, and State PSC notifications.',
      ],
      highlight: 'Never miss an urgent walk-in drive or competitive public examination deadline.',
    },
    {
      title: 'Your Private Dashboard & Side Drawer',
      subtitle: 'All your career tools in one clean side toggle, keeping the homepage distraction-free.',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Briefcase size={24} strokeWidth={ICON_STROKE_WIDTH} />
        </div>
      ),
      tag: 'Personalized Workspace',
      points: [
        'Personal Saved Jobs: Save roles to your private list and apply when you are ready.',
        'Application Tracker: Track companies you applied to with statuses (Applied, Reviewing, Shortlisted).',
        'Profile Customizer: Edit education, skills, expected CTC, and resume like top career portals.',
        'Minimalist Header: Clean browsing experience showing only your greeting and tier badge.',
      ],
      highlight: 'Click the "My Dashboard" button in the header anytime to slide open your private control center.',
    },
  ];

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] overflow-hidden">
        {/* Close / Skip button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 text-[#5B6478] hover:text-[#12172B] p-1.5 rounded-full hover:bg-[#F7F8FA] transition-colors"
          title="Skip tour"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-8 bg-[#2B4EE6]'
                  : idx < currentStep
                  ? 'w-4 bg-[#2B4EE6]/40'
                  : 'w-4 bg-[#E4E7EC]'
              }`}
            />
          ))}
          <span className="text-[11px] font-medium text-[#5B6478] ml-2">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Card Header with Icon & Tag */}
        <div className="flex items-start gap-4 mb-4">
          {current.icon}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F7F8FA] border border-[#E4E7EC] text-[11px] font-semibold text-[#12172B] mb-1.5">
              <Sparkles size={11} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
              <span>{current.tag}</span>
            </div>
            <h3 className="text-xl font-bold text-[#12172B] tracking-tight">{current.title}</h3>
            <p className="text-xs text-[#5B6478] mt-0.5">{current.subtitle}</p>
          </div>
        </div>

        {/* Feature Points */}
        <div className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-4 my-5 space-y-2.5 text-xs text-[#12172B]">
          {current.points.map((pt, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#ECFDF5] text-[#0E9F6E] flex items-center justify-center shrink-0 mt-0.5 border border-[#A7F3D0]">
                <Check size={10} strokeWidth={ICON_STROKE_WIDTH} />
              </div>
              <span className="leading-relaxed">{pt}</span>
            </div>
          ))}
        </div>

        {/* Highlight Note */}
        <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed mb-6">
          <strong>Key Benefit:</strong> {current.highlight}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-3.5 py-2 text-xs font-semibold text-[#5B6478] hover:text-[#12172B] hover:bg-[#F7F8FA] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-3.5 py-2 text-xs font-medium text-[#5B6478] hover:text-[#12172B] transition-colors"
            >
              Skip Tour
            </button>
          )}

          <div className="flex items-center gap-2">
            {!isLast ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Next</span>
                <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-5 py-2 bg-[#0E9F6E] hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Get Started Now</span>
                <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
