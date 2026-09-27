'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Edit3, AlertTriangle, Clock } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  onSaveJob: (updatedJob: any) => void;
  onCancelListing: (jobId: string) => void;
  onDeleteListing: (jobId: string) => void;
  onReactivateListing?: (jobId: string) => void;
}

export default function EditJobModal({
  isOpen,
  onClose,
  job,
  onSaveJob,
  onCancelListing,
  onDeleteListing,
  onReactivateListing,
}: EditJobModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('Remote');
  const [jobType, setJobType] = useState('Full-Time');
  const [salary, setSalary] = useState('');
  const [description, setDescription] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'paused' | 'closed'>('active');

  useEffect(() => {
    if (job) {
      setTitle(job.title || '');
      setCompany(job.company || '');
      setLocation(job.location || '');
      setWorkMode(job.workMode || 'Remote');
      setJobType(job.type || 'Full-Time');
      setSalary(job.salary || '');
      setDescription(job.description || '');
      setPortalUrl(job.url || job.portalUrl || '');
      setStatus(job.status || 'active');
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedCompany = company.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle || !trimmedCompany || !trimmedDesc) {
      alert('Please fill in required fields: Job Title, Company Name, and Description.');
      return;
    }

    // Quality check: Title
    if (trimmedTitle.length < 4) {
      alert('Job Title must be at least 4 characters long.');
      return;
    }
    if (/(.)\1{3,}/.test(trimmedTitle)) {
      alert('Job Title contains excessive repeated characters. Please enter a genuine role name.');
      return;
    }
    if (!/[aeiouy]/i.test(trimmedTitle) || !/[bcdfghjklmnpqrstvwxyz]/i.test(trimmedTitle)) {
      alert('Please enter a realistic, recognizable job title.');
      return;
    }
    const GIBBERISH = ['gfguy', 'bgugg', 'asdf', 'asdfgh', 'qwerty', 'test job', 'xyz123'];
    if (GIBBERISH.some((w) => trimmedTitle.toLowerCase().replace(/\s+/g, '').includes(w))) {
      alert('Please enter a genuine, professional job title instead of placeholder text.');
      return;
    }

    // Quality check: Description
    if (trimmedDesc.length < 30) {
      alert('Job Description must be at least 30 characters long to provide clear role expectations for candidates.');
      return;
    }
    const words = trimmedDesc.split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      alert('Job Description must contain at least 5 words describing role responsibilities.');
      return;
    }
    if (GIBBERISH.some((w) => trimmedDesc.toLowerCase().trim() === w)) {
      alert('Please provide a genuine job description rather than placeholder text.');
      return;
    }

    const updated = {
      ...job,
      title: trimmedTitle,
      company: trimmedCompany,
      location: location.trim() || 'Remote (India/Global)',
      workMode,
      type: jobType,
      salary: salary.trim() || 'Competitive market compensation',
      description: trimmedDesc,
      url: portalUrl.trim(),
      status,
      updatedAt: Date.now(),
    };

    onSaveJob(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-[#E4E7EC] mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center font-bold">
            <Edit3 size={18} strokeWidth={ICON_STROKE_WIDTH} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#12172B]">Edit / Override Job Listing</h2>
            <p className="text-xs text-[#5B6478]">
              Update role parameters, change hiring status, or cancel this listing.
            </p>
          </div>
        </div>

        {/* Status Actions Banner */}
        <div className="p-3.5 bg-[#F7F8FA] rounded-2xl border border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5B6478] tracking-wider block">
              Current Listing Status
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : status === 'paused'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {status.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#5B6478]">
                {status === 'active'
                  ? 'Accepting candidate applications'
                  : status === 'paused'
                  ? 'Temporarily paused from search'
                  : 'Closed / Cancelled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === 'active' ? (
              <button
                type="button"
                onClick={() => {
                  setStatus('closed');
                  onCancelListing(job.id);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors"
              >
                Cancel / Close Listing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatus('active');
                  if (onReactivateListing) onReactivateListing(job.id);
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors"
              >
                Re-activate Listing
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete "${job.title}"?`)) {
                  onDeleteListing(job.id);
                  onClose();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete permanently"
            >
              <Trash2 size={16} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Job Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Company Name *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Location</label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Maharashtra or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl bg-white"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl bg-white"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Walk-in Drive">Walk-in Drive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Salary / Compensation</label>
              <input
                type="text"
                placeholder="e.g. ₹6,00,000 - ₹9,00,000 PA"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Official Career Portal Link</label>
              <input
                type="url"
                placeholder="https://company.com/careers/role"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-[#12172B]">Job Description &amp; Requirements *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6] leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E7EC] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-[#5B6478] hover:text-[#12172B]"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Save &amp; Override Listing</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
