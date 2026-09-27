'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
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
  ShieldCheck,
  Mail,
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

  // Email OTP Verification State (For when recruiter email is different from logged in email)
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

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

  const normalizedEmployerEmail = (employerEmail || '').toLowerCase().trim();
  const normalizedWorkEmail = (workEmail || '').toLowerCase().trim();
  const isSameAsLogin = Boolean(normalizedEmployerEmail && normalizedWorkEmail === normalizedEmployerEmail);
  const isEmailVerified = isSameAsLogin || (verifiedEmail === normalizedWorkEmail);

  // Membership validation
  const isPendingVerification = activeMembership?.status === 'pending';
  const hasValidMembership =
    Boolean(activeMembership) &&
    activeMembership!.status === 'active' &&
    activeMembership!.usedJobs < activeMembership!.totalJobs &&
    activeMembership!.expiresAt > Date.now();

  const remainingSlots = activeMembership
    ? Math.max(0, activeMembership.totalJobs - activeMembership.usedJobs)
    : 0;

  const handleSendOtp = async () => {
    if (!normalizedWorkEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedWorkEmail)) {
      setOtpNotice({ type: 'error', message: 'Please enter a valid email address first.' });
      return;
    }
    setIsSendingOtp(true);
    setOtpNotice(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: normalizedWorkEmail, type: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code.');

      setOtpSent(true);
      if (data.otpCode) {
        setDispatchedOtp(data.otpCode);
        setOtpInput(data.otpCode);
      }
      setOtpNotice({
        type: 'success',
        message: data.message || `Verification OTP code dispatched to ${normalizedWorkEmail}.`,
      });
    } catch (err: any) {
      setOtpNotice({ type: 'error', message: err.message || 'Error generating verification code.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpNotice({ type: 'error', message: 'Please enter the 6-digit verification OTP code.' });
      return;
    }
    setIsVerifyingOtp(true);
    setOtpNotice(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: normalizedWorkEmail, code: otpInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired OTP code.');

      setVerifiedEmail(normalizedWorkEmail);
      setOtpNotice({
        type: 'success',
        message: `✓ Contact email ${normalizedWorkEmail} verified successfully!`,
      });
    } catch (err: any) {
      setOtpNotice({ type: 'error', message: err.message || 'OTP verification failed.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

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

    if (isPendingVerification) {
      setErrorMsg('Your payment proof is currently PENDING Admin verification. Once our founder verifies your UPI transfer, job posting slots will unlock automatically.');
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

    if (!title.trim() || !company.trim() || !workEmail.trim() || !description.trim()) {
      setErrorMsg('Please fill in all required fields (Job Title, Company, Contact Email, and Description).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedWorkEmail)) {
      setErrorMsg('Please enter a valid recruiter or contact email address (Gmail, Yahoo, Outlook, or corporate).');
      return;
    }

    // REQUIRE EMAIL VERIFICATION: If work email is different from logged in email, it MUST be verified
    if (!isEmailVerified) {
      setErrorMsg(`Your contact email (${workEmail}) is different from your login email (${employerEmail}). Please verify it with the 6-digit OTP code below before publishing.`);
      return;
    }

    // 1. Strict Quality Check: Job Title
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 4) {
      setErrorMsg('Job Title must be at least 4 characters long.');
      return;
    }
    if (/(.)\1{3,}/.test(trimmedTitle)) {
      setErrorMsg('Job Title contains excessive repeated characters. Please enter a genuine role name.');
      return;
    }
    if (!/[aeiouy]/i.test(trimmedTitle) || !/[bcdfghjklmnpqrstvwxyz]/i.test(trimmedTitle)) {
      setErrorMsg('Please enter a realistic, recognizable job title (e.g. Accounts Assistant, Marketing Lead).');
      return;
    }
    const GIBBERISH_PATTERNS = ['gfguy', 'bgugg', 'asdf', 'asdfgh', 'qwerty', 'test job', 'xyz123', 'fakejob'];
    if (GIBBERISH_PATTERNS.some((w) => trimmedTitle.toLowerCase().replace(/\s+/g, '').includes(w))) {
      setErrorMsg('Please enter a genuine, professional job title instead of placeholder text.');
      return;
    }

    // 2. Strict Quality Check: Company Name
    const trimmedCompany = company.trim();
    if (trimmedCompany.length < 2) {
      setErrorMsg('Company Name must be at least 2 characters long.');
      return;
    }

    // 3. Strict Quality Check: Job Description
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 30) {
      setErrorMsg('Job Description must be at least 30 characters long to provide clear role expectations for candidates.');
      return;
    }
    const words = trimmedDesc.split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      setErrorMsg('Job Description must contain at least 5 words describing role responsibilities or qualifications.');
      return;
    }
    if (GIBBERISH_PATTERNS.some((w) => trimmedDesc.toLowerCase().trim() === w)) {
      setErrorMsg('Please provide a genuine job description explaining responsibilities and candidate qualifications.');
      return;
    }

    // 4. Strict Quality Check: Application / Portal URL
    let formattedUrl = portalUrl.trim();
    if (formattedUrl) {
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        if (formattedUrl.includes('.')) {
          formattedUrl = `https://${formattedUrl}`;
        } else {
          setErrorMsg('Please provide a valid application URL or career portal link (e.g. https://company.com/careers).');
          return;
        }
      }
    } else {
      formattedUrl = `mailto:${normalizedWorkEmail}`;
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

      // 1. Insert into Supabase employer_postings table
      let savedDbId: string | null = null;
      try {
        const { data: dbData, error: dbErr } = await supabase
          .from('employer_postings')
          .insert([
            {
              title: trimmedTitle,
              company: trimmedCompany,
              work_email: normalizedWorkEmail,
              portal_url: formattedUrl,
              location: location.trim() || (workMode === 'Remote' ? 'Remote (India/Global)' : 'Indore, MP'),
              work_mode: workMode,
              job_type: jobType,
              salary: salary.trim() || 'Competitive market compensation',
              experience,
              description: trimmedDesc,
              plan_selected: activeMembership?.planName || 'Growth Plan',
              status: 'active',
            },
          ])
          .select()
          .maybeSingle();

        if (dbErr) {
          console.warn('Supabase employer_postings insert warning:', dbErr.message);
        } else if (dbData?.id) {
          savedDbId = dbData.id;
        }
      } catch (insertErr) {
        console.warn('Error inserting job to Supabase:', insertErr);
      }

      const newListing = {
        id: savedDbId || `recruiter-${now}`,
        title: trimmedTitle,
        company: trimmedCompany,
        location: location.trim() || (workMode === 'Remote' ? 'Remote (India/Global)' : 'Indore, MP'),
        type: jobType,
        workMode,
        salary: salary.trim() || 'Competitive market compensation',
        description: trimmedDesc,
        url: formattedUrl,
        source: `${trimmedCompany} Direct Portal`,
        isVerified: true,
        directPortal: true,
        postedAt: now,
        expiresAt,
        validityDays: durationDays,
        status: 'active',
        postedText: 'Just now',
        applicantCount: 0,
        applicantText: 'Be the first applicant',
        recruiterEmail: normalizedWorkEmail,
        planSelected: activeMembership?.planName || 'Growth Plan',
      };

      // 2. Save to employer posts in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
        stored.unshift(newListing);
        localStorage.setItem('nichehire_employer_posts', JSON.stringify(stored));

        // 3. Decrement membership quota
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

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#12172B] mb-1">
                  Recruiter / Contact Email <span className="text-rose-600">*</span>
                  <span className="block text-[10px] text-gray-500 font-normal">
                    (Gmail, Yahoo, Outlook, or corporate domain)
                  </span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!isLoggedIn || !hasValidMembership}
                  placeholder="e.g. recruiter@gmail.com or hr@company.com"
                  value={workEmail}
                  onChange={(e) => {
                    setWorkEmail(e.target.value);
                    if (otpNotice) setOtpNotice(null);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12172B] mb-1">
                  Location (City / State) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isLoggedIn || !hasValidMembership}
                  placeholder="e.g. Gangtok, Sikkim / Mumbai, MH"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-xl text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>
            </div>

            {/* Email Verification Status / OTP Panel */}
            {workEmail && (
              <div className="mt-2">
                {isSameAsLogin ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <Check size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-600 shrink-0" />
                    <span>✓ Pre-verified via your logged-in employer account ({employerEmail})</span>
                  </div>
                ) : isEmailVerified ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <Check size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-600 shrink-0" />
                    <span>✓ Contact email verified successfully via OTP</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-900 leading-snug">
                      <ShieldCheck size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        This email differs from your login email ({employerEmail}). To prevent spam &amp; candidate spoofing, verify this email with a 6-digit OTP code before posting.
                      </span>
                    </div>

                    {!otpSent ? (
                      <button
                        type="button"
                        disabled={isSendingOtp || !workEmail.includes('@')}
                        onClick={handleSendOtp}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Mail size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        <span>{isSendingOtp ? 'Sending OTP Code...' : `Send OTP to ${workEmail}`}</span>
                      </button>
                    ) : (
                      <div className="space-y-2 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                        {dispatchedOtp && (
                          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-center">
                            <div className="flex items-center justify-between text-[10px] text-blue-900 font-bold mb-1">
                              <span>Verification OTP Code:</span>
                              <button
                                type="button"
                                onClick={() => setOtpInput(dispatchedOtp)}
                                className="px-1.5 py-0.5 bg-[#2B4EE6] text-white rounded text-[9px] font-bold"
                              >
                                Auto-Fill
                              </button>
                            </div>
                            <span className="font-mono text-base font-black text-[#2B4EE6] tracking-widest">{dispatchedOtp}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="6-Digit OTP"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-32 px-2.5 py-1.5 text-xs font-mono font-bold tracking-widest text-center border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                          />
                          <button
                            type="button"
                            disabled={isVerifyingOtp || otpInput.length !== 6}
                            onClick={handleVerifyOtp}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                          </button>
                          <button
                            type="button"
                            disabled={isSendingOtp}
                            onClick={handleSendOtp}
                            className="text-[11px] text-amber-800 hover:underline font-semibold ml-1"
                          >
                            Resend Code
                          </button>
                        </div>
                      </div>
                    )}

                    {otpNotice && (
                      <div className={`text-[11px] font-semibold ${otpNotice.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {otpNotice.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
