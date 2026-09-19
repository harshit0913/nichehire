'use client';

import { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<'feature' | 'bug' | 'general'>('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setEmail('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <span>💬</span> Your Feedback
          </div>
          <h2 className="text-lg font-bold text-gray-900">Help Us Make NicheHire Better</h2>
          <p className="text-xs text-gray-500">Share your thoughts, feature requests, or report an issue.</p>
        </div>

        {submitted ? (
          <div className="py-8 text-center text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-200">
            ✓ Thank you! Your feedback has been received.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${type === 'feature' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                💡 Feature Idea
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${type === 'bug' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                🐞 Bug Report
              </button>
              <button
                type="button"
                onClick={() => setType('general')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${type === 'general' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600'}`}
              >
                💭 Other
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Your Email (Optional, if you want a reply)
              </label>
              <input
                type="email"
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
                    ? 'e.g. The PDF upload failed on my resume...'
                    : 'Tell us how your job search is going...'
                }
                className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
