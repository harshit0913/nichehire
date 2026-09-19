'use client';

import { useState } from 'react';

interface EmailDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  resumeText: string;
}

export default function EmailDraftModal({ isOpen, onClose, job, resumeText }: EmailDraftModalProps) {
  const [hrEmail, setHrEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string; inMailVersion: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'inmail'>('email');

  if (!isOpen || !job) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg('');
    setCopied(false);

    try {
      const res = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobTitle: job.title,
          company: job.company,
          recipientName: recipientName || 'Hiring Manager',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate email');
      setDraft(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate email pitch.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently
    }
  };

  const handleOpenMailClient = () => {
    if (!draft) return;
    const emailTo = hrEmail.trim() || 'hiring@' + (job.company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company') + '.com';
    const safeSubject = encodeURIComponent(draft.subject);
    const safeBody = encodeURIComponent(draft.body);
    window.open(`mailto:${emailTo}?subject=${safeSubject}&body=${safeBody}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative border border-gray-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <span>✉️</span> AI Recruiter Outreach
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Cold Outreach for {job.title}
          </h2>
          <p className="text-xs text-gray-500">
            Targeting {job.company} • Verified position
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              HR / Recruiter Email (Optional)
            </label>
            <input
              type="email"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="e.g. hr@company.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Sarah / Hiring Team"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {!draft && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? 'Generating Personalized Pitch…' : 'Generate High-Converting Pitch'}
          </button>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Generated Draft */}
        {draft && (
          <div className="mt-4 space-y-3">
            <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${activeTab === 'email' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                📧 Full Cold Email
              </button>
              <button
                onClick={() => setActiveTab('inmail')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${activeTab === 'inmail' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                💬 LinkedIn InMail
              </button>
            </div>

            {activeTab === 'email' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-800 space-y-2">
                <div>
                  <span className="font-bold text-gray-500">Subject:</span>{' '}
                  <span className="font-semibold text-gray-900">{draft.subject}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 whitespace-pre-line leading-relaxed font-sans">
                  {draft.body}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-800 whitespace-pre-line leading-relaxed font-sans">
                {draft.inMailVersion}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => copyToClipboard(activeTab === 'email' ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.inMailVersion)}
                className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? '✓ Copied to Clipboard!' : 'Copy to Clipboard'}
              </button>
              {activeTab === 'email' && (
                <button
                  onClick={handleOpenMailClient}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  🚀 Open in Default Email Client
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
