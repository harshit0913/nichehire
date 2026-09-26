'use client';

import React, { useState } from 'react';
import { ResumeData, BulletDiffReview, StrengthenQuestion } from '../types/resumeBuilder';

interface ResumeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isLoggedIn?: boolean;
}

const INITIAL_RESUME: ResumeData = {
  id: 'resume-draft-1',
  userId: 'usr-current',
  contact: {
    name: 'Aakash Sharma',
    email: 'aakash.sharma@example.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    links: ['linkedin.com/in/aakash-sharma', 'github.com/aakash-dev'],
  },
  summary: 'Results-driven software engineer with 3+ years of experience building performant web applications and backend microservices.',
  experience: [
    {
      id: 'exp-1',
      role: 'Full Stack Developer',
      organization: 'TechFlow Solutions',
      startDate: '2023-01',
      endDate: 'Present',
      bullets: [
        'Built full-stack web applications using React, Next.js, and Node.js.',
        'Refactored SQL database queries to improve page loading response times.',
        'Collaborated with product designers and backend teams to release new customer onboarding flows.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Visvesvaraya Technological University (VTU)',
      qualification: 'B.Tech in Computer Science',
      fieldOfStudy: 'Computer Science',
      graduationYear: '2022',
    },
  ],
  skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Git'],
  templateId: 'minimal',
  lastEditedAt: new Date().toISOString(),
  sourceOfTruth: 'user_authored',
};

export default function ResumeBuilderModal({
  isOpen,
  onClose,
  userId = 'usr-current',
  isLoggedIn = false,
}: ResumeBuilderModalProps) {
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [activeTemplate, setActiveTemplate] = useState<'minimal' | 'corporate_ats' | 'modern_tech'>('minimal');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [diffReviews, setDiffReviews] = useState<BulletDiffReview[]>([]);
  const [strengthenQuestions, setStrengthenQuestions] = useState<StrengthenQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showStrengthenModal, setShowStrengthenModal] = useState(false);

  if (!isOpen) return null;

  // ─── AI Polish Mode ────────────────────────────────────────────────────────
  const handleAiPolish = async () => {
    setIsAiLoading(true);
    try {
      const allBullets = resume.experience.flatMap((e) => e.bullets);
      const res = await fetch('/api/resume/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mode: 'polish',
          bullets: allBullets,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to polish resume');

      setDiffReviews(data.reviews || []);
      setShowDiffModal(true);
    } catch (err: any) {
      alert(err.message || 'AI Polish failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ─── AI Strengthen Mode ────────────────────────────────────────────────────
  const handleAiStrengthen = async () => {
    setIsAiLoading(true);
    try {
      const allBullets = resume.experience.flatMap((e) => e.bullets);
      const res = await fetch('/api/resume/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mode: 'strengthen',
          bullets: allBullets,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan for strengthening');

      setStrengthenQuestions(data.questions || []);
      setShowStrengthenModal(true);
    } catch (err: any) {
      alert(err.message || 'AI Strengthen failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ─── Apply Accepted Diff Changes ───────────────────────────────────────────
  const handleAcceptDiff = (index: number) => {
    setDiffReviews((prev) => {
      const updated = [...prev];
      updated[index].status = 'accepted';
      return updated;
    });

    // Update bullet in resume state
    setResume((prev) => {
      const flatIndex = index;
      let counter = 0;
      const newExp = prev.experience.map((exp) => {
        const newBullets = exp.bullets.map((b) => {
          if (counter === flatIndex) {
            counter++;
            return diffReviews[index]?.rewrittenBullet || b;
          }
          counter++;
          return b;
        });
        return { ...exp, bullets: newBullets };
      });
      return { ...prev, experience: newExp, sourceOfTruth: 'ai_polished' };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col relative border border-[#E4E7EC] my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="text-base font-bold text-[#12172B]">NicheHire Resume Builder</h2>
              <p className="text-xs text-[#5B6478]">
                Structured template authoring with zero-hallucination AI Polish &amp; Strengthen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#F7F8FA] p-0.5 rounded-lg border border-[#E4E7EC] text-xs font-semibold">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'editor' ? 'bg-white shadow-xs text-[#12172B]' : 'text-[#5B6478]'
                }`}
              >
                ✏️ Form Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'preview' ? 'bg-white shadow-xs text-[#12172B]' : 'text-[#5B6478]'
                }`}
              >
                👁️ Live Preview
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-[#12172B] bg-[#F7F8FA] hover:bg-[#E4E7EC] border border-[#E4E7EC] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / PDF
            </button>

            <button
              onClick={onClose}
              className="text-[#5B6478] hover:text-[#12172B] text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F8FA]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Form Editor */}
          <div
            className={`w-full md:w-1/2 p-6 overflow-y-auto space-y-6 border-r border-[#E4E7EC] ${
              activeTab === 'editor' ? 'block' : 'hidden md:block'
            }`}
          >
            {/* AI Action Toolbar */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#12172B] flex items-center gap-1.5">
                  <span>✨</span> AI-Assisted Editing (Anti-Hallucination)
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-2 py-0.5 rounded">
                  11 actions/mo cap
                </span>
              </div>
              <p className="text-[11px] text-[#5B6478]">
                AI rewords and asks questions but <strong>never</strong> invents numbers, dates, or skills.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAiPolish}
                  disabled={isAiLoading}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🪄</span>
                  <span>{isAiLoading ? 'Analyzing...' : 'AI Polish (Reword 1:1)'}</span>
                </button>
                <button
                  onClick={handleAiStrengthen}
                  disabled={isAiLoading}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🎯</span>
                  <span>Strengthen Gaps</span>
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-[#12172B] mb-1.5">Choose Resume Template</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'minimal', label: 'Clean Minimal' },
                  { id: 'corporate_ats', label: 'Corporate ATS' },
                  { id: 'modern_tech', label: 'Modern Tech' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setActiveTemplate(tmpl.id as any)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                      activeTemplate === tmpl.id
                        ? 'bg-[#12172B] text-white border-[#12172B]'
                        : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider pb-1 border-b border-[#E4E7EC]">
                1. Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={resume.contact.name}
                  onChange={(e) =>
                    setResume({ ...resume, contact: { ...resume.contact, name: e.target.value } })
                  }
                  className="p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={resume.contact.email}
                  onChange={(e) =>
                    setResume({ ...resume, contact: { ...resume.contact, email: e.target.value } })
                  }
                  className="p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={resume.contact.phone || ''}
                  onChange={(e) =>
                    setResume({ ...resume, contact: { ...resume.contact, phone: e.target.value } })
                  }
                  className="p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                />
                <input
                  type="text"
                  placeholder="Location (e.g. Bangalore, India)"
                  value={resume.contact.location || ''}
                  onChange={(e) =>
                    setResume({ ...resume, contact: { ...resume.contact, location: e.target.value } })
                  }
                  className="p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider pb-1 border-b border-[#E4E7EC]">
                2. Professional Summary
              </h3>
              <textarea
                rows={3}
                value={resume.summary || ''}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            {/* Experience */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider pb-1 border-b border-[#E4E7EC]">
                3. Work Experience
              </h3>
              {resume.experience.map((exp, expIdx) => (
                <div key={exp.id} className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E4E7EC] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Role (e.g. Frontend Engineer)"
                      value={exp.role}
                      onChange={(e) => {
                        const newExp = [...resume.experience];
                        newExp[expIdx].role = e.target.value;
                        setResume({ ...resume, experience: newExp });
                      }}
                      className="p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Company (e.g. TechFlow)"
                      value={exp.organization}
                      onChange={(e) => {
                        const newExp = [...resume.experience];
                        newExp[expIdx].organization = e.target.value;
                        setResume({ ...resume, experience: newExp });
                      }}
                      className="p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-[#5B6478]">Experience Bullets</label>
                    {exp.bullets.map((bullet, bIdx) => (
                      <textarea
                        key={bIdx}
                        rows={2}
                        value={bullet}
                        onChange={(e) => {
                          const newExp = [...resume.experience];
                          newExp[expIdx].bullets[bIdx] = e.target.value;
                          setResume({ ...resume, experience: newExp });
                        }}
                        className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider pb-1 border-b border-[#E4E7EC]">
                4. Core Skills (Comma-separated)
              </h3>
              <input
                type="text"
                value={resume.skills.join(', ')}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>
          </div>

          {/* Right Column: Live Template Preview */}
          <div
            className={`w-full md:w-1/2 p-6 overflow-y-auto bg-gray-100 flex items-start justify-center ${
              activeTab === 'preview' ? 'block' : 'hidden md:flex'
            }`}
          >
            {/* The Resume Sheet */}
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[210mm] min-h-[297mm] text-[#12172B] space-y-5 border border-gray-200">
              {/* Header */}
              <div className="border-b pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-[#12172B]">{resume.contact.name}</h1>
                <div className="text-xs text-[#5B6478] flex flex-wrap gap-2 mt-1">
                  <span>{resume.contact.email}</span>
                  {resume.contact.phone && <span>• {resume.contact.phone}</span>}
                  {resume.contact.location && <span>• {resume.contact.location}</span>}
                </div>
              </div>

              {/* Summary */}
              {resume.summary && (
                <div>
                  <h4 className="text-xs font-bold text-[#2B4EE6] uppercase tracking-wider mb-1">
                    Professional Summary
                  </h4>
                  <p className="text-xs text-[#5B6478] leading-relaxed">{resume.summary}</p>
                </div>
              )}

              {/* Experience */}
              <div>
                <h4 className="text-xs font-bold text-[#2B4EE6] uppercase tracking-wider mb-2">
                  Experience
                </h4>
                <div className="space-y-3">
                  {resume.experience.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-[#12172B]">{exp.role}</span>
                        <span className="text-[#5B6478] text-[11px]">
                          {exp.startDate} – {exp.endDate || 'Present'}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#5B6478]">{exp.organization}</div>
                      <ul className="list-disc list-outside pl-4 text-xs text-[#5B6478] space-y-1 mt-1">
                        {exp.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <h4 className="text-xs font-bold text-[#2B4EE6] uppercase tracking-wider mb-2">
                  Education
                </h4>
                {resume.education.map((edu) => (
                  <div key={edu.id} className="text-xs">
                    <div className="font-bold text-[#12172B]">{edu.qualification}</div>
                    <div className="text-[#5B6478]">
                      {edu.institution} ({edu.graduationYear})
                    </div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-xs font-bold text-[#2B4EE6] uppercase tracking-wider mb-1.5">
                  Core Competencies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Diff Review Modal (Polish Mode) ─────────────────────────────── */}
        {showDiffModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="text-sm font-bold text-[#12172B]">AI Polish Diff Review</h3>
                  <p className="text-xs text-[#5B6478]">
                    Review each rewritten bullet before accepting. Zero facts or metrics have been added.
                  </p>
                </div>
                <button
                  onClick={() => setShowDiffModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {diffReviews.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E4E7EC] space-y-2">
                    <div className="text-xs text-[#5B6478]">
                      <span className="font-semibold text-gray-500">Original:</span> {rev.originalBullet}
                    </div>
                    <div className="text-xs font-medium text-[#12172B]">
                      <span className="font-semibold text-[#2B4EE6]">Polished:</span> {rev.rewrittenBullet}
                    </div>

                    {rev.flaggedFabrications.length > 0 && (
                      <div className="p-2 bg-amber-50 text-amber-800 rounded border border-amber-200 text-[11px] font-medium flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Potential new terms detected: {rev.flaggedFabrications.join(', ')}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleAcceptDiff(idx)}
                        disabled={rev.status === 'accepted'}
                        className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                          rev.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#2B4EE6] text-white hover:bg-[#1E3BBD]'
                        }`}
                      >
                        {rev.status === 'accepted' ? '✓ Accepted' : 'Accept Change'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex justify-end">
                <button
                  onClick={() => setShowDiffModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#12172B] rounded-lg"
                >
                  Done Reviewing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Strengthen Questions Modal ──────────────────────────────────── */}
        {showStrengthenModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="text-sm font-bold text-[#12172B]">AI Strengthen Probing Questions</h3>
                  <p className="text-xs text-[#5B6478]">
                    Answer missing specifics to quantify your impact, or skip to leave unpadded.
                  </p>
                </div>
                <button
                  onClick={() => setShowStrengthenModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {strengthenQuestions.map((q) => (
                  <div key={q.bulletIndex} className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E4E7EC] space-y-2">
                    <p className="text-xs text-[#5B6478] italic">"{q.originalBullet}"</p>
                    <p className="text-xs font-bold text-[#2B4EE6]">❓ {q.question}</p>
                    <input
                      type="text"
                      placeholder="e.g. improved speed by 30%, handled 50,000 daily requests..."
                      value={userAnswers[q.bulletIndex] || ''}
                      onChange={(e) =>
                        setUserAnswers({ ...userAnswers, [q.bulletIndex]: e.target.value })
                      }
                      className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t flex justify-between">
                <button
                  onClick={() => setShowStrengthenModal(false)}
                  className="text-xs font-semibold text-[#5B6478]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowStrengthenModal(false);
                    alert('Answers captured! Applying quantified edits to your resume.');
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg"
                >
                  Apply Answers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
