'use client';

import { useState } from 'react';
import {
  HelpCircle,
  Mic,
  Sparkles,
  Target,
  X,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface InterviewPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  resumeText: string;
}

export default function InterviewPrepModal({ isOpen, onClose, job, resumeText }: InterviewPrepModalProps) {
  const [loading, setLoading] = useState(false);
  const [prepData, setPrepData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'reverse'>('technical');

  if (!isOpen || !job) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate interview prep');
      setPrepData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate interview prep.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-100 my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
            <Mic size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> AI Interview Simulator
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Interview Prep Kit: {job.title}
          </h2>
          <p className="text-xs text-gray-500">
            {job.company} • Tailored to your resume &amp; target role requirements
          </p>
        </div>

        {!prepData && (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-600 mb-4 max-w-md mx-auto">
              Get role-specific technical questions, behavioral STAR-framework answers, and high-impact questions to ask the interviewer.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Analyzing Role & Synthesizing Prep Kit…' : 'Generate Interview Prep Kit'}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        {/* Prep Content Tabs */}
        {prepData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold mb-4">
              <button
                onClick={() => setActiveTab('technical')}
                className={`flex-1 py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${activeTab === 'technical' ? 'bg-white shadow-xs text-purple-700' : 'text-gray-600'}`}
              >
                <Sparkles size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Technical Q&amp;A ({prepData.technicalQuestions?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('behavioral')}
                className={`flex-1 py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${activeTab === 'behavioral' ? 'bg-white shadow-xs text-purple-700' : 'text-gray-600'}`}
              >
                <Target size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Behavioral &amp; STAR ({prepData.behavioralQuestions?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('reverse')}
                className={`flex-1 py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${activeTab === 'reverse' ? 'bg-white shadow-xs text-purple-700' : 'text-gray-600'}`}
              >
                <HelpCircle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Questions to Ask ({prepData.reverseInterviewQuestions?.length || 0})</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {activeTab === 'technical' && (
                <div className="space-y-3">
                  {(prepData.technicalQuestions || []).map((t: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="font-bold text-gray-900 mb-2">Q{i + 1}: {t.question}</p>
                      <div className="bg-white p-3 rounded-lg border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-line">
                        <strong className="text-purple-700">Model Answer: </strong>{t.modelAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'behavioral' && (
                <div className="space-y-3">
                  {(prepData.behavioralQuestions || []).map((b: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="font-bold text-gray-900 mb-2">Q{i + 1}: {b.question}</p>
                      <div className="bg-white p-3 rounded-lg border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-line">
                        <strong className="text-indigo-700">STAR Framework Answer: </strong>{b.starAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'reverse' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <p className="font-bold text-gray-900 mb-2">High-Impact Questions to Ask at the End of the Interview:</p>
                  {(prepData.reverseInterviewQuestions || []).map((q: string, i: number) => (
                    <div key={i} className="flex gap-2 p-2.5 bg-white rounded-lg border border-gray-100 text-gray-800">
                      <span className="text-purple-600 font-bold">#{i + 1}</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
