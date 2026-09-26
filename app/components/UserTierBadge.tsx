'use client';

import React from 'react';
import { AccessResult } from '../types/premium';
import { Crown, Star, Sparkles, ShieldCheck, Zap } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface UserTierBadgeProps {
  access: AccessResult;
  onClick?: () => void;
  compact?: boolean;
}

export default function UserTierBadge({ access, onClick, compact = false }: UserTierBadgeProps) {
  const iconSize = compact ? 13 : ICON_SIZES.inline;

  // 1. Founder Badge
  if (access.level === 'unlimited' && access.badge === 'founder') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-all bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 text-amber-700 border border-amber-300 shadow-xs hover:border-amber-400 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
        title="Founder Account — Full Unmetered System Access"
      >
        <Crown size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-600 shrink-0" />
        <span>Founder</span>
        {!compact && (
          <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-800 rounded font-semibold">
            VIP
          </span>
        )}
      </button>
    );
  }

  // 2. Founder-Referred Unlimited Override
  if (access.level === 'unlimited' && access.badge === 'referral') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-all bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] shadow-xs hover:border-emerald-400 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
        title="Founder Referral Override — Unlimited Access"
      >
        <Zap size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0" />
        <span>Unlimited</span>
        {!compact && (
          <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 rounded font-semibold">
            Pass
          </span>
        )}
      </button>
    );
  }

  // 3. Premium Tier (Earned via 100 referrals OR ₹199/mo subscription)
  if (access.level === 'premium') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-all bg-gradient-to-r from-purple-500/10 to-indigo-500/15 text-indigo-700 border border-indigo-200 shadow-xs hover:border-indigo-400 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
        title="NicheHire Premium Member"
      >
        <Sparkles size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0" />
        <span>Premium</span>
      </button>
    );
  }

  // 4. Trusted Tier (50+ referrals)
  if (access.level === 'trusted') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-all bg-amber-50 text-amber-700 border border-amber-200 shadow-xs hover:border-amber-300 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        }`}
        title="Trusted Member (50+ Referrals) — Gold Name & HR Email Drafts"
      >
        <ShieldCheck size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0" />
        <span className="bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent">
          Trusted
        </span>
      </button>
    );
  }

  // 5. Rising Tier (10+ referrals)
  if (access.level === 'rising') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full transition-all bg-emerald-50 text-[#0E9F6E] border border-emerald-200 shadow-xs hover:border-emerald-300 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        }`}
        title="Rising Member (10+ Referrals) — Star Badge & Job Match %"
      >
        <Star
          size={iconSize}
          strokeWidth={ICON_STROKE_WIDTH}
          className="fill-[#0E9F6E] text-[#0E9F6E] shrink-0"
        />
        <span>Rising</span>
      </button>
    );
  }

  // 6. Default Member: Text-only styled label (no icon per Icon System rules)
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-full transition-all bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
      title="Member — Invite friends or subscribe to unlock Premium"
    >
      <span>Member</span>
    </button>
  );
}
