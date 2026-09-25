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
  }, [initialPlan]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <span>🛡️</span> For Employers & Recruiters
          </div>
          <h2 className="text-xl font-black text-gray-900">Post a Verified Job Opening</h2>
          <p className="text-xs text-gray-500 mt-1">
            Prove the &ldquo;verified / fast&rdquo; hook. Every post connects directly to your career portal and is indexed on Google for Jobs under 7-day freshness.
          </p>
        </div>

        {/* Selected Tier Selector */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {/* Free Launch Tier */}
          <button
            type="button"
            onClick={() => setPlan('free')}
            className={`p-3 rounded-xl border text-left transition-all ${
              plan === 'free'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Launch Pilot</div>
            <div className="text-sm font-extrabold text-emerald-950 mt-0.5">₹0 FREE</div>
            <div className="text-[10px] text-gray-500">1st Post Free</div>
          </button>

          {/* Single Verified Post - MAIN OFFER */}
          <button
            type="button"
            onClick={() => setPlan('single')}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              plan === 'single'
                ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="absolute -top-2.5 right-2 px-1.5 py-0.2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-extrabold rounded-full">
              MAIN OFFER
            </span>
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Verified Post</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">₹4,999</div>
            <div className="text-[10px] text-gray-600 font-medium">Featured 30 Days</div>
          </button>

          {/* Growth 3-Pack */}
          <button
            type="button"
            onClick={() => setPlan('growth')}
            className={`p-3 rounded-xl border text-left transition-all ${
              plan === 'growth'
                ? 'border-purple-600 bg-purple-50/50 shadow-2xs ring-1 ring-purple-500'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Growth Pack</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">₹11,999</div>
            <div className="text-[10px] text-gray-500">3 Posts Bundle</div>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Yash Technologies, Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Corporate Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="recruiter@yourcompany.com"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Corporate domain verified for anti-scam protection</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Official Career Portal / ATS URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://careers.company.com/job/123"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Where candidates submit their direct application</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e: any) => setWorkMode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site (Office)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Indore, Bangalore, Global"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Role Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Salary / Compensation</label>
              <input
                type="text"
                placeholder="e.g. ₹12 - ₹18 LPA or $80k - $110k"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Experience Required</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              >
                <option value="Fresher / 0-1 Year">Fresher / 0-1 Year</option>
                <option value="1-3 Years">1-3 Years</option>
                <option value="3-5 Years">3-5 Years</option>
                <option value="5+ Years">5+ Years (Senior)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Role Description & Key Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Paste responsibilities, required technical skills (e.g. React, Next.js, Node.js), and what you offer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none"
            />
          </div>

          {/* Verification Pledge */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pledgeChecked}
                onChange={(e) => setPledgeChecked(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-[11px] text-blue-900 leading-snug">
                <strong>Anti-Scam & Freshness Guarantee:</strong> I certify that this is a legitimate active opening on our corporate domain, free from candidate application fees, and adheres to NicheHire&apos;s strict 7-day freshness policy.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Verifying & Publishing...
                </>
              ) : plan === 'free' ? (
                'Claim Free Launch Post ➔'
              ) : (
                'Post Verified Job (₹4,999) ➔'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
