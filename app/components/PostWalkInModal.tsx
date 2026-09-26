'use client';

import { useState, useEffect } from 'react';
import { X, Footprints, Check } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface PostWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newWalkin: any) => void;
  initialLocation?: string;
}

export default function PostWalkInModal({ isOpen, onClose, onSuccess, initialLocation = '' }: PostWalkInModalProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState(initialLocation);
  const [timings, setTimings] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [roleType, setRoleType] = useState('Full-Time');
  const [postedBy, setPostedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && initialLocation && !location) {
      setLocation(initialLocation);
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !location.trim() || !contactInfo.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/walkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company,
          location,
          timings,
          contact_info: contactInfo,
          description,
          role_type: roleType,
          posted_by: postedBy || 'Community Member',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post walk-in');

      setSuccessMsg('Walk-in listing published successfully! It will be live for 5 days.');
      if (data.walkin) {
        onSuccess(data.walkin);
      }

      setTimeout(() => {
        setSuccessMsg('');
        setTitle('');
        setCompany('');
        setLocation('');
        setTimings('');
        setContactInfo('');
        setDescription('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-2">
            <Footprints size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Community Walk-Ins</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Post an Offline / Walk-In Opening</h2>
          <p className="text-xs text-gray-500">
            Seen a hiring notice or banner at a local store, clinic, or business? Share it here to help fellow jobseekers.
          </p>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl mb-4 text-[11px] text-amber-900 leading-relaxed">
          <strong>Community Guideline:</strong> Walk-in opportunities automatically expire in <strong>5 days</strong> to keep listings accurate and fresh.
        </div>

        {errorMsg && (
          <div className="p-3 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl font-semibold text-center flex items-center justify-center gap-1.5">
            <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Role Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Retail Cashier, Junior Accountant, Store Executive"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Company / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Sharma Traders, Star Diagnostics"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Role Type
              </label>
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Contract</option>
                <option>Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Exact Address / Landmark <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shop #12, Near Metro Station, MG Road, Bangalore"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Walk-in Interview Timings
              </label>
              <input
                type="text"
                value={timings}
                onChange={(e) => setTimings(e.target.value)}
                placeholder="e.g. Mon-Fri, 10:00 AM - 2:00 PM"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Contact Person & Phone / Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. +91 98765 43210 (Mr. Gupta)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Requirements / Instructions (What should candidates bring?)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bring printed resume and ID proof. Freshers welcome. Basic computer skills preferred."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Walk-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
