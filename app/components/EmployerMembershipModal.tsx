'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  Sparkles,
  CreditCard,
  Clock,
  Briefcase,
  Copy,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';
import {
  EMPLOYER_MEMBERSHIP_PLANS,
  EmployerMembershipPlan,
  EmployerActiveMembership,
} from '../types/employerMembership';

interface EmployerMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employerEmail: string;
  companyName?: string;
  onPlanActivated: (membership: EmployerActiveMembership) => void;
}

export default function EmployerMembershipModal({
  isOpen,
  onClose,
  employerEmail,
  companyName = 'Company',
  onPlanActivated,
}: EmployerMembershipModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<EmployerMembershipPlan>(
    EMPLOYER_MEMBERSHIP_PLANS[1] // Default to Growth Plan (₹299)
  );
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const founderUpiId = process.env.NEXT_PUBLIC_FOUNDER_UPI_ID || 'harshit0913@slc';

  if (!isOpen) return null;

  const handleSelectPlan = (plan: EmployerMembershipPlan) => {
    setSelectedPlan(plan);
    setNotice(null);

    // If Free Starter is selected
    if (plan.price === 0) {
      const freeClaimedKey = `nichehire_free_claimed_${employerEmail || 'guest'}`;
      const alreadyClaimed = localStorage.getItem(freeClaimedKey);

      if (alreadyClaimed) {
        setNotice({
          type: 'error',
          message: 'The Free 10-Day Starter plan has already been claimed for this account. Please select a paid plan to continue.',
        });
        return;
      }

      // Activate Free Plan
      const newMembership: EmployerActiveMembership = {
        planId: 'free',
        planName: plan.name,
        price: 0,
        totalJobs: 1,
        usedJobs: 0,
        durationDays: 10,
        activatedAt: Date.now(),
        expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000,
        status: 'active',
      };

      localStorage.setItem(freeClaimedKey, 'true');
      localStorage.setItem(
        `nichehire_employer_membership_${employerEmail || 'guest'}`,
        JSON.stringify(newMembership)
      );

      onPlanActivated(newMembership);
      onClose();
      return;
    }

    // For paid plans, proceed to payment step
    setStep('payment');
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(founderUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', message: 'Screenshot file size exceeds 5MB limit.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setScreenshotData(b64);
      setScreenshotPreview(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async () => {
    const cleanUtr = utrNumber.trim().toUpperCase().replace(/\s+/g, '');
    const utrRegex = /^[0-9A-Z]{12}$/;

    if (!cleanUtr || !utrRegex.test(cleanUtr)) {
      setNotice({
        type: 'error',
        message: 'Please enter a valid 12-digit UPI Transaction Reference (UTR / UPI Ref No) from your UPI payment receipt.',
      });
      return;
    }

    setIsProcessing(true);
    setNotice(null);

    try {
      const emailToUse = employerEmail || localStorage.getItem('nichehire_employer_email') || 'employer@nichehire.in';

      const res = await fetch('/api/employer/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName || 'Corporate Recruiter',
          contactEmail: emailToUse,
          contactPhone: '',
          planAmount: selectedPlan.price,
          planName: selectedPlan.name,
          utrNumber: cleanUtr,
          screenshotData: screenshotData || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotice({
          type: 'error',
          message: data.error || 'Failed to submit payment proof.',
        });
        setIsProcessing(false);
        return;
      }

      const isFounder = ['harshitmishra7073@gmail.com', 'harshit0913@gmail.com', 'founder@nichehire.in', 'founder@nichehire.tech', 'harshit@nichehire.tech'].includes(
        emailToUse.toLowerCase().trim()
      );

      const newMembership: EmployerActiveMembership = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        totalJobs: selectedPlan.jobCount,
        usedJobs: 0,
        durationDays: selectedPlan.durationDays,
        activatedAt: Date.now(),
        expiresAt: Date.now() + selectedPlan.durationDays * 24 * 60 * 60 * 1000,
        status: isFounder ? 'active' : 'pending',
        utrNumber: cleanUtr,
        paymentId: data.paymentId,
      };

      localStorage.setItem(
        `nichehire_employer_membership_${emailToUse}`,
        JSON.stringify(newMembership)
      );

      // Record in local submission log
      const existingPayments = JSON.parse(
        localStorage.getItem('nichehire_payment_submissions') || '[]'
      );
      existingPayments.unshift({
        id: data.paymentId || `pay-${Date.now()}`,
        company_name: companyName,
        plan_amount: selectedPlan.price,
        plan_name: selectedPlan.name,
        utr_number: cleanUtr,
        status: isFounder ? 'approved' : 'pending',
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('nichehire_payment_submissions', JSON.stringify(existingPayments));

      onPlanActivated(newMembership);

      setNotice({
        type: 'success',
        message: isFounder
          ? `✓ Founder test account: ${selectedPlan.name} activated!`
          : `✓ Payment proof submitted for UTR ${cleanUtr}! Status: PENDING Admin Verification. The founder verifies bank statements within 1–2 hours. Your job slots will unlock automatically once approved.`,
      });

      setTimeout(() => {
        onClose();
      }, 2400);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to submit payment proof. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `upi://pay?pa=${founderUpiId}&pn=NicheHire&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(
      `NicheHire ${selectedPlan.name} - ${companyName}`
    )}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2B4EE6] text-xs font-bold">
            <Briefcase size={13} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Employer Recruiter Memberships</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#12172B] tracking-tight">
            {step === 'select' ? 'Select an Employer Plan to Post Jobs' : `Activate ${selectedPlan.name}`}
          </h2>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            {step === 'select'
              ? 'Every job opening requires an active membership. Enjoy verified candidate applications, direct CV inspection, and ATS screening.'
              : `Complete direct bank UPI transfer of ₹${selectedPlan.price} with zero platform surcharge.`}
          </p>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-5 ${
              notice.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <AlertTriangle size={14} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0" />
            <span className="font-medium">{notice.message}</span>
          </div>
        )}

        {/* ── STEP 1: PLAN SELECTION ── */}
        {step === 'select' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {EMPLOYER_MEMBERSHIP_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                    plan.recommended
                      ? 'border-[#2B4EE6] ring-2 ring-[#2B4EE6]/20 bg-blue-50/20'
                      : 'border-[#E4E7EC] hover:border-gray-300 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        plan.recommended
                          ? 'bg-[#2B4EE6] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-3 pt-1">
                    <div>
                      <h3 className="text-sm font-bold text-[#12172B]">{plan.name}</h3>
                      <p className="text-[11px] text-[#5B6478] mt-0.5 leading-snug">{plan.description}</p>
                    </div>

                    <div className="pb-3 border-b border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#12172B]">
                          {plan.price === 0 ? '₹0' : `₹${plan.price}`}
                        </span>
                        <span className="text-[10px] text-[#5B6478] font-medium">
                          / {plan.jobCount} {plan.jobCount === 1 ? 'job' : 'jobs'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#0E9F6E] mt-1">
                        <Clock size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        <span>Valid for {plan.durationDays} days</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-[11px] text-[#333F51]">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-tight">
                          <Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        plan.price === 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : plan.recommended
                          ? 'bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white shadow-xs'
                          : 'bg-[#12172B] hover:bg-black text-white'
                      }`}
                    >
                      {plan.price === 0 ? (
                        <>
                          <Zap size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Claim Free (10 Days)</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Choose Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 2: DIRECT UPI QR PAYMENT & UTR SUBMISSION ── */}
        {step === 'payment' && (
          <div className="space-y-6">
            <div className="bg-[#F7F8FA] p-4 rounded-2xl border border-[#E4E7EC] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5B6478] tracking-wider">
                  Selected Plan
                </span>
                <h4 className="text-sm font-bold text-[#12172B]">
                  {selectedPlan.name} • {selectedPlan.jobCount} Jobs ({selectedPlan.durationDays} Days Access)
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-[#2B4EE6]">₹{selectedPlan.price}</span>
                <button
                  onClick={() => setStep('select')}
                  className="block text-[10px] text-[#2B4EE6] font-semibold hover:underline"
                >
                  Change Plan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* QR Code */}
              <div className="p-5 bg-white rounded-2xl border border-[#E4E7EC] text-center space-y-3">
                <span className="text-xs font-bold text-[#12172B] block">Scan UPI QR to Pay</span>
                <div className="inline-block p-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={upiQrUrl} alt="UPI QR" className="w-44 h-44 mx-auto object-contain" />
                </div>
                <div className="text-xs text-[#5B6478] space-y-1">
                  <p>Scan with Google Pay, PhonePe, Paytm, or BHIM</p>
                  <div className="flex items-center justify-center gap-1 font-mono font-bold text-gray-800 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <span>{founderUpiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="text-[#2B4EE6] hover:text-[#1E3BBD] p-1"
                      title="Copy UPI ID"
                    >
                      <Copy size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                  {copiedUpi && <span className="text-[10px] font-bold text-[#0E9F6E]">✓ Copied UPI ID!</span>}
                </div>
              </div>

              {/* UTR Reference Input & Activation */}
              <div className="p-5 bg-white rounded-2xl border border-[#E4E7EC] space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                    Confirm Transaction (UTR)
                  </h4>
                  <p className="text-[11px] text-[#5B6478] mt-0.5">
                    Enter the 12-digit UPI Reference Number / Transaction ID shown in your payment app.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#12172B]">12-Digit UTR Number *</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="e.g. 427819284729"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                    className="w-full p-2.5 text-xs font-mono border border-[#E4E7EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2B4EE6] tracking-wider font-bold"
                  />
                  <span className="text-[10px] text-[#5B6478]">
                    Must be exactly 12 alphanumeric characters found under &quot;UPI Ref No.&quot; or &quot;UTR&quot; in Google Pay / PhonePe.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#12172B]">Payment Screenshot (Optional Proof)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-[#2B4EE6] hover:file:bg-blue-100 cursor-pointer"
                  />
                  {screenshotPreview && (
                    <div className="mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotPreview} alt="Screenshot preview" className="h-16 rounded-lg border border-gray-200 object-cover" />
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-[11px] flex items-start gap-2">
                  <ShieldCheck size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0 mt-0.5" />
                  <p>
                    <strong>Founder Verification:</strong> All UPI payments are cross-verified by Harshit Mishra (Founder) against bank statements within 1–2 hours to prevent fraudulent postings. Your {selectedPlan.jobCount} job posting slots will unlock automatically upon verification.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep('select')}
                    className="text-xs font-semibold text-[#5B6478] hover:text-[#12172B]"
                  >
                    Back to Plans
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                    className="px-5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{isProcessing ? 'Verifying...' : `Submit Payment for ${selectedPlan.name}`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
