'use client';

import React from 'react';

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  salary?: string;
  description: string;
  url: string;
  source: string;
  isStartup?: boolean;
  isVerified?: boolean;
  directPortal?: boolean;
  postedAt?: number;
  postedText?: string;
  applicantCount?: number;
  applicantText?: string;
  geoTier?: number;
};

export type FitRecommendation = {
  tier: 'high' | 'medium' | 'low' | 'neutral';
  label: string;
  badgeBg: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  educationMatch: string | null;
  experienceMatch: string | null;
  reason: string;
};

export type TailorState = {
  loading: boolean;
  text?: string;
  error?: string;
  open: boolean;
};

interface JobCardItemProps {
  job: Job;
  rec: FitRecommendation;
  isSaved: boolean;
  tailor?: TailorState;
  locationQuery?: string;
  onOpenDetails: (job: Job) => void;
  onToggleSave: (id: string) => void;
  onTailorResume: (job: Job) => void;
  formatTimeAgo: (timestamp?: number) => string;
}

export default function JobCardItem({
  job,
  rec,
  isSaved,
  tailor,
  locationQuery,
  onOpenDetails,
  onToggleSave,
  onTailorResume,
  formatTimeAgo,
}: JobCardItemProps) {
  return (
    <div className="border border-gray-200/90 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all bg-white overflow-hidden p-5 flex flex-col md:flex-row justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Top Badges Row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3
            onClick={() => onOpenDetails(job)}
            className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {job.title}
          </h3>

          {/* Apply Recommendation Badge */}
          <span
            className={`px-2.5 py-0.5 text-[11px] rounded-full border shadow-2xs flex items-center gap-1 ${rec.badgeBg}`}
            title={rec.reason}
          >
            {rec.tier === 'high' ? '🟢' : rec.tier === 'medium' ? '🟡' : rec.tier === 'low' ? '🔴' : '📄'}
            {rec.label}
          </span>

          {/* Verified Genuine Badge */}
          {job.isVerified && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-0.5">
              🛡️ Verified
            </span>
          )}

          {/* Direct Career Portal Badge */}
          {job.directPortal && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              🏢 Direct Career Portal
            </span>
          )}

          {/* Local Proximity Badge */}
          {job.geoTier === 1 && locationQuery && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              📍 Local to {locationQuery}
            </span>
          )}

          {/* Work Mode Badge */}
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
              job.workMode === 'On-site'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : job.workMode === 'Hybrid'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {job.workMode === 'On-site' ? '🏢 Office' : job.workMode === 'Hybrid' ? '🔄 Hybrid' : '🌐 Remote'}
          </span>
        </div>

        {/* Subtitle / Company metadata */}
        <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800">{job.company}</span>
          <span>•</span>
          <span>📍 {job.location}</span>
          <span>•</span>
          <span>⏱️ {job.postedText || formatTimeAgo(job.postedAt)}</span>
          {job.salary && (
            <>
              <span>•</span>
              <span className="font-semibold text-emerald-700">💰 {job.salary}</span>
            </>
          )}
          <span>•</span>
          <span className="text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
            👥 {job.applicantText || (job.applicantCount ? `${job.applicantCount} applicants` : 'Early applicant')}
          </span>
        </p>

        {/* Recommendation Explanation */}
        {rec.tier !== 'neutral' && (
          <div className="mb-3 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
            <p className="text-gray-700 font-medium">
              <strong className="text-gray-900">Why apply? </strong>
              {rec.reason}
            </p>
            {rec.matchedSkills.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Skills Matched:</span>
                {rec.matchedSkills.map((s) => (
                  <span key={s} className="px-1.5 py-0.2 bg-emerald-100/70 text-emerald-900 rounded text-[10px] font-semibold">
                    ✓ {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description Preview */}
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
          {job.description}
        </p>

        {/* Source tag */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>Source: <strong className="text-gray-600">{job.source}</strong></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row md:flex-col justify-end items-end gap-2 shrink-0">
        <div className="flex gap-2 flex-wrap items-center">
          {/* Save */}
          <button
            onClick={() => onToggleSave(job.id)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              isSaved ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save opportunity'}
          >
            {isSaved ? '★' : '☆'}
          </button>

          {/* View in Detail (LinkedIn style drawer) */}
          <button
            onClick={() => onOpenDetails(job)}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            View Details 👁
          </button>

          {/* Tailor Resume */}
          <button
            onClick={() => onTailorResume(job)}
            disabled={tailor?.loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-2xs whitespace-nowrap"
          >
            {tailor?.loading ? '✦ Tailoring...' : '✦ Tailor'}
          </button>

          {/* Apply Direct */}
          <a
            href={job.url || '#'}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors whitespace-nowrap"
          >
            Apply ↗
          </a>
        </div>
      </div>
    </div>
  );
}
