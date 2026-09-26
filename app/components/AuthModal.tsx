'use client';

import { useState } from 'react';
import { supabase } from '../supabase';
import { X, Lock, ArrowRight } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSuccessMsg('Check your email for the magic sign-in link!');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          // Register referral if user arrived with a referral link
          try {
            const storedRef = localStorage.getItem('nichehire_referral_code');
            if (storedRef) {
              await fetch('/api/referrals/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  newUserId: data.user.id,
                  referralCode: storedRef,
                }),
              });
            }
          } catch (refErr) {
            console.warn('Could not register referral:', refErr);
          }

          setSuccessMsg('Account created successfully! You are now signed in.');
          onSuccess(data.user);
          setTimeout(() => onClose(), 1200);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setSuccessMsg('Welcome back! Signed in successfully.');
          onSuccess(data.user);
          setTimeout(() => onClose(), 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Lock size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'signup' ? 'Create your Account' : mode === 'magic' ? 'Sign in with Magic Link' : 'Welcome to NicheHire'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'signup'
              ? 'Join to save your tailored resumes & track applications'
              : 'Sign in to access your saved jobs & AI-tailored CVs'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'signin' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'signup' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setMode('magic'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'magic' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Magic Link
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode !== 'magic' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('magic')}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading
              ? 'Processing...'
              : mode === 'signup'
              ? 'Create Free Account'
              : mode === 'magic'
              ? 'Send Magic Sign-In Link'
              : 'Sign In to NicheHire'}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-5">
          By continuing, you agree to NicheHire's Terms of Service & Privacy Policy.
        </p>

        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Hiring talent?{' '}
            <a
              href="/employer/dashboard"
              className="text-[#2B4EE6] font-semibold hover:underline inline-flex items-center gap-1"
              onClick={onClose}
            >
              <span>Go to Employer Portal &amp; Login</span>
              <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
