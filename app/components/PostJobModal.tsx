'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BadgeCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Briefcase,
  Lock,
  CreditCard,
  Check,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';
import {
  EMPLOYER_MEMBERSHIP_PLANS,
  EmployerActiveMembership,
  EmployerPlanId,
} from '../types/employerMembership';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newJob: any) => void;
  initialPlan?: EmployerPlanId;
  isLoggedIn?: boolean;
  employerEmail?: string;
  activeMembership?: EmployerActiveMembership | null;
  onRequireAuth?: () => void;
  onRequireMembership?: () => void;
}

export default function PostJobModal({
  isOpen,
  onClose,
  onSuccess,
  initialPlan = 'growth',
  isLoggedIn = false,
  employerEmail = '',
  activeMembership,
  onRequireAuth,
  onRequireMembership,
}: PostJobModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState<'On-site' | 'Hybrid' | 'Remote'>('Remote');
  const [jobType, setJobType] = useState('Full-Time');
  const [salary, setSalary] = useState('');
  const [experience, setExperience] = useState('1-3 Years');
  const [description, setDescription] = useState('');
  const [pledgeChecked, setPledgeChecked] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Hydrate email & company
  useEffect(() => {
    try {
      const storedComp = localStorage.getItem('nichehire_employer_company');
      const storedEmail = localStorage.getItem('nichehire_employer_email');
      if (storedComp && !company) setCompany(storedComp);
      if ((storedEmail || employerEmail) && !workEmail) {
        setWorkEmail(employerEmail || storedEmail || '');
      }
    } catch {
      // Ignore
    }
  }, [isOpen, employerEmail]);

  if (!isOpen) return null;

  // Membership validation
  const hasValidMembership =
    Boolean(activeMembership) &&
    activeMembership!.usedJobs < activeMembership!.totalJobs &&
    activeMembership!.expiresAt > Date.now();

  const remainingSlots = activeMembership
    ? Math.max(0, activeMembership.totalJobs - activeMembership.usedJobs)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      if (onRequireAuth) {
        onClose();
        onRequireAuth();
      } else {
        setErrorMsg('Please log in with an employer account to post genuine openings.');
      }
      return;
    }

    if (!hasValidMembership) {
      if (onRequireMembership) {
        onClose();
        onRequireMembership();
      } else {
        setErrorMsg('You need an active employer membership plan with available job slots.');
      }
      return;
    }

    if (!title.trim() || !company.trim() || !workEmail.trim() || !portalUrl.trim() || !description.trim()) {
      setErrorMsg('Please fill in all required fields (Title, Company, Work Email, Portal Link, Description).');
      return;
    }

    if (!workEmail.includes('@') || workEmail.endsWith('@gmail.com') || workEmail.endsWith('@yahoo.com')) {
      setErrorMsg('Please use an official corporate work email (e.g. recruiter@company.com) for verification.');
      return;
    }

    if (!pledgeChecked) {
      setErrorMsg('Please accept the Verification & Anti-Scam pledge.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const durationDays = activeMembership?.durationDays || 14;
      const now = Date.now();
      const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

      const newListing = {
        id: `recruiter-${now}`,
        title: title.trim(),
        company: company.trim(),
        location: location.trim() || (workMode === 'Remote' ? 'Remote (India/Global)' : 'Indore, MP'),
        type: jobType,
        workMode,
        salary: salary.trim() || 'Competitive market compensation',
        description: description.trim(),
        url: portalUrl.trim(),
        source: `${company} Direct Portal`,
        isVerified: true,
        directPortal: true,
        postedAt: now,
        expiresAt,
        validityDays: durationDays,
        status: 'active',
        postedText: 'Just now',
        applicantCount: 0,
        applicantText: 'Be the first applicant',
        recruiterEmail: workEmail.trim(),
        planSelected: activeMembership?.planName || 'Growth Plan',
      };

      // 1. Save to employer posts in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
        stored.unshift(newListing);
        localStorage.setItem('nichehire_employer_posts', JSON.stringify(stored));

        // 2. Decrement membership quota
        if (activeMembership && employerEmail) {
          const updatedMembership = {
            ...activeMembership,
            usedJobs: activeMembership.usedJobs + 1,
          };
          localStorage.setItem(
            `nichehire_employer_membership_${employerEmail}`,
            JSON.stringify(updatedMembership)
          );
        }
      } catch {
        // Ignore storage errors
      }

      setSuccessMsg(
        `✓ Opening posted successfully! Active for ${durationDays} days under your ${activeMembership?.planName || 'active membership'}.`
      );
      if (onSuccess) onSuccess(newListing);

      setTimeout(() => {
        setSuccessMsg('');
        setTitle('');
        setCompany('');
        setPortalUrl('');
        setLocation('');
        setDescription('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Header */}
        <div className="mb-5 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]">
            <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
            <span>Verified Recruiter Posting</span>
          </div>
          <h2 className="text-xl font-bold text-[#12172B]">Publish a Verified Job Opening</h2>
          <p className="text-xs text-[#5B6478]">
            Genuine roles connect directly to your portal and are matched with verified candidates.
          </p>
        </div>

        {/* ── GATE 1: Must Be Logged In ── */}
        {!isLoggedIn && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 mb-5">
            <div className="flex items-center gap-2">
              <Lock size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-800 shrink-0" />
              <h4 className="text-xs font-bold text-amber-900">Employer Authentication Required</h4>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              To prevent fraudulent listings and spam, all employers must sign in or register with their official email before publishing openings.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onRequireAuth) onRequireAuth();
              }}
              className="w-full py-2 bg-[#12172B] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
            >
              Sign In / Register as Employer &rarr;
            </button>
          </div>
        )}

        {/* ── GATE 2: Active Membership Status ── */}
        {isLoggedIn && !hasValidMembership && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 mb-5">
            <div className="flex items-center gap-2">
              <CreditCard size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
              <h4 className="text-xs font-bold text-blue-950">Active Membership Plan Required</h4>
            </div>
            <p className="text-xs text-blue-900 leading-relaxed">
              {activeMembership?.usedJobs && activeMembership.usedJobs >= activeMembership.totalJobs
                ? `You have used all ${activeMembership.totalJobs} job posting slots under your current plan. Upgrade to publish more openings.`
                : 'Please select a membership plan to post. Claim your first post free for 10 days, or choose plans from ₹299 (14-30 days).'}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onRequireMembership) onRequireMembership();
              }}
              className="w-full py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Select / Upgrade Employer Plan &rarr;
            </button>
          </div>
        )}

        {/* Active Membership Badge */}
        {isLoggedIn && hasValidMembership && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
              <span className="font-bold text-emerald-950">
                Plan: {activeMembership?.planName} ({remainingSlots} slot{remainingSlots > 1 ? 's' : ''} left)
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#0E9F6E]">
              Valid for {activeMembership?.durationDays || 14} days
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Job Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isLoggedIn || !hasValidMembership}
                placeholder="e.g. Accounts Executive / Supply Chain Specialist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Company Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isLoggedIn || !hasValidMembership}
                placeholder="e.g. HDFC Bank, Tata Logistics"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Corporate Work Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                disabled={!isLoggedIn || !hasValidMembership}
                placeholder="recruiter@yourcompany.com"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Location (City / State)
              </label>
              <input
                type="text"
                disabled={!isLoggedIn || !hasValidMembership}
                placeholder="e.g. Gangtok, Sikkim / Mumbai, MH"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Work Mode</label>
              <select
                disabled={!isLoggedIn || !hasValidMembership}
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B]"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Job Type</label>
              <select
                disabled={!isLoggedIn || !hasValidMembership}
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B]"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Walk-in Drive">Walk-in Drive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Salary Range</label>
              <input
                type="text"
                disabled={!isLoggedIn || !hasValidMembership}
                placeholder="e.g. ₹5 LPA - ₹8 LPA"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12172B] mb-1">
              Official Career Portal / Application Link <span className="text-rose-600">*</span>
            </label>
            <input
              type="url"
              required
              disabled={!isLoggedIn || !hasValidMembership}
              placeholder="https://company.com/careers/apply"
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12172B] mb-1">
              Job Description &amp; Candidate Requirements <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              disabled={!isLoggedIn || !hasValidMembership}
              placeholder="Describe core duties, qualification criteria (e.g. B.Com/MBA/BA), and experience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6] leading-relaxed"
            />
          </div>

          {/* Anti-Scam Pledge */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="pledge"
              checked={pledgeChecked}
              onChange={(e) => setPledgeChecked(e.target.checked)}
              className="mt-0.5 rounded text-[#2B4EE6] focus:ring-0"
            />
            <label htmlFor="pledge" className="text-[11px] text-[#5B6478] leading-tight">
              I certify this is a legitimate corporate hiring opening. NicheHire maintains zero tolerance for fraudulent postings, security deposit demands, or consultancy commissions.
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#5B6478] hover:text-[#12172B] font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isLoggedIn || !hasValidMembership}
              className="px-5 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Job Opening'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
