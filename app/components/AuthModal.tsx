'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  X,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  // Main tabs: 'otp' (recommended, modern, dual mobile/email) vs 'password' (traditional)
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');

  // OTP specific state
  const [identifier, setIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [assignedReferralCode, setAssignedReferralCode] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);

  // Password specific state
  const [passwordMode, setPasswordMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Common messaging
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Referral code from URL/localStorage
  const [referralCodeUsed, setReferralCodeUsed] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nichehire_referral_code');
      if (stored) {
        setReferralCodeUsed(stored.trim().toUpperCase());
      }
    } catch {
      // Ignore
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  // ─── 1. OTP Authentication Flow (Mobile Phone or Email Address) ────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your 10-digit mobile number or email address.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }

      setOtpSent(true);
      setOtpCountdown(10);
      if (data.otpCode) {
        setDispatchedOtp(data.otpCode);
        setOtpCode(data.otpCode);
      }
      setSuccessMsg(data.message || `Unique 6-digit OTP code sent. Valid for 5 minutes.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit numeric OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: cleanOtp,
          role: 'Member',
          referralCodeUsed: referralCodeUsed || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect OTP code.');
      }

      // Persist authenticated session
      const authUser = data.user || {
        id: data.userId,
        email: data.type === 'email' ? data.identifier : undefined,
        phone: data.type === 'phone' ? data.identifier : undefined,
        referralCode: data.referralCode,
      };

      try {
        localStorage.setItem(
          'nichehire_auth_session',
          JSON.stringify({
            user: authUser,
            sessionToken: data.sessionToken,
            referralCode: data.referralCode,
          })
        );
      } catch (storageErr) {
        console.warn('Could not persist auth session locally:', storageErr);
      }

      setAssignedReferralCode(data.referralCode);
      setSuccessMsg(
        `✓ Verified! Your unique referral code is: ${data.referralCode}. Welcome to NicheHire!`
      );

      onSuccess(authUser);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── 2. Password Flow (Supabase Auth fallback) ────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (passwordMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          if (error.message?.toLowerCase().includes('rate limit')) {
            throw new Error(
              'Supabase email confirmation service is busy. Please use the "Mobile / Email OTP" option above for instant verification!'
            );
          }
          throw error;
        }

        if (data.user) {
          // Immediately generate & link unique referral code in user_profiles
          try {
            const profileRes = await fetch('/api/auth/register-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                role: 'Member',
                referralCodeUsed: referralCodeUsed || undefined,
              }),
            });
            const profileData = await profileRes.json();
            if (profileData.referralCode) {
              setAssignedReferralCode(profileData.referralCode);
            }
          } catch (refErr) {
            console.warn('Could not initialize referral profile:', refErr);
          }

          setSuccessMsg(
            `Account created successfully! ${assignedReferralCode ? `Your referral code is ${assignedReferralCode}.` : 'You are now signed in.'}`
          );
          onSuccess(data.user);
          setTimeout(() => onClose(), 1200);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        if (data.user) {
          // Ensure user has referral profile
          try {
            await fetch('/api/auth/register-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                role: 'Member',
              }),
            });
          } catch {}

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

  const isEmailInput = identifier.includes('@');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 relative border border-gray-100 my-8 animate-in fade-in duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-[#2B4EE6] mb-3 border border-blue-100 shadow-2xs">
            <Lock size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {authMethod === 'otp' ? 'Instant Sign In / Register' : passwordMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {authMethod === 'otp'
              ? 'Enter your mobile number or email to receive a secure, unique 6-digit OTP code.'
              : 'Sign in to access your saved jobs, tailored CVs, and referral rewards.'}
          </p>
        </div>

        {/* Referral Badge Notification if present */}
        {referralCodeUsed && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <Sparkles size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-600 shrink-0" />
            <div className="leading-tight">
              <span className="font-bold">Referral Partner Applied: </span>
              <span className="font-mono font-bold text-amber-950">{referralCodeUsed}</span>
              <span className="block text-[11px] text-amber-800">
                You will receive a unique referral code and free platform pass upon registration.
              </span>
            </div>
          </div>
        )}

        {/* Primary Method Toggle: OTP (Dual Mobile/Email) vs Password */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-semibold mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('otp');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'otp'
                ? 'bg-white shadow-xs text-[#2B4EE6] font-bold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldCheck size={13} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Mobile / Email OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('password');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'password'
                ? 'bg-white shadow-xs text-gray-900 font-bold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock size={13} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Password</span>
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
            <CheckCircle2 size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── METHOD 1: SECURE OTP FLOW (Email or Mobile Phone) ── */}
        {authMethod === 'otp' && (
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    {isEmailInput ? (
                      <Mail size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                    ) : (
                      <Phone size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                    )}
                    <span>Mobile Number or Email Address: *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210 or candidate@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Enter either your 10-digit mobile number or your email. We will generate a unique 6-digit OTP code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp || !identifier.trim()}
                  className="w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                >
                  {isSendingOtp ? (
                    'Generating Secure OTP...'
                  ) : (
                    <>
                      <span>Send 6-Digit Verification OTP</span>
                      <ArrowRight size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 animate-in fade-in duration-150">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#2B4EE6] block">Code sent to:</span>
                    <span className="font-bold text-gray-900 font-mono text-xs">{identifier}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setErrorMsg('');
                    }}
                    className="text-[11px] text-[#2B4EE6] hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>

                {dispatchedOtp && (
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-900 font-bold flex items-center gap-1">
                        <ShieldCheck size={14} className="text-blue-600" />
                        <span>Verification OTP Code:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(dispatchedOtp)}
                        className="px-2 py-0.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-[10px] font-bold rounded-md"
                      >
                        Auto-Fill
                      </button>
                    </div>
                    <div className="font-mono text-base font-black text-[#2B4EE6] tracking-widest text-center py-1 bg-white rounded-lg border border-blue-100">
                      {dispatchedOtp}
                    </div>
                    <div className="text-[10px] text-blue-700 text-center">
                      Auto-filled into the field below. Click "Verify &amp; Continue" to authenticate.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 text-center">
                    Enter 6-Digit OTP Code:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-2.5 px-4 text-center font-mono text-lg font-bold tracking-widest border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B4EE6] bg-white shadow-2xs"
                  />
                  <p className="text-[11px] text-gray-500 text-center mt-1">
                    Strict verification active: only the exact matching 6-digit OTP code is accepted.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500 text-[11px]">Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isSendingOtp || otpCountdown > 0}
                    className="text-[#2B4EE6] font-semibold hover:underline text-xs disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isVerifyingOtp ? 'Verifying OTP...' : 'Verify OTP & Complete Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── METHOD 2: PASSWORD FLOW ── */}
        {authMethod === 'password' && (
          <div className="space-y-4">
            <div className="flex bg-gray-50 p-1 rounded-xl text-xs font-medium border border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setPasswordMode('signin');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  passwordMode === 'signin' ? 'bg-white shadow-xs font-bold text-gray-900' : 'text-gray-500'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordMode('signup');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  passwordMode === 'signup' ? 'bg-white shadow-xs font-bold text-gray-900' : 'text-gray-500'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address: *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password: *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs"
              >
                {loading
                  ? 'Processing...'
                  : passwordMode === 'signup'
                  ? 'Create Free Account & Get Referral Code'
                  : 'Sign In to NicheHire'}
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-[10px] text-gray-400 mt-5">
          By continuing, you agree to NicheHire&apos;s Terms of Service &amp; Privacy Policy. Every registered candidate receives a unique referral code.
        </p>

        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Hiring talent?{' '}
            <a
              href="/employer/dashboard"
              className="text-[#2B4EE6] font-semibold hover:underline inline-flex items-center gap-1"
              onClick={onClose}
            >
              <span>Employer Portal &amp; Post Openings</span>
              <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
