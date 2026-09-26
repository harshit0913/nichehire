'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, MessageSquare, Sparkles, AlertTriangle, Check, Crown } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

export default function FeedbackModal({ isOpen, onClose, userId: propUserId, userEmail: propUserEmail }: FeedbackModalProps) {
  const [type, setType] = useState<'feature' | 'bug' | 'general'>('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(propUserEmail || '');
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(propUserId);
  const [submitted, setSubmitted] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [bugBountyWon, setBugBountyWon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (propUserEmail) setEmail(propUserEmail);
    if (propUserId) setCurrentUserId(propUserId);

    if (!propUserId) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setCurrentUserId(data.session.user.id);
          if (!propUserEmail && data.session.user.email) {
            setEmail(data.session.user.email);
          }
        }
      });
    }
  }, [propUserId, propUserEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          email,
          userId: currentUserId || null,
          urlContext: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setBugBountyWon(Boolean(data.bugBountyAwarded));
      setSuccessText(data.message || 'Feedback received successfully!');

      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        setEmail(propUserEmail || '');
        setBugBountyWon(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <MessageSquare size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Your Feedback</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Help Us Make NicheHire Better</h2>
          <p className="text-xs text-gray-500">Share your thoughts, feature requests, or report an issue.</p>
        </div>

        {submitted ? (
          <div className={`py-6 px-4 text-center rounded-xl border ${bugBountyWon ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className="mb-2 flex justify-center">
              {bugBountyWon ? (
                <Crown size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-500" />
              ) : (
                <Check size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-600" />
              )}
            </div>
            <p className="text-xs font-bold">{successText}</p>
            {bugBountyWon && (
              <p className="text-[11px] text-amber-700 mt-1">
                Your 7-day full access includes unlimited AI resume tailoring and recruiter cold outreach!
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${type === 'feature' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                <Sparkles size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Feature Idea</span>
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${type === 'bug' ? 'bg-white shadow-xs text-rose-600' : 'text-gray-600'}`}
              >
                <AlertTriangle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-rose-600" />
                <span>Bug Report</span>
              </button>
              <button
                type="button"
                onClick={() => setType('general')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${type === 'general' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                <MessageSquare size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Other</span>
              </button>
            </div>

            {/* Bug Bounty Callout Banner */}
            {type === 'bug' && (
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-fadeIn">
                <Crown size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-amber-950">Bug Bounty Reward:</span> Found an issue? Report it and automatically unlock <strong className="text-amber-950 underline decoration-amber-400">1 Week of Full NicheHire Premium</strong> on your account!
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Your Email (Required for bug bounty reward & replies)
              </label>
              <input
                type="email"
                required={type === 'bug'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                What's on your mind?
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'feature'
                    ? 'e.g. Please add job scraping from Wellfound / AngelList...'
                    : type === 'bug'
                    ? 'e.g. The PDF upload failed on my resume, or button X did not respond...'
                    : 'Tell us how your job search is going...'
                }
                className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] disabled:bg-gray-300 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Sending...</span>
              ) : type === 'bug' ? (
                <>
                  <AlertTriangle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Submit Bug &amp; Claim Premium</span>
                </>
              ) : (
                <>
                  <MessageSquare size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
