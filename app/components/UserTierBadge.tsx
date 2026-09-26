'use client';

import React from 'react';
import { AccessResult } from '../types/premium';

interface UserTierBadgeProps {
  access: AccessResult;
  onClick?: () => void;
  compact?: boolean;
}

export default function UserTierBadge({ access, onClick, compact = false }: UserTierBadgeProps) {
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
        <span>👑</span>
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
        <span>⚡</span>
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
        <span>💎</span>
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
        <span>🟡</span>
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
        className={`inline-flex items-center gap-1 font-semibold rounded-full transition-all bg-blue-50 text-blue-700 border border-blue-200 shadow-xs hover:border-blue-300 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        }`}
        title="Rising Member (10+ Referrals) — Star Badge & Job Match %"
      >
        <span>⭐</span>
        <span>Rising</span>
      </button>
    );
  }

  // 6. Default Member
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-medium rounded-full transition-all bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
      title="Member — Invite friends or subscribe to unlock Premium"
    >
      <span>🌱</span>
      <span>Member</span>
    </button>
  );
}
