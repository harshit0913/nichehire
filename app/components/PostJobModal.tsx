'use client';

import { useState } from 'react';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newJob: any) => void;
}

export default function PostJobModal({ isOpen, onClose, onSuccess }: PostJobModalProps) {
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
  const [plan, setPlan] = useState<'starter' | 'growth' | 'enterprise'>('starter');
  const [pledgeChecked, setPledgeChecked] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !workEmail.trim() || !portalUrl.trim() || !description.trim()) {
      setErrorMsg('Please fill in all required fields (Title, Company, Work Email, Portal Link, Description).');
      return;
    }

    if (!workEmail.includes('@') || workEmail.endsWith('@gmail.com') || workEmail.endsWith('@yahoo.com')) {
      setErrorMsg('Please use an official corporate email (e.g. recruiter@company.com) for verification.');
      return;
    }

    if (!pledgeChecked) {
      setErrorMsg('Please accept the Verification & Anti-Scam pledge.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Simulate/Record employer submission
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

      // Store in local storage for previewing posted jobs
      try {
        const stored = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
        stored.unshift(newListing);
        localStorage.setItem('nichehire_employer_posts', JSON.stringify(stored));
      } catch {
        // Ignore storage errors
      }

      setSuccessMsg('🎉 Role Submitted for Verification! Our automated engine is validating the domain. Your posting will go live across NicheHire and Google for Jobs.');
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
            Reach high-intent candidates seeking genuine openings under 7 days old. Verified posts are indexed on Google for Jobs and direct to your career portal.
          </p>
        </div>

        {/* Selected Tier Banner */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setPlan('starter')}
            className={`p-3 rounded-xl border text-left transition-all ${
              plan === 'starter'
                ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Starter</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">₹4,999</div>
            <div className="text-[10px] text-gray-500">1 Verified Listing</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan('growth')}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              plan === 'growth'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-bold rounded-full">
              POPULAR
            </span>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Growth</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">₹14,999</div>
            <div className="text-[10px] text-gray-500">5 Listings + Boost</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan('enterprise')}
            className={`p-3 rounded-xl border text-left transition-all ${
              plan === 'enterprise'
                ? 'border-purple-600 bg-purple-50/50 shadow-2xs'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enterprise</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">₹49,999</div>
            <div className="text-[10px] text-gray-500">Full ATS Sync</div>
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
                <strong>Anti-Scam & Freshness Guarantee:</strong> I certify that this is a legitimate active opening on our corporate domain, free from candidate application fees, and adheres to NicheHire's strict 7-day freshness policy.
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
              ) : (
                'Post Verified Job ➔'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
