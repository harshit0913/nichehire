'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CareerReport } from '../types/careerGuidance';
import { BadgeCheck, Printer, X, Users } from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface CareerReportViewerProps {
  report: CareerReport;
  onBookHumanCall?: () => void;
  onClose?: () => void;
}

export default function CareerReportViewer({
  report,
  onBookHumanCall,
  onClose,
}: CareerReportViewerProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E7EC]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 mb-1">
            <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-700" />
            <span>Verified AI Career Trajectory</span>
          </div>
          <h2 className="text-lg font-bold text-[#12172B]">Strategic Career Advisory Report</h2>
          <p className="text-xs text-[#5B6478]">
            Generated {new Date(report.generatedAt).toLocaleDateString()} for Sector:{' '}
            <strong className="text-[#12172B] uppercase">{report.intake.targetSector}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded transition-colors flex items-center gap-1.5"
          >
            <Printer size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Print / Save PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#5B6478] hover:text-[#12172B] text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F8FA]"
            >
              <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          )}
        </div>
      </div>

      {/* Structured Content Render */}
      <div className="prose prose-sm max-w-none text-[#12172B] leading-relaxed bg-[#F7F8FA] p-6 rounded-xl border border-[#E4E7EC] overflow-y-auto max-h-[60vh]">
        <ReactMarkdown>{report.reportContent}</ReactMarkdown>
      </div>

      {/* Human Call Upsell Banner */}
      {!report.humanFollowUpBooked && onBookHumanCall && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-[#12172B] flex items-center gap-1.5 justify-center sm:justify-start">
              <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Want to Review this with a Human Career Counselor?</span>
            </h4>
            <p className="text-[11px] text-[#5B6478]">
              Book a live 1-on-1 strategy call. Your counselor reviews this exact AI report and your resume before the session.
            </p>
          </div>
          <button
            onClick={onBookHumanCall}
            className="px-4 py-2 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg transition-colors whitespace-nowrap shadow-sm shrink-0"
          >
            Book Strategy Call — ₹499
          </button>
        </div>
      )}
    </div>
  );
}
