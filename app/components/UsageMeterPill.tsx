'use client';

import React from 'react';
import { ArrowRight } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface UsageMeterPillProps {
  remaining: number;
  total?: number;
  quotaBypass?: boolean;
  featureName?: string;
  onUpgradeClick?: () => void;
}

export default function UsageMeterPill({
  remaining,
  total = 11,
  quotaBypass = false,
  featureName = 'tailored resumes',
  onUpgradeClick,
}: UsageMeterPillProps) {
  if (quotaBypass) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Unlimited {featureName}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 rounded text-emerald-700">
          BYPASS
        </span>
      </div>
    );
  }

  const isLow = remaining <= 2;
  const isExhausted = remaining === 0;

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs ${
          isExhausted
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : isLow
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-[#F7F8FA] text-[#12172B] border-[#E4E7EC]'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isExhausted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-[#2B4EE6]'
          }`}
        ></span>
        <span>
          <strong>{remaining}</strong> of {total} {featureName} left this month
        </span>
      </div>

      {(isLow || isExhausted) && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="text-xs font-semibold text-[#2B4EE6] hover:underline inline-flex items-center gap-1"
        >
          <span>Unlock More</span>
          <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
        </button>
      )}
    </div>
  );
}
