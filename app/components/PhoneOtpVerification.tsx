'use client';

import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, ShieldCheck, Clock, RefreshCw, AlertTriangle } from './icons';
import { ICON_STROKE_WIDTH } from '../lib/iconRules';

interface PhoneOtpVerificationProps {
  phone: string;
  onChangePhone: (phone: string) => void;
  isVerified?: boolean;
  onVerified: (verifiedPhone: string) => void;
  label?: string;
  required?: boolean;
}

export default function PhoneOtpVerification({
  phone,
  onChangePhone,
  isVerified = false,
  onVerified,
  label = 'Mobile Number (for SMS & Verification)',
  required = false,
}: PhoneOtpVerificationProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [notice, setNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 10) {
      setNotice({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsSending(true);
    setNotice(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setCountdown(30);
      setNotice({
        type: 'info',
        text: `OTP sent to ${data.phone}. (Test code: ${data.demoOtp})`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Error sending OTP.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setNotice({ type: 'error', text: 'Please enter the complete 6-digit OTP.' });
      return;
    }

    setIsVerifying(true);
    setNotice(null);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code.');
      }

      setOtpSent(false);
      setOtpCode('');
      setNotice({ type: 'success', text: '✓ Mobile number verified successfully!' });
      onVerified(data.phone || phone);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to verify OTP.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[#12172B] flex items-center gap-1.5">
          <Phone size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
          <span>{label} {required && '*'}</span>
        </label>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0E9F6E] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 size={11} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Mobile Verified</span>
          </span>
        )}
      </div>

      {isVerified ? (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
            <span className="text-xs font-bold text-[#12172B] font-mono">{phone}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              // Allow modifying
              onChangePhone('');
              setOtpSent(false);
            }}
            className="text-[10px] font-semibold text-[#2B4EE6] hover:underline"
          >
            Change Number
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => {
                onChangePhone(e.target.value);
                setOtpSent(false);
              }}
              className="flex-1 p-2 text-xs border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSending || countdown > 0 || !phone.trim()}
              className="px-3 py-1.5 bg-[#12172B] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shrink-0 disabled:opacity-50"
            >
              {isSending ? (
                'Sending...'
              ) : countdown > 0 ? (
                `Resend (${countdown}s)`
              ) : otpSent ? (
                'Resend OTP'
              ) : (
                'Verify with OTP'
              )}
            </button>
          </div>

          {/* OTP Code Entry Card */}
          {otpSent && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-[#12172B] block">
                Enter 6-Digit Verification Code:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 583920"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 p-2 text-xs font-mono text-center tracking-widest font-bold border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpCode.length !== 6}
                  className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Submit OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {notice && (
        <div
          className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
            notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-blue-50 text-blue-900 border border-blue-200'
          }`}
        >
          {notice.type === 'error' ? (
            <AlertTriangle size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}
