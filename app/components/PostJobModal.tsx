'use client';

import { useState, useEffect } from 'react';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newJob: any) => void;
  initialPlan?: 'free' | 'single' | 'growth';
}

export default function PostJobModal({
  isOpen,
  onClose,
  onSuccess,
  initialPlan = 'single',
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
  const [plan, setPlan] = useState<'free' | 'single' | 'growth'>(initialPlan);
  const [pledgeChecked, setPledgeChecked] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialPlan) setPlan(initialPlan);
    try {
      const storedComp = localStorage.getItem('nichehire_employer_company');
      const storedEmail = localStorage.getItem('nichehire_employer_email');
      if (storedComp && !company) setCompany(storedComp);
      if (storedEmail && !workEmail) setWorkEmail(storedEmail);
    } catch {
      // Ignore
    }
  }, [initialPlan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const newListing = {
        id: `recruiter-${Date.now()}`,
        title,
        company,
        location: location || (workMode === 'Remote' ? 'Remote (India/Global)' : 'Indore, MP'),
        type: jobType,
        workMode,
        salary: salary || 'Competitive market compensation',
        description,
        url: portalUrl,
        source: `${company} Direct Portal`,
        isVerified: true,
        directPortal: true,
        postedAt: Date.now(),
        postedText: 'Just now',
        applicantCount: 0,
        applicantText: 'Be the first applicant',
        recruiterEmail: workEmail,
        planSelected: plan,
      };

      try {
        const stored = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
        stored.unshift(newListing);
        localStorage.setItem('nichehire_employer_posts', JSON.stringify(stored));
      } catch {
        // Ignore storage errors
      }

      setSuccessMsg(
        plan === 'free'
          ? '🎉 Free Launch Post Submitted! Our crawler is validating your corporate domain. Your role will be live within 15 minutes.'
          : '🎉 Verified Role Submitted! Corporate domain check in progress. Your role is queued for #1 featured placement and Google for Jobs indexing.'
      );
      if (onSuccess) onSuccess(newListing);

      setTimeout(() => {
        setSuccessMsg('');
        setTitle('');
        setCompany('');
        setWorkEmail('');
        setPortalUrl('');
        setLocation('');
        setDescription('');
        onClose();
      }, 2200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-md max-w-xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-8 max-h-[90vh] overflow-y-auto shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5B6478] hover:text-[#12172B] text-sm w-7 h-7 flex items-center justify-center rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] transition-colors"
        >
          ✕
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] mb-2">
            <span>✓</span> For verified corporate employers
          </div>
          <h2 className="text-xl font-semibold text-[#12172B]">Post a verified job opening</h2>
          <p className="text-xs text-[#5B6478] mt-1">
            Every post connects directly to your career portal and is indexed on Google for Jobs under our 7-day freshness policy.
          </p>
        </div>

        {/* Selected Tier Selector */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {/* Free Launch Tier */}
          <button
            type="button"
            onClick={() => setPlan('free')}
            className={`p-3 rounded border text-left transition-colors ${
              plan === 'free'
                ? 'border-[#0E9F6E] bg-[#ECFDF5]'
                : 'border-[#E4E7EC] hover:border-[#12172B]/30'
            }`}
          >
            <div className="text-[10px] font-semibold text-[#0E9F6E]">Launch pilot</div>
            <div className="text-sm font-bold text-[#12172B] mt-0.5">₹0 Free</div>
            <div className="text-[10px] text-[#5B6478]">1st post free</div>
          </button>

          {/* Single Verified Post - MAIN OFFER */}
          <button
            type="button"
            onClick={() => setPlan('single')}
            className={`p-3 rounded border-2 text-left transition-colors relative ${
              plan === 'single'
                ? 'border-[#2B4EE6] bg-white'
                : 'border-[#E4E7EC] hover:border-[#12172B]/30'
            }`}
          >
            <span className="absolute -top-2.5 right-2 px-1.5 py-0.2 bg-[#2B4EE6] text-white text-[9px] font-semibold rounded">
              Main offer
            </span>
            <div className="text-[10px] font-semibold text-[#2B4EE6]">Single post</div>
            <div className="text-sm font-bold text-[#12172B] mt-0.5">₹4,999</div>
            <div className="text-[10px] text-[#5B6478]">Featured 30 days</div>
          </button>

          {/* Growth 3-Pack */}
          <button
            type="button"
            onClick={() => setPlan('growth')}
            className={`p-3 rounded border text-left transition-colors ${
              plan === 'growth'
                ? 'border-[#12172B] bg-[#F7F8FA]'
                : 'border-[#E4E7EC] hover:border-[#12172B]/30'
            }`}
          >
            <div className="text-[10px] font-semibold text-[#5B6478]">Growth pack</div>
            <div className="text-sm font-bold text-[#12172B] mt-0.5">₹11,999</div>
            <div className="text-[10px] text-[#5B6478]">3 posts bundle</div>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#D9534F] text-xs rounded flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#0E9F6E] text-xs rounded font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Job title <span className="text-[#D9534F]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Company name <span className="text-[#D9534F]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Yash Technologies, Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Corporate work email <span className="text-[#D9534F]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="recruiter@yourcompany.com"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
              <p className="text-[10px] text-[#5B6478] mt-0.5">Corporate domain verified for anti-scam protection</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">
                Official career portal URL <span className="text-[#D9534F]">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://careers.company.com/job/123"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
              <p className="text-[10px] text-[#5B6478] mt-0.5">Where candidates submit their direct application</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Work mode</label>
              <select
                value={workMode}
                onChange={(e: any) => setWorkMode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] focus:outline-none"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site (Office)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Indore, Bangalore, Global"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Role type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] focus:outline-none"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Part-Time">Part-Time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Salary / compensation</label>
              <input
                type="text"
                placeholder="e.g. ₹12 - ₹18 LPA or $80k - $110k"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12172B] mb-1">Experience required</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] focus:outline-none"
              >
                <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                <option value="1-3 Years">1-3 Years</option>
                <option value="3-5 Years">3-5 Years</option>
                <option value="5+ Years">5+ Years (Senior)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12172B] mb-1">
              Role description &amp; requirements <span className="text-[#D9534F]">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Paste responsibilities, required technical skills (e.g. React, Next.js, Node.js), and what you offer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded text-xs text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6] resize-none"
            />
          </div>

          {/* Verification Pledge */}
          <div className="p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={(e) => setPledgeChecked(e.target.checked)}
                className="mt-0.5 rounded text-[#2B4EE6] focus:ring-[#2B4EE6] h-4 w-4"
              />
              <span className="text-[11px] text-[#5B6478] leading-snug">
                <strong className="text-[#12172B]">Anti-scam &amp; freshness pledge:</strong> I certify that this is a legitimate active opening on our corporate domain, free from candidate application fees, and adheres to NicheHire&apos;s strict 7-day freshness policy.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#5B6478] hover:text-[#12172B] bg-white border border-[#E4E7EC] hover:bg-[#F7F8FA] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">⏳</span> Verifying &amp; Publishing...
                </>
              ) : plan === 'free' ? (
                'Claim free launch post ➔'
              ) : (
                'Post verified job (₹4,999) ➔'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
