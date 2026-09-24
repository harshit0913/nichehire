'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import AuthModal from './components/AuthModal';
import EmailDraftModal from './components/EmailDraftModal';
import InterviewPrepModal from './components/InterviewPrepModal';
import HelpModal from './components/HelpModal';
import FeedbackModal from './components/FeedbackModal';
import PostWalkInModal from './components/PostWalkInModal';
import { supabase } from './supabase';
import type { WalkInJob } from './api/walkins/route';

// ─── Types ───────────────────────────────────────────────────────────────────

type ParsedProfile = {
  name: string;
  role: string;
  skills: string[];
  experienceLevel: string;
  location: string;
  summary?: string;
  rawText?: string;
};

type TailorState = {
  loading: boolean;
  text?: string;
  error?: string;
  open: boolean;
};

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  salary?: string;
  description: string;
  url: string;
  source: string;
  isStartup?: boolean;
  postedAt?: number;
  postedText?: string;
  applicantCount?: number;
  applicantText?: string;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function JobDashboard() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Modals state
  const [activeOutreachJob, setActiveOutreachJob] = useState<Job | null>(null);
  const [activePrepJob, setActivePrepJob] = useState<Job | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [postWalkInOpen, setPostWalkInOpen] = useState(false);

  // Job Search state
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allLiveJobs, setAllLiveJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'walkins'>('all');

  // Walk-Ins state
  const [walkins, setWalkins] = useState<WalkInJob[]>([]);
  const [isWalkinsLoading, setIsWalkinsLoading] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);

  // Resume state
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);
  const [parseError, setParseError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detailed Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [workMode, setWorkMode] = useState('Any Mode');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedSource, setSelectedSource] = useState('All Sources');
  const [postedTime, setPostedTime] = useState('Any Time');
  const [isStartupOnly, setIsStartupOnly] = useState(false);

  // Per-job tailoring state
  const [tailorMap, setTailorMap] = useState<Record<string, TailorState>>({});

  // ─── Auth Lifecycle & Saved Jobs ───────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Load saved jobs from localStorage
    try {
      const saved = localStorage.getItem('nichehire_saved_jobs');
      if (saved) setSavedJobIds(JSON.parse(saved));
    } catch {
      // Ignore
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const toggleSaveJob = (id: string) => {
    setSavedJobIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('nichehire_saved_jobs', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // ─── Match Scoring & Skill Gap Calculation ─────────────────────────────────

  const calculateMatch = (job: Job) => {
    if (!parsedProfile || !parsedProfile.skills?.length) {
      return { score: 0, matched: [] };
    }

    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const candidateSkills = parsedProfile.skills;

    const matched = candidateSkills.filter((skill) =>
      jobText.includes(skill.toLowerCase())
    );

    const ratio = matched.length / Math.max(candidateSkills.length, 1);
    const score = Math.round(ratio * 100);

    return { score, matched };
  };

  // ─── File Upload & Parsing (PDF, DOCX, TXT) ────────────────────────────────

  const processFile = async (file: File) => {
    setIsParsing(true);
    setParseError('');
    setFileName(file.name);

    try {
      const reader = new FileReader();
      const isPdfOrDocx = file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc');

      if (isPdfOrDocx) {
        reader.onerror = () => {
          setParseError('Failed to read file.');
          setIsParsing(false);
        };
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const res = await fetch('/api/resume/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: base64Data,
                mimeType: file.type || 'application/pdf',
                fileName: file.name,
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to parse file');

            setParsedProfile(data);
            if (data.rawText) setResumeText(data.rawText);

            const autoRole = data.role || '';
            const autoLoc = data.location?.toLowerCase().includes('india') ? 'India' : data.location?.toLowerCase().includes('remote') ? '' : (data.location || '');
            setSearchQuery(autoRole);
            setLocationQuery(autoLoc);
            await fetchJobs(autoRole, autoLoc);
          } catch (err: any) {
            setParseError(err.message || 'Failed to parse resume file.');
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        reader.onerror = () => {
          setParseError('Failed to read file.');
          setIsParsing(false);
        };
        reader.onload = async () => {
          try {
            const text = reader.result as string;
            setResumeText(text);
            await analyzeResumeText(text);
          } catch (err: any) {
            setParseError(err.message || 'Error processing file.');
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      setParseError(err.message || 'Error reading file.');
      setIsParsing(false);
    }
  };

  const analyzeResumeText = async (text: string) => {
    if (!text.trim()) {
      setParseError('Please paste your resume text first.');
      return;
    }
    setIsParsing(true);
    setParseError('');

    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze resume');

      setParsedProfile(data);
      const autoRole = data.role || '';
      const autoLoc = data.location?.toLowerCase().includes('india') ? 'India' : data.location?.toLowerCase().includes('remote') ? '' : (data.location || '');
      setSearchQuery(autoRole);
      setLocationQuery(autoLoc);
      await fetchJobs(autoRole, autoLoc);
    } catch (err: any) {
      setParseError(err.message || 'Failed to analyze resume.');
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Fetch Jobs ────────────────────────────────────────────────────────────

  const fetchJobs = async (
    overrideQuery?: string,
    overrideLoc?: string,
    overrideFilters?: {
      workMode?: string;
      jobType?: string;
      source?: string;
      postedTime?: string;
      isStartupOnly?: boolean;
    }
  ) => {
    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    const roleToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const locToUse = overrideLoc !== undefined ? overrideLoc : locationQuery;
    const workModeToUse = overrideFilters?.workMode ?? workMode;
    const jobTypeToUse = overrideFilters?.jobType ?? selectedType;
    const sourceToUse = overrideFilters?.source ?? selectedSource;
    const postedTimeToUse = overrideFilters?.postedTime ?? postedTime;
    const startupToUse = overrideFilters?.isStartupOnly ?? isStartupOnly;

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleToUse,
          location: locToUse,
          workMode: workModeToUse,
          jobType: jobTypeToUse,
          source: sourceToUse,
          postedTime: postedTimeToUse,
          isStartupOnly: startupToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');
      setAllLiveJobs(data.jobs || []);

      if (data.meta?.failedSources?.length) {
        setErrorMsg(
          `Some sources didn't respond (${data.meta.failedSources.join(', ')}) — showing results from the rest.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to pull live jobs.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalkins = async () => {
    setIsWalkinsLoading(true);
    try {
      const res = await fetch('/api/walkins');
      const data = await res.json();
      if (data.walkins) setWalkins(data.walkins);
    } catch (err) {
      console.error('Failed to load walk-ins:', err);
    } finally {
      setIsWalkinsLoading(false);
    }
  };

  const handleFlagWalkin = async (id: string) => {
    if (flaggedIds.includes(id)) return;
    setFlaggedIds((prev) => [...prev, id]);
    setWalkins((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch('/api/walkins/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Flag walk-in error:', err);
    }
  };

  useEffect(() => {
    fetchJobs('');
    fetchWalkins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Tailor Resume ─────────────────────────────────────────────────────────

  const handleTailorResume = async (job: Job) => {
    if (!resumeText.trim()) {
      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, error: 'Please upload or paste your resume first.' },
      }));
      return;
    }

    setTailorMap((prev) => ({ ...prev, [job.id]: { loading: true, open: true } }));

    try {
      const res = await fetch('/api/resume/tailor', {
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
      if (!res.ok) throw new Error(data.error || 'Failed to tailor resume');

      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, text: data.tailoredResume },
      }));
    } catch (err: any) {
      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, error: err.message || 'Tailoring failed.' },
      }));
    }
  };

  const closeTailor = (jobId: string) => {
    setTailorMap((prev) => ({ ...prev, [jobId]: { ...prev[jobId], open: false } }));
  };

  // ─── 1-Click ATS PDF Print ─────────────────────────────────────────────────

  const handlePrintPdf = (tailoredText: string, jobTitle: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${jobTitle} - Tailored Resume</title>
          <style>
            @page { size: letter; margin: 0.75in; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; margin: 0; }
            h1, h2, h3 { color: #0f172a; margin-top: 14pt; margin-bottom: 4pt; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 2pt; }
            h1 { font-size: 18pt; text-align: center; border: none; }
            h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.5pt; }
            ul { margin: 4pt 0 8pt 18pt; padding: 0; }
            li { margin-bottom: 3pt; }
            p { margin: 4pt 0 8pt 0; }
          </style>
        </head>
        <body>
          ${tailoredText
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/g, '<p></p>')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  // ─── Format Time Ago Helper ────────────────────────────────────────────────

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Recent';
    const diffHours = Math.round((Date.now() - timestamp) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.round(diffDays / 30)}mo ago`;
    return `${Math.round(diffDays / 365)}y ago`;
  };

  const getDaysLeft = (expiresAt: string) => {
    try {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    } catch {
      return 5;
    }
  };

  const filteredWalkins = walkins.filter((w) => {
    if (flaggedIds.includes(w.id)) return false;
    const q = searchQuery.toLowerCase().trim();
    const loc = locationQuery.toLowerCase().trim();
    const textMatch = !q || w.title.toLowerCase().includes(q) || w.company.toLowerCase().includes(q) || (w.description && w.description.toLowerCase().includes(q));
    const locMatch = !loc || w.location.toLowerCase().includes(loc);
    return textMatch && locMatch;
  });

  // ─── Active Filter Logic ───────────────────────────────────────────────────

  const filteredJobs = allLiveJobs.filter((job) => {
    if (activeTab === 'saved' && !savedJobIds.includes(job.id)) return false;
    if (isStartupOnly && !job.isStartup) return false;
    if (workMode !== 'Any Mode' && job.workMode !== workMode) return false;
    if (selectedType !== 'All Types' && job.type !== selectedType) return false;
    if (selectedSource !== 'All Sources') {
      if (selectedSource === 'Google for Jobs (LinkedIn/Indeed)') {
        if (!job.source.includes('Google') && !job.source.includes('LinkedIn') && !job.source.includes('Indeed')) return false;
      } else if (selectedSource === 'LinkedIn (Live Scraper)') {
        if (!job.source.includes('ScrapingDog') && !job.source.includes('LinkedIn')) return false;
      } else if (selectedSource === 'Direct Tech ATS (Greenhouse/Lever)') {
        if (!job.source.startsWith('Direct ATS')) return false;
      } else if (job.source !== selectedSource) {
        return false;
      }
    }

    // Filter by postedTime client-side
    if (postedTime && postedTime !== 'Any Time') {
      const now = Date.now();
      const diffMs = job.postedAt ? now - job.postedAt : Infinity;
      const text = (job.postedText || '').toLowerCase();
      if (postedTime === 'Past 24 Hours') {
        const matches24h = diffMs <= 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now');
        if (!matches24h) return false;
      } else if (postedTime === 'Past 3 Days') {
        const matches3d = diffMs <= 3 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now') || text.includes('yesterday') || text.includes('1d') || text.includes('2d') || text.includes('3d') || text.includes('1 day') || text.includes('2 days') || text.includes('3 days');
        if (!matches3d) return false;
      } else if (postedTime === 'Past Week') {
        const matches1w = diffMs <= 7 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('yesterday') || text.includes('d ago') || text.includes('1 week') || text.includes('1w');
        if (!matches1w) return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900 font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                NicheHire
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                Exclusive
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'all' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              💼 All Jobs
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>★</span> Saved ({savedJobIds.length})
            </button>

            <button
              onClick={() => setActiveTab('walkins')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'walkins'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-xs'
                  : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>🚶</span> Walk-Ins ({walkins.length})
            </button>

            <button
              onClick={() => setPostWalkInOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Post Walk-In
            </button>

            <button
              onClick={() => setHelpModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden sm:inline"
            >
              💡 Help & Tips
            </button>

            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden sm:inline"
            >
              💬 Feedback
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 hidden md:inline">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-b from-blue-50/50 via-white to-[#fafbfc] pt-12 pb-10 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-700 text-xs font-medium mb-4">
            <span>✦</span> The Executive Career Copilot
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            Hi, welcome to <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NicheHire</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-8">
            Match verified <span className="font-semibold text-gray-800">On-site</span>, <span className="font-semibold text-gray-800">Hybrid</span>, <span className="font-semibold text-gray-800">Remote</span>, and <span className="font-semibold text-blue-600">Startup</span> jobs across 6+ platforms, and generate ATS-tailored CVs & HR outreach pitches in seconds.
          </p>

          {/* ── Resume Dropzone (Accepts PDF, DOCX, TXT) ── */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-blue-400 bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => {
                  if (e.target.files?.[0]) processFile(e.target.files[0]);
                }}
                className="hidden"
              />

              <div className="text-3xl mb-2">📄</div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                {fileName ? fileName : 'Drop your resume here (PDF, DOCX, TXT)'}
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Supports Adobe PDF, Microsoft Word, or plain text
              </p>

              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-2xs"
                >
                  {isParsing ? 'Analyzing Resume…' : 'Browse Files'}
                </button>
              </div>
            </div>

            {/* Alternative: Plain Text Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
              <details className="w-full text-left">
                <summary className="text-xs text-blue-600 hover:underline cursor-pointer text-center font-medium">
                  Or paste resume text manually
                </summary>
                <div className="mt-3">
                  <textarea
                    rows={4}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume text here..."
                    className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => analyzeResumeText(resumeText)}
                    disabled={isParsing || !resumeText.trim()}
                    className="mt-2 w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isParsing ? 'Analyzing...' : 'Analyze Pasted Text'}
                  </button>
                </div>
              </details>
            </div>

            {/* Parse Error */}
            {parseError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {parseError}
              </p>
            )}

            {/* Parsed Profile Badge */}
            {parsedProfile && (
              <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-left">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Resume Analyzed • ATS Matching Active
                  </span>
                  <span className="text-xs font-medium text-gray-600">{parsedProfile.experienceLevel}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{parsedProfile.name || 'Candidate Profile'}</p>
                <p className="text-xs text-gray-600 mb-2.5">
                  Target Role: <strong className="text-gray-800">{parsedProfile.role}</strong>
                  {parsedProfile.location && ` • ${parsedProfile.location}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(parsedProfile.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-white text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Dashboard ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Search & Filter Controls ── */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200/80 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Job title or keywords (e.g. Frontend, Finance, Data, Marketing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="City, State, or Country (e.g. Bangalore, Delhi, New York)..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchJobs()}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
            >
              {isLoading ? 'Searching...' : 'Search Jobs'}
            </button>
          </div>

          {/* Detailed Filters Row */}
          <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-gray-100 text-xs">
            {/* Startup Toggle */}
            <button
              onClick={() => {
                const next = !isStartupOnly;
                setIsStartupOnly(next);
                fetchJobs(undefined, undefined, { isStartupOnly: next });
              }}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                isStartupOnly
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span>🚀</span> Startup Jobs (Himalayas)
            </button>

            {/* Work Mode */}
            <select
              value={workMode}
              onChange={(e) => {
                const val = e.target.value;
                setWorkMode(val);
                fetchJobs(undefined, undefined, { workMode: val });
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
            >
              <option>Any Mode</option>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>

            {/* Job Type */}
            <select
              value={selectedType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedType(val);
                fetchJobs(undefined, undefined, { jobType: val });
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
            >
              <option>All Types</option>
              <option>Full-Time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>

            {/* Posted Time */}
            <select
              value={postedTime}
              onChange={(e) => {
                const val = e.target.value;
                setPostedTime(val);
                fetchJobs(undefined, undefined, { postedTime: val });
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
            >
              <option>Any Time</option>
              <option>Past 24 Hours</option>
              <option>Past 3 Days</option>
              <option>Past Week</option>
            </select>

            {/* Source */}
            <select
              value={selectedSource}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSource(val);
                fetchJobs(undefined, undefined, { source: val });
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
            >
              <option>All Sources</option>
              <option>Google for Jobs (LinkedIn/Indeed)</option>
              <option>LinkedIn (Live Scraper)</option>
              <option>Direct Tech ATS (Greenhouse/Lever)</option>
              <option>Himalayas (Startups)</option>
              <option>Adzuna</option>
              <option>Jooble</option>
              <option>Remotive</option>
              <option>Arbeitnow</option>
              <option>RemoteOK</option>
            </select>

            {(searchQuery || locationQuery || workMode !== 'Any Mode' || selectedType !== 'All Types' || selectedSource !== 'All Sources' || postedTime !== 'Any Time' || isStartupOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationQuery('');
                  setWorkMode('Any Mode');
                  setSelectedType('All Types');
                  setSelectedSource('All Sources');
                  setPostedTime('Any Time');
                  setIsStartupOnly(false);
                  fetchJobs('', '');
                }}
                className="ml-auto text-xs text-blue-600 hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* ── Job Feed ── */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-bold text-gray-800">
              {activeTab === 'saved'
                ? `Saved Opportunities (${filteredJobs.length})`
                : activeTab === 'walkins'
                ? `🚶 Community Walk-Ins & Offline Jobs (${filteredWalkins.length})`
                : hasSearched
                ? `Live Opportunities (${filteredJobs.length})`
                : 'Recommended Opportunities'}
            </h2>
            <span className="text-xs text-gray-400">
              {activeTab === 'walkins'
                ? 'Community-posted • Auto-expires in 5 days'
                : 'Aggregated from multiple verified platforms'}
            </span>
          </div>

          {activeTab === 'walkins' ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span>🏪</span> Direct Walk-Ins & Offline Opportunities
                  </h3>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Openings from physical stores, clinics, and local businesses posted by the community. Automatically prunes after 5 days.
                  </p>
                </div>
                <button
                  onClick={() => setPostWalkInOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5"
                >
                  <span>+</span> Post a Walk-In Opening
                </button>
              </div>

              {isWalkinsLoading && (
                <div className="space-y-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="p-6 border rounded-xl shadow-2xs animate-pulse border-gray-100 bg-white">
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
                      <div className="h-8 bg-gray-100 rounded w-28"></div>
                    </div>
                  ))}
                </div>
              )}

              {!isWalkinsLoading && filteredWalkins.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-white border-gray-200">
                  <div className="text-3xl mb-2">🚶</div>
                  <h3 className="text-base font-semibold text-gray-900">No active walk-ins found</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Know of a local business or shop that is currently hiring? Be the first to share it with the community!
                  </p>
                  <button
                    onClick={() => setPostWalkInOpen(true)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors"
                  >
                    + Post First Walk-In
                  </button>
                </div>
              )}

              {!isWalkinsLoading &&
                filteredWalkins.map((w) => {
                  const daysLeft = getDaysLeft(w.expires_at);

                  return (
                    <div
                      key={w.id}
                      className="border border-amber-200/90 rounded-2xl hover:shadow-md transition-shadow bg-white overflow-hidden"
                    >
                      <div className="p-6 flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">{w.title}</h3>

                            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              🏪 Community Walk-In
                            </span>

                            <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              ⏳ Expires in {daysLeft}d
                            </span>

                            <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                              🏢 {w.company}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mb-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                            <div>
                              <strong className="text-gray-900">📍 Location:</strong> {w.location}
                            </div>
                            <div>
                              <strong className="text-gray-900">🕒 Timings:</strong> {w.timings}
                            </div>
                            <div className="sm:col-span-2">
                              <strong className="text-gray-900">📞 Contact / How to Apply:</strong>{' '}
                              <span className="font-semibold text-blue-700">{w.contact_info}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                            {w.description}
                          </p>

                          <div className="text-[11px] text-gray-400">
                            Posted by {w.posted_by || 'Community Member'} • {formatTimeAgo(new Date(w.created_at).getTime())}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row md:flex-col justify-end items-end gap-2 shrink-0">
                          <div className="flex gap-2 flex-wrap">
                            {/* Prep Interview */}
                            <button
                              onClick={() =>
                                setActivePrepJob({
                                  id: w.id,
                                  title: w.title,
                                  company: w.company,
                                  location: w.location,
                                  type: w.role_type || 'Full-Time',
                                  workMode: 'On-site',
                                  description: w.description,
                                  url: '#',
                                  source: 'Community Walk-In',
                                })
                              }
                              className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors whitespace-nowrap"
                            >
                              🎙️ Prep
                            </button>

                            {/* Contact / Copy */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${w.title} at ${w.company}\nContact: ${w.contact_info}\nLocation: ${w.location}`);
                                alert('Contact & walk-in details copied to clipboard!');
                              }}
                              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs whitespace-nowrap"
                            >
                              📋 Copy Info
                            </button>

                            {/* Report / Expired */}
                            <button
                              onClick={() => {
                                if (confirm('Report this walk-in as expired or inaccurate?')) {
                                  handleFlagWalkin(w.id);
                                }
                              }}
                              className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors whitespace-nowrap"
                              title="Report as expired or spam"
                            >
                              🚩 Report
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="p-6 border rounded-xl shadow-2xs animate-pulse border-gray-100 bg-white">
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
                      <div className="h-8 bg-gray-100 rounded w-28"></div>
                    </div>
                  ))}
                </div>
              )}

          {!isLoading && hasSearched && filteredJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-white border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">No jobs match your selected filters</h3>
              <p className="mt-1 text-xs text-gray-500">Try broadening your search query or selecting 'Any Mode'.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationQuery('');
                  setWorkMode('Any Mode');
                  setSelectedType('All Types');
                  setSelectedSource('All Sources');
                  setPostedTime('Any Time');
                  setIsStartupOnly(false);
                  fetchJobs('', '');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Reset Filters
              </button>
            </div>
          )}

          {!isLoading &&
            filteredJobs.map((job, idx) => {
              const tailor = tailorMap[job.id];
              const match = calculateMatch(job);
              const isSaved = savedJobIds.includes(job.id);

              return (
                <div
                  key={job.id || idx}
                  className="border border-gray-200/80 rounded-2xl hover:shadow-md transition-shadow bg-white overflow-hidden"
                >
                  <div className="p-6 flex flex-col md:flex-row justify-between gap-4">
                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">{job.title}</h3>

                        {/* Match Score Badge */}
                        {parsedProfile && (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs">
                            🔥 {match.score}% Fit
                          </span>
                        )}

                        {/* Work Mode Badge */}
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                            job.workMode === 'On-site'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : job.workMode === 'Hybrid'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {job.workMode === 'On-site' ? '🏢 On-site' : job.workMode === 'Hybrid' ? '🔄 Hybrid' : '🌐 Remote'}
                        </span>

                        {job.salary && (
                          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                            💰 {job.salary}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-700">{job.company}</span>
                        <span>•</span>
                        <span>📍 {job.location}</span>
                        <span>•</span>
                        <span>⏱️ {job.postedText || formatTimeAgo(job.postedAt)}</span>
                        {job.applicantText ? (
                          <>
                            <span>•</span>
                            <span>👥 {job.applicantText}</span>
                          </>
                        ) : job.applicantCount !== undefined ? (
                          <>
                            <span>•</span>
                            <span>👥 {job.applicantCount} applicants</span>
                          </>
                        ) : null}
                      </p>

                      {/* Matched Skills */}
                      {parsedProfile && match.matched.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center mb-3">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Matched Skills:</span>
                          {match.matched.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium"
                            >
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-600 line-clamp-2 mb-4">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-2.5 py-0.5 bg-gray-50 text-gray-600 text-[11px] rounded-md border border-gray-200 font-medium">
                          Source: {job.source}
                        </span>
                        {job.type && job.type !== 'Other' && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] rounded-md border border-blue-100 font-medium">
                            {job.type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row md:flex-col justify-end items-end gap-2 shrink-0">
                      <div className="flex gap-2 flex-wrap">
                        {/* Bookmark / Save */}
                        <button
                          onClick={() => toggleSaveJob(job.id)}
                          className={`p-2 rounded-xl border text-xs transition-colors ${
                            isSaved
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
                          }`}
                          title={isSaved ? 'Remove from saved' : 'Save opportunity'}
                        >
                          {isSaved ? '★' : '☆'}
                        </button>

                        {/* Email HR */}
                        <button
                          onClick={() => setActiveOutreachJob(job)}
                          className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs whitespace-nowrap"
                        >
                          ✉️ Email HR
                        </button>

                        {/* Interview Prep */}
                        <button
                          onClick={() => setActivePrepJob(job)}
                          className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors whitespace-nowrap"
                        >
                          🎙️ Prep
                        </button>

                        {/* Tailor Resume */}
                        <button
                          onClick={() => handleTailorResume(job)}
                          disabled={tailor?.loading}
                          className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-xs disabled:opacity-50 whitespace-nowrap"
                        >
                          {tailor?.loading ? '✦ Tailoring...' : '✦ Tailor Resume'}
                        </button>

                        {/* Apply */}
                        <a
                          href={job.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Apply ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Inline Tailored Resume Drawer */}
                  {tailor?.open && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <span>✦</span> AI Tailored Resume for {job.title} at {job.company}
                        </h4>
                        <button
                          onClick={() => closeTailor(job.id)}
                          className="text-xs text-gray-500 hover:text-gray-800"
                        >
                          Close
                        </button>
                      </div>

                      {tailor.loading && (
                        <div className="py-8 text-center text-xs text-gray-500 animate-pulse">
                          Optimizing achievements and keywords for {job.title}…
                        </div>
                      )}

                      {tailor.error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                          {tailor.error}
                        </p>
                      )}

                      {tailor.text && (
                        <>
                          <div className="prose prose-sm max-w-none bg-white border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto text-xs text-gray-800">
                            <ReactMarkdown>{tailor.text}</ReactMarkdown>
                          </div>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <button
                              onClick={() => handlePrintPdf(tailor.text!, job.title)}
                              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                              <span>📥</span> Download ATS-Friendly PDF
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(tailor.text!)}
                              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Copy Markdown
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      {/* Email HR Outreach Modal */}
      <EmailDraftModal
        isOpen={!!activeOutreachJob}
        onClose={() => setActiveOutreachJob(null)}
        job={activeOutreachJob}
        resumeText={resumeText}
      />

      {/* Interview Prep Modal */}
      <InterviewPrepModal
        isOpen={!!activePrepJob}
        onClose={() => setActivePrepJob(null)}
        job={activePrepJob}
        resumeText={resumeText}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />

      {/* Post Walk-In Modal */}
      <PostWalkInModal
        isOpen={postWalkInOpen}
        onClose={() => setPostWalkInOpen(false)}
        onSuccess={(newW) => {
          setWalkins((prev) => [newW, ...prev]);
          setActiveTab('walkins');
        }}
      />
    </div>
  );
}