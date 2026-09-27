'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  X,
  Sparkles,
  Upload,
  Check,
  Plus,
  Trash2,
  GraduationCap,
  Briefcase,
  User,
  Zap,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  graduationYear: string;
  score?: string;
}

interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  duration: string;
  bullets: string[];
}

interface ResumeState {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: string[];
  template: 'classic_ats' | 'minimal' | 'executive';
}

interface ResumeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isLoggedIn?: boolean;
  candidateProfile?: any;
}

const POPULAR_SKILL_SUGGESTIONS = [
  'Financial Accounting',
  'Advanced Excel & MIS',
  'GST & Taxation',
  'Supply Chain Management',
  'Business Analytics',
  'Operations Management',
  'Customer Relations & Sales',
  'Digital Marketing',
  'Tally Prime',
  'Project Coordination',
  'Team Leadership',
  'Market Research',
  'Communication Skills',
  'Python & SQL',
];

function ruleBasedPolish(text: string): string {
  let b = text.trim();
  if (!b) return b;
  const weakVerbs: Record<string, string> = {
    'worked on': 'Engineered and delivered',
    'helped with': 'Collaborated on',
    'did': 'Executed',
    'made': 'Developed',
    'handled': 'Managed and streamlined',
    'responsible for': 'Spearheaded',
    'looking after': 'Oversaw operations for',
    'took care of': 'Maintained and enhanced',
    'assisted in': 'Supported key execution for',
  };
  for (const [weak, strong] of Object.entries(weakVerbs)) {
    if (b.toLowerCase().startsWith(weak)) {
      b = strong + b.slice(weak.length);
      break;
    }
  }
  if (!b.endsWith('.')) b = b + '.';
  return b.charAt(0).toUpperCase() + b.slice(1);
}

