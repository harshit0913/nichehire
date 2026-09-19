'use client';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does the ATS Match Score work?',
      a: 'When you upload your resume, NicheHire analyzes your skills, job titles, and experience level. It compares them in real time against the exact keywords, required technologies, and seniority level in each job posting.'
    },
    {
      q: 'How do I get a 90%+ Match Score?',
      a: 'Click "✦ Tailor Resume with AI" on any job card. Gemini rewrites your bullet points to emphasize relevant achievements and mirror the keywords the employer’s ATS scanner searches for, while keeping your experience 100% truthful.'
    },
    {
      q: 'What platforms does NicheHire scrape?',
      a: 'NicheHire aggregates live verified jobs from Adzuna (on-site & local worldwide), LinkedIn public postings, Himalayas (high-growth startups), Remotive, Arbeitnow, and RemoteOK.'
    },
    {
      q: 'Can I export my tailored resume as a PDF?',
      a: 'Yes! Inside the tailored resume drawer, click "Download ATS PDF" to get a clean, standard 1-page Harvard/Tech formatted resume ready to submit.'
    },
    {
      q: 'Is my resume private and secure?',
      a: 'Yes. Your uploaded resume is processed securely in session memory and is never sold, shared, or indexed by search engines.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <span>💡</span> Help & User Guide
          </div>
          <h2 className="text-lg font-bold text-gray-900">How to Win with NicheHire</h2>
          <p className="text-xs text-gray-500">Tips, tricks, and answers to get hired 3x faster</p>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
          {faqs.map((f, i) => (
            <div key={i} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-1">{f.q}</h4>
              <p className="text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
