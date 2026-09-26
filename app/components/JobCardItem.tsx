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
  onCloseTailor?: (jobId: string) => void;
  onPrintPdf?: (tailoredText: string, jobTitle: string) => void;
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
  onCloseTailor,
  onPrintPdf,
  formatTimeAgo,
}: JobCardItemProps) {
  // Compute initial initials for company monogram
  const initials = job.company
    ? job.company
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'CO';

  return (
    <article className="group bg-white border border-[#E4E7EC] rounded-md transition-colors hover:border-[#2B4EE6]/40 p-4 sm:p-5 flex flex-col md:flex-row justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Header row: Monogram + Company + Verified + Title */}
        <div className="flex items-start gap-3">
          {/* Subtle Company Monogram */}
          <div className="w-9 h-9 shrink-0 rounded bg-[#F7F8FA] border border-[#E4E7EC] flex items-center justify-center text-xs font-semibold text-[#12172B]">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Company & Verification Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#5B6478]">
              <span className="font-semibold text-[#12172B]">{job.company}</span>

              {/* Verified Badge: Reserved strictly emerald */}
              {job.isVerified && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 rounded"
                  title="Verified genuine direct corporate opening under 7 days old"
                >
                  <svg className="w-3 h-3 text-[#0E9F6E]" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}

              {/* Direct Portal Tag */}
              {job.directPortal && (
                <span className="text-[11px] text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                  Direct Portal
                </span>
              )}

              {/* Work Mode */}
              <span className="text-[11px] text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                {job.workMode}
              </span>

              {/* Local Proximity Indicator */}
              {job.geoTier === 1 && locationQuery && (
                <span className="text-[11px] text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/20 px-1.5 py-0.5 rounded">
                  Local to {locationQuery}
                </span>
              )}
            </div>

            {/* Job Title */}
            <h3
              onClick={() => onOpenDetails(job)}
              className="mt-1 text-[15px] font-semibold text-[#12172B] hover:text-[#2B4EE6] cursor-pointer transition-colors leading-snug"
            >
              {job.title}
            </h3>
          </div>
        </div>

        {/* Metadata Line: Dense, Left-aligned */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs text-[#5B6478]">
          <span>{job.location}</span>
          <span className="text-[#E4E7EC]">•</span>
          <span>{job.postedText || formatTimeAgo(job.postedAt)}</span>

          {job.salary && (
            <>
              <span className="text-[#E4E7EC]">•</span>
              <span className="font-medium text-[#12172B]">{job.salary}</span>
            </>
          )}

          {typeof job.applicantCount === 'number' && job.source?.includes('Employer') && (
            <>
              <span className="text-[#E4E7EC]">•</span>
              <span className="text-[#5B6478]">
                {job.applicantCount === 0 ? 'Be first to apply' : `${job.applicantCount} applicants`}
              </span>
            </>
          )}

          {job.directPortal && (
            <>
              <span className="text-[#E4E7EC]">•</span>
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <span>✓</span> Direct Portal
              </span>
            </>
          )}
        </div>

        {/* Match Scoring Pill (Functional Traffic-Light Triad: Emerald / Amber / Coral) */}
        {rec.tier !== 'neutral' && (
          <div className="mt-3 pt-2.5 border-t border-[#E4E7EC]/70 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {rec.tier === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
                  High match ({rec.score}%)
                </span>
              )}

              {rec.tier === 'medium' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#D97B0A] border border-[#FDE68A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97B0A]"></span>
                  Medium match ({rec.score}%)
                </span>
              )}

              {rec.tier === 'low' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF2F2] text-[#D9534F] border border-[#FECACA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]"></span>
                  Low match ({rec.score}%)
                </span>
              )}

              <span className="text-[#5B6478] text-[12px]">{rec.reason}</span>
            </div>

            {/* Matched Skills list if high or medium */}
            {rec.matchedSkills.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-[#5B6478]">Matched:</span>
                {rec.matchedSkills.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] rounded text-[10px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Short Excerpt */}
        <p className="mt-2 text-xs text-[#5B6478] line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      </div>

      {/* Action Strip: Clean, Functional, High Signal */}
      <div className="flex flex-row md:flex-col justify-end items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E4E7EC]">
        <div className="flex items-center gap-2">
          {/* Bookmark / Save */}
          <button
            onClick={() => onToggleSave(job.id)}
            className={`p-2 rounded border text-xs transition-colors ${
              isSaved
                ? 'bg-[#FFFBEB] text-[#D97B0A] border-[#FDE68A]'
                : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B] hover:border-[#5B6478]/40'
            }`}
            title={isSaved ? 'Remove from saved jobs' : 'Save job to dashboard'}
            aria-label={isSaved ? 'Remove from saved jobs' : 'Save job to dashboard'}
          >
            {isSaved ? '★' : '☆'}
          </button>

          {/* View Details Drawer */}
          <button
            onClick={() => onOpenDetails(job)}
            className="px-3 py-1.5 text-xs font-medium text-[#12172B] bg-white border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#12172B]/30 rounded transition-colors whitespace-nowrap"
          >
            Details
          </button>

          {/* Tailor Resume */}
          <button
            onClick={() => onTailorResume(job)}
            disabled={tailor?.loading}
            className="px-3 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/30 hover:bg-[#2B4EE6]/10 rounded transition-colors whitespace-nowrap"
          >
            {tailor?.loading ? 'Tailoring…' : 'Tailor CV'}
          </button>

          {/* Direct Apply CTA */}
          <a
            href={job.url || '#'}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors whitespace-nowrap"
          >
            Apply ↗
          </a>
        </div>
      </div>

      {/* ─── Tailored Resume Expandable Drawer / Panel ─── */}
      {tailor?.open && (
        <div className="w-full mt-2 pt-3 border-t border-[#E4E7EC] space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]/70">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-xs font-bold text-[#12172B]">
                AI Tailored Resume for {job.title}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#2B4EE6]/10 text-[#2B4EE6] rounded border border-[#2B4EE6]/20">
                ATS Optimized
              </span>
            </div>
            {onCloseTailor && (
              <button
                type="button"
                onClick={() => onCloseTailor(job.id)}
                className="text-xs text-[#5B6478] hover:text-[#12172B] font-medium px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                ✕ Close
              </button>
            )}
          </div>

          {tailor.loading && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[#5B6478]">
              <span className="w-5 h-5 border-2 border-[#2B4EE6] border-t-transparent rounded-full animate-spin"></span>
              <span>Tailoring your bullet points with genuine job keywords…</span>
            </div>
          )}

          {tailor.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
              <span>⚠️</span>
              <div className="flex-1">{tailor.error}</div>
            </div>
          )}

          {tailor.text && (
            <div className="space-y-3">
              <div className="bg-[#F7F8FA] p-3.5 rounded border border-[#E4E7EC] text-xs font-mono text-[#12172B] max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {tailor.text}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tailor.text || '');
                      alert('Tailored resume copied to clipboard!');
                    }}
                    className="px-3 py-1.5 bg-white border border-[#E4E7EC] hover:bg-[#F7F8FA] rounded font-medium text-[#12172B] transition-colors"
                  >
                    📋 Copy Resume
                  </button>

                  {onPrintPdf && (
                    <button
                      type="button"
                      onClick={() => onPrintPdf(tailor.text || '', job.title)}
                      className="px-3 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded font-medium transition-colors shadow-2xs"
                    >
                      🖨️ Print / Download PDF
                    </button>
                  )}
                </div>

                {onCloseTailor && (
                  <button
                    type="button"
                    onClick={() => onCloseTailor(job.id)}
                    className="text-xs text-[#5B6478] hover:text-[#12172B]"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