export default function ResumeBuilderModal({
  isOpen,
  onClose,
  userId = 'usr-current',
  isLoggedIn = false,
  candidateProfile: propProfile,
}: ResumeBuilderModalProps) {
  // Mobile / Desktop View Mode
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  // Form Steps: 1: Contact, 2: Education, 3: Experience, 4: Skills & Summary
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Resume Form Data
  const [resume, setResume] = useState<ResumeState>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    summary: '',
    education: [
      {
        id: 'edu-1',
        degree: '',
        institution: '',
        graduationYear: '',
        score: '',
      },
    ],
    experience: [
      {
        id: 'exp-1',
        role: '',
        organization: '',
        duration: '',
        bullets: [''],
      },
    ],
    skills: [],
    template: 'classic_ats',
  });

  const [skillInput, setSkillInput] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load user data on open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const profKey = `nichehire_candidate_profile_${userId || 'guest'}`;
      const savedProfile = propProfile || JSON.parse(localStorage.getItem(profKey) || 'null');

      const resumeKey = `nichehire_uploaded_resume_${userId || 'guest'}`;
      const savedResume = JSON.parse(localStorage.getItem(resumeKey) || 'null');

      if (savedProfile) {
        setResume((prev) => ({
          ...prev,
          fullName: prev.fullName || savedProfile.fullName || '',
          email: prev.email || savedProfile.email || '',
          phone: prev.phone || savedProfile.phone || '',
          location: prev.location || savedProfile.city || '',
          headline: prev.headline || savedProfile.headline || '',
          summary: prev.summary || savedProfile.bio || '',
          education:
            prev.education[0]?.degree || !savedProfile.degree
              ? prev.education
              : [
                  {
                    id: 'edu-1',
                    degree: savedProfile.degree || '',
                    institution: savedProfile.institution || '',
                    graduationYear: savedProfile.gradYear || '',
                    score: '',
                  },
                ],
          skills:
            prev.skills.length > 0
              ? prev.skills
              : Array.isArray(savedProfile.skills)
              ? savedProfile.skills
              : [],
        }));
      } else if (savedResume?.rawText) {
        // We have raw resume text cached
        setNotice({
          type: 'info',
          text: `Found saved resume "${savedResume.fileName}". Click "Auto-Fill from Profile" anytime to sync.`,
        });
      }
    } catch {
      // Ignore
    }
  }, [isOpen, userId, propProfile]);

  if (!isOpen) return null;

  // 1-Click Auto Fill from Profile
  const handleAutoFillFromProfile = () => {
    try {
      const profKey = `nichehire_candidate_profile_${userId || 'guest'}`;
      const savedProfile = propProfile || JSON.parse(localStorage.getItem(profKey) || 'null');

      if (savedProfile && (savedProfile.fullName || savedProfile.degree || savedProfile.skills?.length)) {
        setResume((prev) => ({
          ...prev,
          fullName: savedProfile.fullName || prev.fullName,
          email: savedProfile.email || prev.email,
          phone: savedProfile.phone || prev.phone,
          location: savedProfile.city || prev.location,
          headline: savedProfile.headline || prev.headline,
          summary: savedProfile.bio || prev.summary,
          education: savedProfile.degree
            ? [
                {
                  id: 'edu-1',
                  degree: savedProfile.degree || '',
                  institution: savedProfile.institution || '',
                  graduationYear: savedProfile.gradYear || '',
                  score: '',
                },
              ]
            : prev.education,
          skills: Array.isArray(savedProfile.skills) && savedProfile.skills.length > 0
            ? savedProfile.skills
            : prev.skills,
        }));
        setNotice({
          type: 'success',
          text: '✓ Details auto-filled from your profile credentials!',
        });
        setTimeout(() => setNotice(null), 4000);
      } else {
        setNotice({
          type: 'info',
          text: 'No saved profile found yet. You can upload an existing resume to auto-fill or enter your details directly.',
        });
        setTimeout(() => setNotice(null), 4000);
      }
    } catch {
      setNotice({
        type: 'error',
        text: 'Could not load profile. Please type in your details.',
      });
    }
  };

  // 1-Click Resume File Upload & Extraction
  const handleUploadResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingResume(true);
    setNotice(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const res = await fetch('/api/resume/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64String,
              mimeType: file.type || 'application/pdf',
              fileName: file.name,
            }),
          });

          const data = await res.json();
          if (data) {
            setResume((prev) => ({
              ...prev,
              fullName: data.name && data.name !== 'Applicant' ? data.name : prev.fullName,
              headline: data.role ? data.role : prev.headline,
              location: data.location ? data.location : prev.location,
              summary: data.summary ? data.summary : prev.summary,
              education: data.education
                ? [
                    {
                      id: 'edu-1',
                      degree: data.education,
                      institution: '',
                      graduationYear: '',
                      score: '',
                    },
                  ]
                : prev.education,
              skills: Array.isArray(data.skills) && data.skills.length > 0
                ? Array.from(new Set([...prev.skills, ...data.skills]))
                : prev.skills,
            }));

            // Also persist resume metadata
            const resumeMeta = {
              fileName: file.name,
              fileSize: `${Math.round(file.size / 1024)} KB`,
              uploadedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              rawText: data.rawText || '',
            };
            localStorage.setItem(`nichehire_uploaded_resume_${userId || 'guest'}`, JSON.stringify(resumeMeta));

            setNotice({
              type: 'success',
              text: `✓ Auto-filled from "${file.name}"! Review each section and export your ATS resume.`,
            });
            setTimeout(() => setNotice(null), 5000);
          }
        } catch {
          setNotice({
            type: 'error',
            text: 'Could not extract details from this file format. You can still type details manually.',
          });
        } finally {
          setIsParsingResume(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsParsingResume(false);
      setNotice({
        type: 'error',
        text: 'Failed to read file.',
      });
    }
  };

  // Skill Management
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || resume.skills.includes(trimmed)) return;
    setResume((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Education Item Management
  const handleAddEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: `edu-${Date.now()}`,
          degree: '',
          institution: '',
          graduationYear: '',
          score: '',
        },
      ],
    }));
  };

  const handleRemoveEducation = (id: string) => {
    if (resume.education.length <= 1) return;
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
  };

  // Experience Item Management
  const handleAddExperience = () => {
    setResume((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: `exp-${Date.now()}`,
          role: '',
          organization: '',
          duration: '',
          bullets: [''],
        },
      ],
    }));
  };

  const handleRemoveExperience = (id: string) => {
    if (resume.experience.length <= 1) return;
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }));
  };

  const handleAddBullet = (expIndex: number) => {
    setResume((prev) => {
      const copy = [...prev.experience];
      copy[expIndex].bullets.push('');
      return { ...prev, experience: copy };
    });
  };

  const handleBulletChange = (expIndex: number, bulletIndex: number, val: string) => {
    setResume((prev) => {
      const copy = [...prev.experience];
      copy[expIndex].bullets[bulletIndex] = val;
      return { ...prev, experience: copy };
    });
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    setResume((prev) => {
      const copy = [...prev.experience];
      if (copy[expIndex].bullets.length > 1) {
        copy[expIndex].bullets.splice(bulletIndex, 1);
      }
      return { ...prev, experience: copy };
    });
  };

  // Smooth AI Action Verb Polish
  const handlePolishWithActionVerbs = async () => {
    setIsPolishing(true);
    try {
      const allBullets = resume.experience.flatMap((e) => e.bullets).filter(Boolean);
      if (allBullets.length === 0 && !resume.summary.trim()) {
        setNotice({
          type: 'info',
          text: 'Add at least one experience bullet or summary text to polish.',
        });
        setIsPolishing(false);
        return;
      }

      // 1. Try server endpoint
      let polishedBullets: string[] = [];
      try {
        const res = await fetch('/api/resume/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'guest',
            mode: 'polish',
            bullets: allBullets.length > 0 ? allBullets : ['Handled operations and delivery.'],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) {
            polishedBullets = data.reviews.map((r: any) => r.rewrittenBullet);
          }
        }
      } catch {
        // Fallback gracefully below
      }

      // 2. Apply polished bullets or deterministic fallback
      setResume((prev) => {
        let bulletIdx = 0;
        const updatedExp = prev.experience.map((exp) => {
          const newBullets = exp.bullets.map((b) => {
            if (!b.trim()) return b;
            const replacement = polishedBullets[bulletIdx] || ruleBasedPolish(b);
            bulletIdx++;
            return replacement;
          });
          return { ...exp, bullets: newBullets };
        });

        const polishedSummary = prev.summary
          ? ruleBasedPolish(prev.summary)
          : prev.summary;

        return {
          ...prev,
          summary: polishedSummary,
          experience: updatedExp,
        };
      });

      setNotice({
        type: 'success',
        text: '✓ Polished with strong action verbs and clean formatting!',
      });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({
        type: 'error',
        text: 'Could not polish text. Existing draft preserved.',
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #nichehire-printable-resume,
          #nichehire-printable-resume * {
            visibility: visible !important;
          }
          #nichehire-printable-resume {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 12mm 15mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[94vh] flex flex-col relative border border-[#E4E7EC] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Modal Header ── */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2B4EE6] text-white flex items-center justify-center shrink-0">
              <FileText size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#12172B]">Simple ATS Resume Builder</h2>
                <span className="text-[10px] font-bold text-[#0E9F6E] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ATS Verified
                </span>
              </div>
              <p className="text-[11px] text-[#5B6478]">
                Fill details, auto-fill from profile/CV, and export clean PDF for corporate &amp; walk-in applications
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Toggle (Mobile / Small screens) */}
            <div className="flex lg:hidden bg-[#F7F8FA] p-0.5 rounded-lg border border-[#E4E7EC] text-xs font-semibold">
              <button
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'editor' ? 'bg-white shadow-xs text-[#12172B]' : 'text-[#5B6478]'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'preview' ? 'bg-white shadow-xs text-[#12172B]' : 'text-[#5B6478]'
                }`}
              >
                Preview
              </button>
            </div>

            {/* 1-Click Upload Resume */}
            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-[#12172B] bg-[#F7F8FA] hover:bg-[#E4E7EC] border border-[#E4E7EC] rounded-lg transition-colors flex items-center gap-1.5">
              <Upload size={12} strokeWidth={ICON_STROKE_WIDTH} />
              <span>{isParsingResume ? 'Parsing...' : 'Upload Resume'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                disabled={isParsingResume}
                onChange={handleUploadResumeFile}
              />
            </label>

            {/* 1-Click Auto Fill from Profile */}
            <button
              onClick={handleAutoFillFromProfile}
              className="px-3 py-1.5 text-xs font-semibold text-[#2B4EE6] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Zap size={12} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Auto-Fill from Profile</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={13} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Print / Save PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="text-[#5B6478] hover:text-[#12172B] p-1.5 rounded-lg hover:bg-[#F7F8FA]"
              title="Close modal"
            >
              <X size={18} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          </div>
        </div>

        {/* ── Status Notice Banner ── */}
        {notice && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between shrink-0 ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : notice.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-b border-rose-200'
                : 'bg-blue-50 text-blue-900 border-b border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <Check size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
              ) : (
                <AlertTriangle size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-blue-600" />
              )}
              <span className="font-medium">{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-600">
              <X size={13} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Form Editor */}
          <div
            className={`w-full lg:w-1/2 flex flex-col border-r border-[#E4E7EC] bg-white ${
              viewMode === 'editor' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Step Navigation Bar */}
            <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#E4E7EC] flex items-center justify-between text-xs overflow-x-auto">
              {[
                { step: 1, label: '1. Contact Info', icon: User },
                { step: 2, label: '2. Education', icon: GraduationCap },
                { step: 3, label: '3. Experience', icon: Briefcase },
                { step: 4, label: '4. Skills & Summary', icon: Sparkles },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = activeStep === s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white text-[#2B4EE6] shadow-xs border border-[#E4E7EC]'
                        : 'text-[#5B6478] hover:text-[#12172B]'
                    }`}
                  >
                    <Icon size={12} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Template Switcher */}
              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E4E7EC] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#12172B] block">Resume Format</span>
                  <span className="text-[10px] text-[#5B6478]">Choose formatting style for ATS</span>
                </div>
                <div className="flex gap-1">
                  {[
                    { id: 'classic_ats', label: 'Classic ATS' },
                    { id: 'minimal', label: 'Clean Minimal' },
                    { id: 'executive', label: 'Executive' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setResume({ ...resume, template: t.id as any })}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                        resume.template === t.id
                          ? 'bg-[#12172B] text-white border-[#12172B]'
                          : 'bg-white text-[#5B6478] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── STEP 1: Personal & Contact Info ── */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="pb-1 border-b border-[#E4E7EC] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                        Personal &amp; Contact Details
                      </h3>
                      <p className="text-[11px] text-[#5B6478]">This appears at the top of your resume.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#12172B]">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={resume.fullName}
                        onChange={(e) => setResume({ ...resume, fullName: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#12172B]">Target Role / Headline</label>
                      <input
                        type="text"
                        placeholder="e.g. Finance Trainee / Supply Chain Specialist"
                        value={resume.headline}
                        onChange={(e) => setResume({ ...resume, headline: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#12172B]">Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. priya.sharma@example.com"
                        value={resume.email}
                        onChange={(e) => setResume({ ...resume, email: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#12172B]">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={resume.phone}
                        onChange={(e) => setResume({ ...resume, phone: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-[#12172B]">Location (City, State)</label>
                      <input
                        type="text"
                        placeholder="e.g. Gangtok, Sikkim / Mumbai, Maharashtra"
                        value={resume.location}
                        onChange={(e) => setResume({ ...resume, location: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <span>Next: Education</span>
                      <ArrowRight size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Education ── */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="pb-1 border-b border-[#E4E7EC] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                        Education &amp; Qualifications
                      </h3>
                      <p className="text-[11px] text-[#5B6478]">
                        List your highest degrees, diplomas, or 12th board
                      </p>
                    </div>
                    <button
                      onClick={handleAddEducation}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2B4EE6] hover:underline"
                    >
                      <Plus size={11} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Add Degree</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {resume.education.map((edu, idx) => (
                      <div
                        key={edu.id}
                        className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E4E7EC] space-y-2 relative"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-[#E4E7EC]/60">
                          <span className="text-[11px] font-bold text-[#12172B]">
                            Qualification #{idx + 1}
                          </span>
                          {resume.education.length > 1 && (
                            <button
                              onClick={() => handleRemoveEducation(edu.id)}
                              className="text-gray-400 hover:text-rose-600 p-0.5"
                              title="Remove degree"
                            >
                              <Trash2 size={12} strokeWidth={ICON_STROKE_WIDTH} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-[#5B6478]">Degree / Stream</label>
                            <input
                              type="text"
                              placeholder="e.g. B.Com / MBA in Supply Chain / BA"
                              value={edu.degree}
                              onChange={(e) => {
                                const copy = [...resume.education];
                                copy[idx].degree = e.target.value;
                                setResume({ ...resume, education: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#5B6478]">College / University</label>
                            <input
                              type="text"
                              placeholder="e.g. Sikkim University / Delhi University"
                              value={edu.institution}
                              onChange={(e) => {
                                const copy = [...resume.education];
                                copy[idx].institution = e.target.value;
                                setResume({ ...resume, education: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#5B6478]">Passing Year</label>
                            <input
                              type="text"
                              placeholder="e.g. 2024 (or 2025 pursuing)"
                              value={edu.graduationYear}
                              onChange={(e) => {
                                const copy = [...resume.education];
                                copy[idx].graduationYear = e.target.value;
                                setResume({ ...resume, education: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-[#5B6478]">Score / Grade (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. 78% / 8.2 CGPA"
                              value={edu.score || ''}
                              onChange={(e) => {
                                const copy = [...resume.education];
                                copy[idx].score = e.target.value;
                                setResume({ ...resume, education: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-3 py-1.5 text-xs text-[#5B6478] hover:text-[#12172B] flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft size={12} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Back: Contact</span>
                    </button>
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <span>Next: Experience</span>
                      <ArrowRight size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Experience & Projects ── */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="pb-1 border-b border-[#E4E7EC] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                        Work Experience &amp; Internships
                      </h3>
                      <p className="text-[11px] text-[#5B6478]">
                        Include past jobs, internships, freelance, or academic projects
                      </p>
                    </div>
                    <button
                      onClick={handleAddExperience}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2B4EE6] hover:underline"
                    >
                      <Plus size={11} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Add Role / Project</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {resume.experience.map((exp, expIdx) => (
                      <div
                        key={exp.id}
                        className="p-3.5 bg-[#F7F8FA] rounded-xl border border-[#E4E7EC] space-y-3"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-[#E4E7EC]/60">
                          <span className="text-[11px] font-bold text-[#12172B]">
                            Position #{expIdx + 1}
                          </span>
                          {resume.experience.length > 1 && (
                            <button
                              onClick={() => handleRemoveExperience(exp.id)}
                              className="text-gray-400 hover:text-rose-600 p-0.5"
                              title="Remove role"
                            >
                              <Trash2 size={12} strokeWidth={ICON_STROKE_WIDTH} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-bold text-[#5B6478]">Job Title / Role</label>
                            <input
                              type="text"
                              placeholder="e.g. Accounts Assistant / Intern"
                              value={exp.role}
                              onChange={(e) => {
                                const copy = [...resume.experience];
                                copy[expIdx].role = e.target.value;
                                setResume({ ...resume, experience: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-bold text-[#5B6478]">Company / Organization</label>
                            <input
                              type="text"
                              placeholder="e.g. ABC Logistics / College Society"
                              value={exp.organization}
                              onChange={(e) => {
                                const copy = [...resume.experience];
                                copy[expIdx].organization = e.target.value;
                                setResume({ ...resume, experience: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="text-[10px] font-bold text-[#5B6478]">Duration</label>
                            <input
                              type="text"
                              placeholder="e.g. Jan 2023 - Present"
                              value={exp.duration}
                              onChange={(e) => {
                                const copy = [...resume.experience];
                                copy[expIdx].duration = e.target.value;
                                setResume({ ...resume, experience: copy });
                              }}
                              className="w-full p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Bullets */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-[#5B6478]">
                              Key Responsibilities &amp; Highlights (Bullet Points)
                            </label>
                            <button
                              onClick={() => handleAddBullet(expIdx)}
                              className="text-[10px] font-semibold text-[#2B4EE6] hover:underline flex items-center gap-0.5"
                            >
                              <Plus size={10} strokeWidth={ICON_STROKE_WIDTH} />
                              <span>Add Bullet</span>
                            </button>
                          </div>

                          {exp.bullets.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-1.5">
                              <span className="text-[#5B6478] text-xs">•</span>
                              <input
                                type="text"
                                placeholder="e.g. Managed ledger reconciliation and vendor payments for 40+ accounts."
                                value={bullet}
                                onChange={(e) => handleBulletChange(expIdx, bIdx, e.target.value)}
                                className="flex-1 p-2 text-xs bg-white border border-[#E4E7EC] rounded-lg"
                              />
                              {exp.bullets.length > 1 && (
                                <button
                                  onClick={() => handleRemoveBullet(expIdx, bIdx)}
                                  className="text-gray-400 hover:text-rose-600 p-1"
                                >
                                  <Trash2 size={11} strokeWidth={ICON_STROKE_WIDTH} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-3 py-1.5 text-xs text-[#5B6478] hover:text-[#12172B] flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft size={12} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Back: Education</span>
                    </button>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <span>Next: Skills &amp; Summary</span>
                      <ArrowRight size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Skills & Summary ── */}
              {activeStep === 4 && (
                <div className="space-y-5">
                  <div className="pb-1 border-b border-[#E4E7EC]">
                    <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                      Skills &amp; Professional Summary
                    </h3>
                    <p className="text-[11px] text-[#5B6478]">
                      Highlight your core competencies and write a crisp executive introduction
                    </p>
                  </div>

                  {/* Skills Section */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-[#12172B] block">
                      Core Skills &amp; Tools
                    </label>

                    {/* Skill tag list */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl">
                      {resume.skills.length === 0 ? (
                        <span className="text-[11px] text-[#5B6478] italic p-1">
                          No skills added yet. Type below or click the suggestions.
                        </span>
                      ) : (
                        resume.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-[#E4E7EC] text-[#12172B] text-xs font-medium rounded-md shadow-2xs"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-[#5B6478] hover:text-red-600 ml-0.5"
                            >
                              <X size={10} strokeWidth={ICON_STROKE_WIDTH} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Custom Skill Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a skill (e.g. GST Filing, Tally, Excel) and press Add"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill(skillInput);
                          }
                        }}
                        className="flex-1 p-2 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill(skillInput)}
                        className="px-3 py-2 bg-[#12172B] text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors"
                      >
                        Add Skill
                      </button>
                    </div>

                    {/* Quick Suggestions */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
                        Quick Add Common Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {POPULAR_SKILL_SUGGESTIONS.map((sug) => {
                          const isAdded = resume.skills.includes(sug);
                          return (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => !isAdded && handleAddSkill(sug)}
                              disabled={isAdded}
                              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                                isAdded
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                                  : 'bg-white text-[#2B4EE6] border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              + {sug}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="space-y-2 pt-2 border-t border-[#E4E7EC]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#12172B]">
                        Professional Summary / Objective
                      </label>
                      <button
                        type="button"
                        onClick={handlePolishWithActionVerbs}
                        disabled={isPolishing}
                        className="text-[11px] font-semibold text-[#2B4EE6] hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        <span>{isPolishing ? 'Polishing...' : '✨ Polish with Action Verbs'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="e.g. Dedicated commerce graduate with hands-on coursework in financial accounting and supply chain management. Eager to contribute analytical problem-solving and operational rigor in a growth-focused enterprise."
                      value={resume.summary}
                      onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                      className="w-full p-2.5 text-xs border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2B4EE6] leading-relaxed"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-3 py-1.5 text-xs text-[#5B6478] hover:text-[#12172B] flex items-center gap-1 font-semibold"
                    >
                      <ArrowLeft size={12} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Back: Experience</span>
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('preview');
                        setNotice({
                          type: 'success',
                          text: 'Resume ready! Review your live printable preview on the right.',
                        });
                        setTimeout(() => setNotice(null), 3500);
                      }}
                      className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>Review ATS Preview</span>
                      <Check size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live ATS Printable Resume Sheet */}
          <div
            className={`w-full lg:w-1/2 p-4 sm:p-8 overflow-y-auto bg-slate-100 flex items-start justify-center ${
              viewMode === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* The Resume Sheet Container */}
            <div
              id="nichehire-printable-resume"
              className={`bg-white p-8 sm:p-10 rounded-xl shadow-lg w-full max-w-[210mm] min-h-[297mm] text-[#12172B] space-y-5 border border-slate-200 transition-all font-sans ${
                resume.template === 'classic_ats' ? 'font-serif' : 'font-sans'
              }`}
            >
              {/* Header */}
              <div
                className={`pb-4 ${
                  resume.template === 'executive'
                    ? 'border-b-2 border-[#12172B]'
                    : 'border-b border-[#E4E7EC]'
                }`}
              >
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#12172B] uppercase">
                  {resume.fullName || 'YOUR FULL NAME'}
                </h1>
                {resume.headline && (
                  <p className="text-xs sm:text-sm font-semibold text-[#2B4EE6] mt-0.5">
                    {resume.headline}
                  </p>
                )}
                <div className="text-[11px] sm:text-xs text-[#5B6478] flex flex-wrap gap-2 mt-1.5">
                  {resume.email && <span>{resume.email}</span>}
                  {resume.phone && <span>• {resume.phone}</span>}
                  {resume.location && <span>• {resume.location}</span>}
                </div>
              </div>

              {/* Summary */}
              {resume.summary && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#12172B] uppercase tracking-wider border-b border-gray-200 pb-0.5">
                    Professional Summary
                  </h4>
                  <p className="text-xs text-[#333F51] leading-relaxed pt-0.5">
                    {resume.summary}
                  </p>
                </div>
              )}

              {/* Education */}
              {resume.education.some((e) => e.degree || e.institution) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#12172B] uppercase tracking-wider border-b border-gray-200 pb-0.5">
                    Education
                  </h4>
                  <div className="space-y-2">
                    {resume.education
                      .filter((e) => e.degree || e.institution)
                      .map((edu) => (
                        <div key={edu.id} className="text-xs">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-[#12172B]">{edu.degree}</span>
                            {edu.graduationYear && (
                              <span className="text-[#5B6478] text-[11px] font-medium">
                                {edu.graduationYear}
                              </span>
                            )}
                          </div>
                          <div className="text-[#5B6478] flex justify-between">
                            <span>{edu.institution}</span>
                            {edu.score && <span className="font-medium text-[#12172B]">{edu.score}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resume.experience.some((e) => e.role || e.organization) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#12172B] uppercase tracking-wider border-b border-gray-200 pb-0.5">
                    Experience &amp; Internships
                  </h4>
                  <div className="space-y-3">
                    {resume.experience
                      .filter((e) => e.role || e.organization)
                      .map((exp) => (
                        <div key={exp.id} className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="font-bold text-[#12172B]">{exp.role}</span>
                            {exp.duration && (
                              <span className="text-[#5B6478] text-[11px]">{exp.duration}</span>
                            )}
                          </div>
                          {exp.organization && (
                            <div className="text-[11px] font-semibold text-[#5B6478]">
                              {exp.organization}
                            </div>
                          )}
                          {exp.bullets.filter(Boolean).length > 0 && (
                            <ul className="list-disc list-outside pl-4 text-xs text-[#333F51] space-y-1 mt-1">
                              {exp.bullets
                                .filter(Boolean)
                                .map((b, i) => (
                                  <li key={i} className="leading-relaxed">
                                    {b}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Core Skills */}
              {resume.skills.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-[#12172B] uppercase tracking-wider border-b border-gray-200 pb-0.5">
                    Key Skills &amp; Competencies
                  </h4>
                  <p className="text-xs text-[#333F51] leading-relaxed pt-0.5">
                    {resume.skills.join(' • ')}
                  </p>
                </div>
              )}

              {/* Fallback prompt if blank */}
              {!resume.fullName && !resume.summary && resume.skills.length === 0 && (
                <div className="text-center py-16 text-gray-400 space-y-2">
                  <FileText size={32} strokeWidth={1.5} className="mx-auto text-gray-300" />
                  <p className="text-xs">Your live resume preview will appear here as you type.</p>
                  <p className="text-[11px] text-[#2B4EE6]">
                    Click "Auto-Fill from Profile" or "Upload Resume" in the header to populate instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
