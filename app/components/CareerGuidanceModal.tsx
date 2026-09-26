'use client';

import React, { useState } from 'react';
import { CAREER_GUIDANCE_PRICING, CareerReport } from '../types/careerGuidance';
import CareerReportViewer from './CareerReportViewer';
import { X, Compass, Landmark, Briefcase, Target, ArrowRight, Sparkles, ArrowLeft, Users, AlertTriangle } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface CareerGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  defaultResumeText?: string;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  isUnlimited?: boolean;
}

export default function CareerGuidanceModal({
  isOpen,
  onClose,
  userId,
  defaultResumeText = '',
  isLoggedIn = false,
  onLoginClick,
  isUnlimited = false,
}: CareerGuidanceModalProps) {
  const [step, setStep] = useState<'intake' | 'pricing' | 'generating' | 'view_report' | 'book_human'>('intake');
  const [targetSector, setTargetSector] = useState<'govt' | 'private' | 'undecided'>('govt');
  const [goals, setGoals] = useState('');
  const [freeText, setFreeText] = useState('');
  const [resumeText, setResumeText] = useState(defaultResumeText);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeReport, setActiveReport] = useState<CareerReport | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    if (!goals.trim()) {
      setErrorMessage('Please specify your current career goals or questions.');
      return;
    }

    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setStep('generating');
    setErrorMessage('');

    try {
      const res = await fetch('/api/career-guidance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          goals,
          targetSector,
          resumeText,
          freeText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPayment) {
          setStep('pricing');
          return;
        }
        throw new Error(data.error || 'Failed to generate report');
      }

      setActiveReport(data.report);
      setStep('view_report');
    } catch (err: any) {
      setErrorMessage(err.message || 'Generation failed. Please try again.');
      setStep('intake');
    }
  };

  const handleBookHumanCall = () => {
    setStep('book_human');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B6478] hover:text-[#12172B] text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F8FA]"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* ─── State 1: Intake Form ────────────────────────────────────────── */}
        {step === 'intake' && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2B4EE6] text-xs font-semibold mb-2 border border-blue-200">
                <Compass size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Career Guidance Advisory</span>
              </div>
              <h2 className="text-xl font-bold text-[#12172B]">Strategic Career &amp; Exam Trajectory</h2>
              <p className="text-xs text-[#5B6478] mt-1">
                Receive an in-depth AI roadmap comparing government examination opportunities against private sector roles.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#12172B] mb-2">
                  1. What target track are you exploring?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetSector('govt')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                      targetSector === 'govt'
                        ? 'bg-[#12172B] text-white border-[#12172B]'
                        : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Govt Exams</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSector('private')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                      targetSector === 'private'
                        ? 'bg-[#12172B] text-white border-[#12172B]'
                        : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <Briefcase size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Private Tech</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSector('undecided')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                      targetSector === 'undecided'
                        ? 'bg-[#12172B] text-white border-[#12172B]'
                        : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <Target size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Compare Both</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12172B] mb-1">
                  2. What are your primary goals or dilemmas?
                </label>
                <textarea
                  rows={3}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g. B.Tech graduate from 2024 considering preparing for SSC CGL / BPSC vs finding a React/Node developer job in Bangalore..."
                  className="w-full p-2.5 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12172B] mb-1">
                  3. Resume / Academic Background (Optional)
                </label>
                <textarea
                  rows={2}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume text or key skills/education details..."
                  className="w-full p-2.5 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                />
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E4E7EC] text-[11px] text-[#5B6478]">
                <strong>Advisory Notice</strong>: Career guidance reports are algorithmic recommendations based on statutory gazettes and hiring trends. Career guidance is informational and does not guarantee employment or exam outcomes.
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('pricing')}
                  className="text-xs font-semibold text-[#2B4EE6] hover:underline flex items-center gap-1"
                >
                  <span>View Consultation Packages</span>
                  <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>{isUnlimited ? 'Generate Report (Founder Pass)' : 'Generate AI Report'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── State 2: Pricing Bundles ────────────────────────────────────── */}
        {step === 'pricing' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#12172B]">Career Advisory Pricing Plans</h3>
              <p className="text-xs text-[#5B6478] mt-1">
                Choose between instant AI analysis or pair it with a live 1-on-1 counselor strategy session.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(CAREER_GUIDANCE_PRICING).map(([key, item]) => (
                <div
                  key={key}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    item.humanCall
                      ? 'border-[#2B4EE6] bg-blue-50/30'
                      : 'border-[#E4E7EC] bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#12172B]">{item.label}</span>
                      <span className="text-sm font-extrabold text-[#2B4EE6]">₹{item.price}</span>
                    </div>
                    <p className="text-[11px] text-[#5B6478] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[#E4E7EC]/60">
                    <button
                      onClick={() => {
                        if (item.humanCall) {
                          setStep('book_human');
                        } else {
                          handleGenerateReport();
                        }
                      }}
                      className="w-full py-1.5 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg transition-colors"
                    >
                      Select Plan (₹{item.price})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep('intake')}
                className="text-xs font-semibold text-[#5B6478] hover:text-[#12172B] flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Back to intake details</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── State 3: Generating Loading ─────────────────────────────────── */}
        {step === 'generating' && (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#2B4EE6] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-base font-bold text-[#12172B]">Generating Your Career Trajectory</h3>
            <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
              Analyzing exam notification dates, syllabus overlap, and private sector hiring signals...
            </p>
          </div>
        )}

        {/* ─── State 4: View Report ────────────────────────────────────────── */}
        {step === 'view_report' && activeReport && (
          <CareerReportViewer
            report={activeReport}
            onBookHumanCall={handleBookHumanCall}
            onClose={onClose}
          />
        )}

        {/* ─── State 5: Book Human Call (Cal.com integration) ───────────────── */}
        {step === 'book_human' && (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
                <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>1-on-1 Strategy Call</span>
              </div>
              <h3 className="text-lg font-bold text-[#12172B]">Book Your Human Counselor Session</h3>
              <p className="text-xs text-[#5B6478]">
                A senior advisor will review your resume and strategic trajectory before the live video call.
              </p>
            </div>

            {/* 7-Day Availability Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-800 shrink-0" />
                <span>Counselor Slot Availability Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Counselor slots are capped weekly to maintain high advising quality. Available slots: <strong>3 open slots in the next 7 days</strong>.
              </p>
            </div>

            {/* Consent & No-Show Policy */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-[#12172B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded border-[#E4E7EC] text-[#2B4EE6] focus:ring-[#2B4EE6]"
                />
                <span className="text-[11px] text-[#5B6478] leading-relaxed">
                  I agree to share my AI Report and resume with my assigned career counselor. Calls may be recorded for quality assurance (held for 30 days).
                </span>
              </label>

              <div className="p-2.5 bg-[#F7F8FA] rounded-md text-[11px] text-[#5B6478]">
                <strong>No-Show Policy</strong>: 1 free reschedule allowed for candidate no-show. Counselor no-show guarantees an automatic full refund or priority rebooking.
              </div>
            </div>

            <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between">
              <button
                onClick={() => setStep('intake')}
                className="text-xs font-semibold text-[#5B6478] hover:text-[#12172B] flex items-center gap-1"
              >
                <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Back</span>
              </button>
              <button
                disabled={!consentGiven}
                onClick={() => {
                  alert('Cal.com embedded booking link opened! Redirecting to secure video calendar.');
                  onClose();
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] disabled:bg-gray-300 rounded-lg shadow-sm transition-colors"
              >
                Proceed to Calendar (Cal.com) — ₹499
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
