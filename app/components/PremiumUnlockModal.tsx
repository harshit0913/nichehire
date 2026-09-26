'use client';

import React, { useState } from 'react';
import { X, Crown, Users, Check, Copy, Star, Clock, Share2, Zap, CreditCard, Target } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface ReferredCandidate {
  id: string;
  maskedId: string;
  status: string;
  createdAt: string;
  qualifiedAt?: string;
}

interface PremiumUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCount?: number;
  provisionalCount?: number;
  referralCode?: string;
  recentReferrals?: ReferredCandidate[];
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
}

export default function PremiumUnlockModal({
  isOpen,
  onClose,
  referralCount = 0,
  provisionalCount = 0,
  referralCode = 'REF-NICHE2026',
  recentReferrals = [],
  isLoggedIn = false,
  onLoginClick,
}: PremiumUnlockModalProps) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${referralCode}`
    : `https://nichehire.in?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hey! Check out NicheHire for fresh, verified jobs direct from company career portals (under 7 days old) and verified govt exam updates: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSubscribe = () => {
    setIsProcessing(true);
    // Simulates Razorpay recurring payment initialization
    setTimeout(() => {
      setIsProcessing(false);
      alert('Razorpay checkout initialized for ₹199/month. Recurring e-mandate configured.');
    }, 1000);
  };

  const progressPercent = Math.min(100, Math.round((referralCount / 100) * 100));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-8 animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          title="Close modal"
          className="absolute top-4 right-4 text-[#5B6478] hover:text-[#12172B] text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F8FA] transition-colors cursor-pointer"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        <div className="text-center max-w-lg mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3 border border-purple-200">
            <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-purple-700" />
            <span>Unified Premium &amp; Referral Program</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#12172B]">
            Refer or Subscribe — You Get Identical Access
          </h2>
          <p className="text-xs text-[#5B6478] mt-1.5 leading-relaxed">
            NicheHire treats referral achievements and subscriptions as 100% equal. Choose the path that fits your budget:
          </p>
        </div>

        {/* ─── Two Equal Side-by-Side Paths ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Path 1: Earn via Referrals */}
          <div className="border border-[#E4E7EC] bg-[#F7F8FA] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              100% FREE
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                <h3 className="text-sm font-bold text-[#12172B]">Path A: Invite Friends</h3>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Earn permanent status by sharing your unique code. Each friend who signs up counts toward your milestones.
              </p>

              {/* Unique Referral Code Badge */}
              <div className="p-2.5 bg-white rounded-lg border border-[#E4E7EC] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#5B6478] uppercase font-bold tracking-wider block">Your Unique Code</span>
                  <span className="text-xs font-mono font-bold text-[#2B4EE6]">{referralCode}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
                >
                  {codeCopied ? (
                    <>
                      <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#12172B]">Referral Progress</span>
                  <span className="text-[#2B4EE6]">{referralCount} Qualified</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2B4EE6] to-[#0E9F6E] transition-all duration-500"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-[#5B6478]">
                  <span className="flex items-center gap-1">10 <Star size={11} strokeWidth={ICON_STROKE_WIDTH} className="fill-emerald-500 text-emerald-500" /> Rising</span>
                  <span>50 Trusted</span>
                  <span className="flex items-center gap-1">100 <Crown size={11} strokeWidth={ICON_STROKE_WIDTH} className="text-purple-600" /> Premium</span>
                </div>
                {provisionalCount > 0 && (
                  <div className="text-[11px] text-[#D97B0A] bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                    <Clock size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A] shrink-0" />
                    <span><strong>{provisionalCount} referral(s)</strong> in standard 7-day anti-fraud verification</span>
                  </div>
                )}
              </div>

              {/* Referral Link Copy */}
              <div className="pt-1 space-y-2">
                <div className="flex items-center gap-1.5 p-2 bg-white rounded border border-[#E4E7EC] text-xs">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="bg-transparent flex-1 text-[11px] text-[#12172B] focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-1.5 px-3 text-xs font-semibold text-[#0E9F6E] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E4E7EC] text-[11px] text-[#5B6478] mt-3 flex items-center gap-1.5">
              <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
              <span>Permanent badge &amp; status retention</span>
            </div>
          </div>

          {/* Path 2: Instant Subscription */}
          <div className="border-2 border-[#2B4EE6] bg-white rounded-xl p-5 flex flex-col justify-between relative shadow-sm">
            <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
              INSTANT UNLOCK
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                <h3 className="text-sm font-bold text-[#12172B]">Path B: ₹199 / month</h3>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Unlock instant access without waiting for 100 referrals. Cancel anytime self-serve with one click.
              </p>

              <div className="py-2 space-y-1.5 text-xs text-[#12172B]">
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>11 AI Tailored Resumes / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>20 Executive HR Email Drafts / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Full AI Resume Polish &amp; Strengthen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                  <span>Smart Job Fit &amp; Match % Indicators</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="text-[11px] text-[#5B6478] text-center">
                ₹199 / mo (Inclusive of all taxes)
              </div>
              <button
                onClick={isLoggedIn ? handleSubscribe : onLoginClick}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
                <span>{isProcessing ? 'Connecting Razorpay...' : isLoggedIn ? 'Subscribe via UPI / Card (₹199)' : 'Sign In to Subscribe'}</span>
              </button>
              <div className="text-[10px] text-[#5B6478] text-center">
                Self-serve cancellation from account • Zero lock-in
              </div>
            </div>
          </div>
        </div>

        {/* ─── Referral Tracking Ledger (How to track referrals) ──────────────── */}
        <div className="mb-4 bg-[#F7F8FA] rounded-xl p-4 border border-[#E4E7EC]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#12172B] flex items-center gap-1.5">
              <Target size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Live Referral Tracking</span>
            </h4>
            <span className="text-[11px] font-semibold text-[#5B6478]">
              {recentReferrals.length} Total Referred
            </span>
          </div>

          {recentReferrals.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recentReferrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between text-[11px] bg-white p-2 rounded border border-[#E4E7EC]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-gray-800">{ref.maskedId}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      Joined {new Date(ref.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    {ref.status === 'qualified' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Check size={10} strokeWidth={ICON_STROKE_WIDTH} /> Qualified
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock size={10} strokeWidth={ICON_STROKE_WIDTH} /> 7-Day Review
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-[#5B6478]">
              No referrals yet. Share your code <strong>{referralCode}</strong> with friends or classmates to track their signups here!
            </div>
          )}
        </div>

        {/* Bottom Fair Usage Note */}
        <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E4E7EC] text-[11px] text-[#5B6478] text-center">
          <strong>Fair Usage Policy</strong>: Both paths share identical feature unlocks with a monthly cap of 11 tailored resumes and 20 HR drafts to keep system infrastructure fast and unthrottled for all candidates.
        </div>
      </div>
    </div>
  );
}
