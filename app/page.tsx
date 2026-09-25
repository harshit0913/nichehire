'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import AuthModal from './components/AuthModal';
import EmailDraftModal from './components/EmailDraftModal';
import InterviewPrepModal from './components/InterviewPrepModal';
import HelpModal from './components/HelpModal';
import FeedbackModal from './components/FeedbackModal';
import PostWalkInModal from './components/PostWalkInModal';
import PostJobModal from './components/PostJobModal';
import JobCardItem, { Job, FitRecommendation, TailorState } from './components/JobCardItem';
import { INITIAL_VERIFIED_JOBS } from './data/initialVerifiedJobs';
import { supabase } from './supabase';
import type { WalkInJob } from './api/walkins/route';

// ─── Types ───────────────────────────────────────────────────────────────────

type ParsedProfile = {
  name: string;
  role: string;
  skills: string[];
  experienceLevel: string;
  yearsOfExperience?: number;
  education?: string;
  extracurricular?: string[];
  location: string;
  summary?: string;
  rawText?: string;
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
  const [postJobOpen, setPostJobOpen] = useState(false);

  // Detailed Job View Drawer (LinkedIn Style)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Job Search state (Initial: NO jobs until searched)
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [discoveryTab, setDiscoveryTab] = useState<'search' | 'resume'>('search');
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

  // Refined Filters (Zero Aggregator Dropdown!)
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [workMode, setWorkMode] = useState('Any Mode');
  const [selectedType, setSelectedType] = useState('All Types');
  const [postedTime, setPostedTime] = useState('Any Time');
  const [distance, setDistance] = useState('Any Distance');
  const [applicants, setApplicants] = useState('Any Applicants');
  const [isStartupOnly, setIsStartupOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

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

    try {
      const saved = localStorage.getItem('nichehire_saved_jobs');
      if (saved) setSavedJobIds(JSON.parse(saved));
    } catch {
      // Ignore
    }

    // Load walk-ins count silently in background
    fetchWalkins();

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

  // ─── Smart Recommendation / Fit Analysis ───────────────────────────────────

  const calculateRecommendation = (job: Job): FitRecommendation => {
    if (!parsedProfile || !parsedProfile.skills?.length) {
      return {
        tier: 'neutral',
        label: 'Upload CV for Fit Score',
        badgeBg: 'bg-gray-100 text-gray-700 border-gray-200',
        score: 0,
        matchedSkills: [],
        missingSkills: [],
        educationMatch: null,
        experienceMatch: null,
        reason: 'Upload your resume to see your custom chance of getting hired.',
      };
    }

    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const candidateSkills = parsedProfile.skills || [];

    // Matched skills
    const matchedSkills = candidateSkills.filter((s) => jobText.includes(s.toLowerCase()));
    const skillRatio = matchedSkills.length / Math.max(candidateSkills.length, 1);

    // Common in-demand skills to detect gaps
    const techWords = [
      'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java',
      'Go', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'GraphQL', 'REST API',
      'System Design', 'Microservices', 'Tailwind', 'Redux', 'MongoDB', 'Redis',
      'Financial Modeling', 'Excel', 'Tally', 'GST', 'Taxation', 'Audit', 'Accounting'
    ];
    const missingSkills = techWords.filter(
      (w) => jobText.includes(w.toLowerCase()) && !candidateSkills.some((s) => s.toLowerCase() === w.toLowerCase())
    ).slice(0, 3);

    // Education check
    const candidateEdu = (parsedProfile.education || '').toLowerCase();
    let eduScore = 15;
    let eduText = 'Education aligns';
    if (jobText.includes('b.tech') || jobText.includes('bachelor') || jobText.includes('degree') || jobText.includes('engineering')) {
      if (candidateEdu.includes('b.tech') || candidateEdu.includes('bachelor') || candidateEdu.includes('master') || candidateEdu.includes('degree')) {
        eduScore = 20;
        eduText = 'Degree matches requirements';
      }
    }

    // Experience check
    let expScore = 15;
    let expText = 'Experience suitable';
    const jTitle = job.title.toLowerCase();
    const candExpLevel = (parsedProfile.experienceLevel || '').toLowerCase();
    const candYears = parsedProfile.yearsOfExperience || 2;

    if (jTitle.includes('senior') || jTitle.includes('lead') || jTitle.includes('staff')) {
      if (candExpLevel.includes('senior') || candExpLevel.includes('lead') || candYears >= 4) {
        expScore = 25;
        expText = 'Seniority level aligns with role';
      } else {
        expScore = 5;
        expText = 'Role may expect higher seniority';
      }
    } else if (jTitle.includes('junior') || jTitle.includes('intern') || jTitle.includes('entry') || jTitle.includes('associate')) {
      expScore = 25;
      expText = 'Great match for your experience level';
    }

    // Extracurricular / Projects boost
    const extraBoost = (parsedProfile.extracurricular?.length || 0) > 0 ? 10 : 5;

    // Total composite match score (out of 100)
    const compositeScore = Math.min(
      98,
      Math.round(skillRatio * 50 + expScore + eduScore + extraBoost)
    );

    if (compositeScore >= 65) {
      return {
        tier: 'high',
        label: 'High Chances • Recommended',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
        score: compositeScore,
        matchedSkills,
        missingSkills,
        educationMatch: eduText,
        experienceMatch: expText,
        reason: `Strong skills overlap (${matchedSkills.length} matched) and ${expText.toLowerCase()}.`,
      };
    } else if (compositeScore >= 40) {
      return {
        tier: 'medium',
        label: 'Decent Chances • Good Fit',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
        score: compositeScore,
        matchedSkills,
        missingSkills,
        educationMatch: eduText,
        experienceMatch: expText,
        reason: `Partial skills overlap. ${missingSkills.length > 0 ? `Consider highlighting ${missingSkills.join(', ')}.` : ''}`,
      };
    } else {
      return {
        tier: 'low',
        label: 'Low Chances • High Gap',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
        score: compositeScore,
        matchedSkills,
        missingSkills,
        educationMatch: eduText,
        experienceMatch: expText,
        reason: `Significant requirements gap. Missing core skills like ${missingSkills.join(', ') || 'specialized tech'}.`,
      };
    }
  };

  // ─── File Upload & Parsing ─────────────────────────────────────────────────

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
        const text = await file.text();
        setResumeText(text);
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
        setIsParsing(false);
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to analyze resume.');
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
      postedTime?: string;
      distance?: string;
      applicants?: string;
      isStartupOnly?: boolean;
      verifiedOnly?: boolean;
    }
  ) => {
    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    const roleToUse = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const locToUse = overrideLoc !== undefined ? overrideLoc : locationQuery;
    const workModeToUse = overrideFilters?.workMode ?? workMode;
    const jobTypeToUse = overrideFilters?.jobType ?? selectedType;
    const postedTimeToUse = overrideFilters?.postedTime ?? postedTime;
    const distanceToUse = overrideFilters?.distance ?? distance;
    const applicantsToUse = overrideFilters?.applicants ?? applicants;
    const startupToUse = overrideFilters?.isStartupOnly ?? isStartupOnly;
    const verifiedToUse = overrideFilters?.verifiedOnly ?? verifiedOnly;

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleToUse,
          location: locToUse,
          workMode: workModeToUse,
          jobType: jobTypeToUse,
          postedTime: postedTimeToUse,
          distance: distanceToUse,
          applicants: applicantsToUse,
          isStartupOnly: startupToUse,
          verifiedOnly: verifiedToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');
      setAllLiveJobs(data.jobs || []);

      if ((!data.jobs || data.jobs.length === 0) && data.meta?.failedSources?.length) {
        setErrorMsg(
          `Some sources didn't respond (${data.meta.failedSources.join(', ')}). Try adjusting your search query.`
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

  const openJobDetails = async (job: any) => {
    setSelectedJob(job);
    if (!job) return;

    if (!job.description || job.description.length < 250 || job.source === 'LinkedIn' || job.url?.includes('yash.com')) {
      try {
        const res = await fetch('/api/jobs/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: job.url, id: job.id, company: job.company }),
        });
        if (res.ok) {
          const detail = await res.json();
          if (detail.description) {
            setSelectedJob((prev: any) => {
              if (prev && prev.id === job.id) {
                return {
                  ...prev,
                  description: detail.description,
                  applicantText: detail.applicantText || prev.applicantText,
                };
              }
              return prev;
            });
            setAllLiveJobs((prevList: any[]) =>
              prevList.map((item) =>
                item.id === job.id
                  ? {
                      ...item,
                      description: detail.description,
                      applicantText: detail.applicantText || item.applicantText,
                    }
                  : item
              )
            );
          }
        }
      } catch {
        // Continue with current description
      }
    }
  };

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

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Recent';
    const diffHours = Math.round((Date.now() - timestamp) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${diffDays}d ago`;
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

  // ─── Filtered Walkins ──────────────────────────────────────────────────────

  const filteredWalkins = walkins.filter((w) => {
    if (flaggedIds.includes(w.id)) return false;
    const q = searchQuery.toLowerCase().trim();
    const loc = locationQuery.toLowerCase().trim();
    const textMatch = !q || w.title.toLowerCase().includes(q) || w.company.toLowerCase().includes(q) || (w.description && w.description.toLowerCase().includes(q));
    const locMatch = !loc || w.location.toLowerCase().includes(loc);
    return textMatch && locMatch;
  });

  // ─── Filtered Jobs (Client-Side) ───────────────────────────────────────────

  const filteredJobs = allLiveJobs.filter((job) => {
    if (activeTab === 'saved' && !savedJobIds.includes(job.id)) return false;
    if (isStartupOnly && !job.isStartup) return false;
    if (verifiedOnly && !job.isVerified) return false;
    if (workMode !== 'Any Mode' && job.workMode !== workMode) return false;
    if (selectedType !== 'All Types' && job.type !== selectedType) return false;

    // Distance Filter (Hierarchical proximity)
    if (distance && distance !== 'Any Distance' && locationQuery) {
      if (job.workMode !== 'Remote') {
        const tier = job.geoTier ?? 1;
        if (distance === 'Within 10 km' && tier > 1) return false;
        if (distance === 'Within 25 km' && tier > 2) return false;
        if (distance === 'Within 50 km' && tier > 3) return false;
        if (distance === 'Within 100 km' && tier > 4) return false;
      }
    }

    // Applicants Filter
    if (applicants && applicants !== 'Any Applicants') {
      if (job.applicantCount !== undefined) {
        if (applicants === 'Early Bird (< 10)' && job.applicantCount >= 10) return false;
        if (applicants === 'Under 25' && job.applicantCount >= 25) return false;
        if (applicants === 'Under 50' && job.applicantCount >= 50) return false;
      }
    }

    // Posted Time Filter
    if (postedTime && postedTime !== 'Any Time') {
      const now = Date.now();
      const diffMs = job.postedAt ? now - job.postedAt : Infinity;
      const text = (job.postedText || '').toLowerCase();
      if (postedTime === 'Past 6 Hours') {
        const matches6h = diffMs <= 6 * 60 * 60 * 1000 || text.includes('just now') || text.includes('1h') || text.includes('2h') || text.includes('3h') || text.includes('4h') || text.includes('5h') || text.includes('6h');
        if (!matches6h) return false;
      } else if (postedTime === 'Past 12 Hours') {
        const matches12h = diffMs <= 12 * 60 * 60 * 1000 || text.includes('just now') || text.includes('hour');
        if (!matches12h) return false;
      } else if (postedTime === 'Past 24 Hours') {
        const matches24h = diffMs <= 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('just now');
        if (!matches24h) return false;
      } else if (postedTime === 'Past 3 Days') {
        const matches3d = diffMs <= 3 * 24 * 60 * 60 * 1000 || text.includes('hour') || text.includes('today') || text.includes('yesterday') || text.includes('1d') || text.includes('2d') || text.includes('3d');
        if (!matches3d) return false;
      } else if (postedTime === 'Past Week') {
        const matches1w = diffMs <= 7 * 24 * 60 * 60 * 1000 || text.includes('d ago') || text.includes('1 week') || text.includes('1w');
        if (!matches1w) return false;
      }
    }

    return true;
  });

  // Trending Roles & Locations for Discovery Portal
  const TRENDING_ROLES = [
    'Software Engineer',
    'Senior Frontend',
    'Backend Engineer',
    'Founding Engineer',
    'Data Analyst',
    'Product Manager',
    'AI Engineer',
    'Financial Analyst',
  ];

  const POPULAR_LOCATIONS = [
    'Bangalore',
    'Delhi NCR',
    'Mumbai',
    'Hyderabad',
    'Pune',
    'Remote',
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900 font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setHasSearched(false)}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                NH
              </div>
              <span className="text-lg font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
                NicheHire
              </span>
              <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                100% Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setActiveTab('all');
                setHasSearched(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'all' && !hasSearched ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              💼 All Jobs
            </button>

            <button
              onClick={() => {
                setActiveTab('saved');
                setHasSearched(true);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>★</span> Saved
              {savedJobIds.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  {savedJobIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('walkins');
                setHasSearched(true);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'walkins'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-xs'
                  : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>🚶</span> Walk-Ins
              {walkins.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                  {walkins.length}
                </span>
              )}
            </button>

            <a
              href="#how-it-works"
              onClick={() => {
                if (hasSearched) setHasSearched(false);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden lg:inline"
            >
              ℹ️ How It Works
            </a>

            <Link
              href="/pricing"
              className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden md:inline"
            >
              🏷️ Pricing
            </Link>

            <button
              onClick={() => setPostJobOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all hidden sm:flex items-center gap-1"
            >
              <span>💼</span> Post a Job
            </button>

            <button
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true);
                } else {
                  setPostWalkInOpen(true);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Walk-In
            </button>

            <button
              onClick={() => setHelpModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden xl:inline"
            >
              💡 Help
            </button>

            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden xl:inline"
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

      {/* ── Initial Discovery State ("What are you looking for?") ── */}
      {!hasSearched && (
        <section className="min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-blue-50/40 via-white to-[#fafbfc]">
          <div className="max-w-4xl w-full text-center space-y-6">
            {/* Top Verified Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-semibold">
              <span>🛡️</span> Direct from 35+ Top Tech Companies &amp; Verified Startup Career Portals
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight">
              Verified Tech Jobs. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Direct From Company Portals.
              </span>
            </h1>

            {/* Subhead with consistent, authoritative voice */}
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Sourced straight from official corporate career sites (Yash Technologies, Bellurbis, Stripe, Vercel). Strictly <strong className="text-gray-900 font-bold">under 7 days old</strong> with automated AI skill-fit scoring. Never third-party aggregator spam.
            </p>

            {/* Social Proof & Live Metrics Bar */}
            <div className="pt-1 pb-1 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>1,240+ Active Verified Roles</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                <span>⚡</span> 48 Added Today
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                <span>🕒</span> &le; 7 Days Max Age
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                <span>🔒</span> 100% Direct Corporate Links
              </div>
            </div>

            {/* Company Portals Sourced (Social Proof Marquee) */}
            <div className="pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Official Corporate Portals Sourced Daily:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-gray-700">
                {['Yash Technologies', 'Stripe', 'Vercel', 'Bellurbis', 'InfoBeans', 'Groww', 'InMobi', 'Postman', 'CRED', 'Kimirica'].map((co) => (
                  <span
                    key={co}
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-800 shadow-2xs flex items-center gap-1.5 text-[11px] hover:border-blue-300 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    {co}
                  </span>
                ))}
              </div>
            </div>

            {/* Candidate Testimonial Social Proof */}
            <div className="inline-flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 max-w-xl mx-auto shadow-2xs text-left">
              <span className="text-base shrink-0">💬</span>
              <p className="text-[11px] font-medium leading-snug">
                &ldquo;Skipped 3 weeks of aggregator ghosting. Applied direct to Yash Tech via NicheHire and got an interview within 48 hours.&rdquo; <span className="font-bold text-blue-950">— Senior Engineer, Indore</span>
              </p>
            </div>

            {/* Mode Switcher & Interaction Card */}
            <div className="bg-white p-3 sm:p-5 rounded-3xl shadow-xl border border-gray-200 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDiscoveryTab('search')}
                    className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      discoveryTab === 'search'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>🔍</span> Search Verified Jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscoveryTab('resume')}
                    className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      discoveryTab === 'resume'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>✨</span> Instant AI Resume Match
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <span>⚡</span> Live crawlers active across 35+ career sites
                </div>
              </div>

              {/* Mode 1: Search by Role & Location */}
              {discoveryTab === 'search' && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
                      <input
                        type="text"
                        placeholder="Job title, technical skill, or role (e.g. React, Java, DevOps)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-3 text-gray-400 text-sm">📍</span>
                      <input
                        type="text"
                        placeholder="Location (e.g. Indore, Bangalore, or Remote)..."
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <button
                      onClick={() => fetchJobs()}
                      disabled={isLoading}
                      className="px-7 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isLoading ? 'Searching...' : 'Search Verified Jobs 🔍'}
                    </button>
                  </div>

                  {/* Surface Core Filters on Landing View */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mr-1">
                      Quick Filters:
                    </span>

                    {/* Work Mode Filter */}
                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                      {['Any Mode', 'Remote', 'Hybrid', 'On-site'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWorkMode(m)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            workMode === m
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {m === 'Remote' ? '🌐 Remote' : m === 'Hybrid' ? '🔄 Hybrid' : m === 'On-site' ? '🏢 Office' : 'All Modes'}
                        </button>
                      ))}
                    </div>

                    {/* Freshness Filter */}
                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                      {['Any Time', 'Past 24 Hours', 'Past 3 Days', 'Past Week'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPostedTime(t)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            postedTime === t
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {t === 'Past 24 Hours' ? '⚡ < 24h' : t === 'Past 3 Days' ? '🕒 < 3d' : t === 'Past Week' ? '📅 < 7d' : 'Any Freshness'}
                        </button>
                      ))}
                    </div>

                    {/* Verified Only Toggle */}
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        verifiedOnly
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>🛡️</span> Direct Portals Only
                    </button>
                  </div>

                  {/* Trending Role Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-gray-400 text-[11px] font-semibold uppercase mr-1">Trending:</span>
                    {TRENDING_ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSearchQuery(r);
                          fetchJobs(r);
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-lg text-gray-700 transition-colors border border-transparent text-[11px] font-medium"
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Popular Locations */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-gray-400 text-[11px] font-semibold uppercase mr-1">Tech Hubs:</span>
                    {POPULAR_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocationQuery(loc);
                          fetchJobs(undefined, loc);
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg text-gray-700 transition-colors border border-transparent text-[11px] font-medium"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 2: Instant Resume Matcher (Elevated & Prominent) */}
              {discoveryTab === 'resume' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                    }}
                    className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                      isDragging ? 'border-blue-500 bg-blue-50/60' : 'border-blue-300 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) processFile(e.target.files[0]);
                      }}
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl mx-auto mb-3">
                      📄
                    </div>

                    <h3 className="text-base font-extrabold text-gray-900">
                      {isParsing ? 'Analyzing your technical skills with AI…' : 'Drop your Resume (PDF or DOCX)'}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      Our AI extracts your skills, seniority, and education to compute instant <strong>High / Medium / Low Apply Chances</strong> against active verified openings.
                    </p>

                    <div className="pt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                      >
                        {isParsing ? 'Analyzing…' : 'Select Resume File'}
                      </button>
                    </div>
                  </div>

                  {/* Active Profile Pill if parsed */}
                  {parsedProfile && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>✓</span> Profile Analyzed: {parsedProfile.role || 'Software Engineer'} ({parsedProfile.experienceLevel || 'Mid-Level'})
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          {parsedProfile.skills?.slice(0, 6).join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => fetchJobs(parsedProfile.role, parsedProfile.location)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs shrink-0"
                      >
                        View Matched Openings ➔
                      </button>
                    </div>
                  )}

                  {/* Privacy Guarantee Trust Note */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5 text-[11px] text-gray-600">
                    <span className="text-sm">🔒</span>
                    <div>
                      <strong className="text-gray-900">100% In-Memory Privacy Guarantee:</strong> Your resume text is parsed temporarily to calculate match scores and search parameters. We never store, sell, or broadcast your personal data to external recruiters.
                    </div>
                  </div>

                  {/* Apply Chances Methodology Explainer */}
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900">
                    <span className="text-sm">ℹ️</span>
                    <div>
                      <strong className="text-blue-950">How Apply Chances Scoring Works:</strong> We score technical skill overlap (50%), experience level alignment (25%), education requirements (20%), and portfolio relevance (5%) to calculate your chance tier:
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="font-semibold text-emerald-800">🟢 High (65%+ fit)</span>
                        <span className="font-semibold text-amber-800">🟡 Good Fit (40-64%)</span>
                        <span className="font-semibold text-rose-800">🔴 High Gap (&lt; 40%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── How It Works / Why NicheHire Section ── */}
            <div id="how-it-works" className="pt-8 pb-2 text-left w-full space-y-4">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Why NicheHire</span>
                <h2 className="text-2xl font-black text-gray-900">Engineered to Eliminate Ghost Jobs</h2>
                <p className="text-xs text-gray-500">
                  Over 40% of listings on traditional aggregators are expired or fake. Here is how NicheHire guarantees 100% genuine opportunities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Direct Career Portal Scraping</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We crawl official company career pages and verified enterprise ATS systems (Greenhouse, Lever, SAP, Workday). Every apply link routes straight to the employer&apos;s verified domain.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Strict &le; 7-Day Purge Policy</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Positions older than 7 calendar days are automatically pruned from our index. You will never waste time applying to positions that were closed or filled weeks ago.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">AI Fit Scoring &amp; Direct Outreach</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Know your competitive edge with objective High / Medium / Low Apply Chances, uncover skill gaps, and access pre-filled corporate HR emails for direct outreach.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Featured Live Verified Jobs Section (Rendered Server-Side for Instant Browse & SEO) ── */}
            <div className="pt-12 text-left w-full space-y-4">
              {/* Schema.org JobPosting Structured Data */}
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@graph': INITIAL_VERIFIED_JOBS.map((j) => ({
                      '@type': 'JobPosting',
                      title: j.title,
                      description: j.description,
                      datePosted: new Date(j.postedAt || Date.now() - 86400000).toISOString(),
                      validThrough: new Date(Date.now() + 7 * 86400000).toISOString(),
                      employmentType: 'FULL_TIME',
                      hiringOrganization: {
                        '@type': 'Organization',
                        name: j.company,
                        sameAs: j.url,
                      },
                      jobLocation: {
                        '@type': 'Place',
                        address: {
                          '@type': 'PostalAddress',
                          addressLocality: j.location,
                          addressCountry: 'IN',
                        },
                      },
                      applicantLocationRequirements: {
                        '@type': 'Country',
                        name: 'India',
                      },
                      jobLocationType: j.workMode === 'Remote' ? 'TELECOMMUTE' : undefined,
                    })),
                  }),
                }}
              />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-200">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
                    <span>🔥</span> Today&apos;s Live Verified Postings
                  </div>
                  <h2 className="text-xl font-black text-gray-900">
                    Direct from Official Company Portals (&le; 7 Days Old)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Verified authentic openings from Yash Technologies, Bellurbis, Stripe, Vercel, InMobi & 30+ enterprise feeds.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                    {INITIAL_VERIFIED_JOBS.length} Verified Roles
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                {INITIAL_VERIFIED_JOBS.map((job) => (
                  <JobCardItem
                    key={job.id}
                    job={job}
                    rec={calculateRecommendation(job)}
                    isSaved={savedJobIds.includes(job.id)}
                    tailor={tailorMap[job.id]}
                    locationQuery={locationQuery}
                    onOpenDetails={openJobDetails}
                    onToggleSave={toggleSaveJob}
                    onTailorResume={handleTailorResume}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Active Search Dashboard ── */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 mb-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Job title, keywords, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">📍</span>
                <input
                  type="text"
                  placeholder="City, state, or Remote..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => fetchJobs()}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Candidate Resume Pill if Active */}
            {parsedProfile && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-emerald-950">Matching candidate:</span>
                  <span className="text-emerald-800">{parsedProfile.name} • {parsedProfile.role}</span>
                  {parsedProfile.education && <span className="text-gray-500 hidden sm:inline">({parsedProfile.education})</span>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(parsedProfile.skills || []).slice(0, 5).map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-white text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Bar (Zero Aggregator Dropdown!) */}
            <div className="flex flex-wrap gap-2.5 items-center pt-2.5 border-t border-gray-100 text-xs">
              {/* Work Mode */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Work Mode:</span>
                <select
                  value={workMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkMode(val);
                    fetchJobs(undefined, undefined, { workMode: val });
                  }}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none font-medium"
                >
                  <option>Any Mode</option>
                  <option>On-site</option>
                  <option>Hybrid</option>
                  <option>Remote</option>
                </select>
              </div>

              {/* Posted Time */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Posted:</span>
                <select
                  value={postedTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostedTime(val);
                    fetchJobs(undefined, undefined, { postedTime: val });
                  }}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none font-medium"
                >
                  <option>Any Time</option>
                  <option>Past 6 Hours</option>
                  <option>Past 12 Hours</option>
                  <option>Past 24 Hours</option>
                  <option>Past 3 Days</option>
                  <option>Past Week</option>
                </select>
              </div>

              {/* Distance Proximity */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Distance:</span>
                <select
                  value={distance}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDistance(val);
                    fetchJobs(undefined, undefined, { distance: val });
                  }}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none font-medium"
                >
                  <option>Any Distance</option>
                  <option>Within 10 km</option>
                  <option>Within 25 km</option>
                  <option>Within 50 km</option>
                  <option>Within 100 km</option>
                </select>
              </div>

              {/* Applicants Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Applicants:</span>
                <select
                  value={applicants}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApplicants(val);
                    fetchJobs(undefined, undefined, { applicants: val });
                  }}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none font-medium"
                >
                  <option>Any Applicants</option>
                  <option>Early Bird (&lt; 10)</option>
                  <option>Under 25</option>
                  <option>Under 50</option>
                </select>
              </div>

              {/* Verified Only Toggle */}
              <button
                onClick={() => {
                  const next = !verifiedOnly;
                  setVerifiedOnly(next);
                  fetchJobs(undefined, undefined, { verifiedOnly: next });
                }}
                className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  verifiedOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <span>🛡️</span> Verified Portals Only
              </button>

              {/* Startups Toggle */}
              <button
                onClick={() => {
                  const next = !isStartupOnly;
                  setIsStartupOnly(next);
                  fetchJobs(undefined, undefined, { isStartupOnly: next });
                }}
                className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  isStartupOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <span>🚀</span> Startups
              </button>

              {/* Reset */}
              {(workMode !== 'Any Mode' || postedTime !== 'Any Time' || distance !== 'Any Distance' || applicants !== 'Any Applicants' || verifiedOnly || isStartupOnly) && (
                <button
                  onClick={() => {
                    setWorkMode('Any Mode');
                    setPostedTime('Any Time');
                    setDistance('Any Distance');
                    setApplicants('Any Applicants');
                    setVerifiedOnly(false);
                    setIsStartupOnly(false);
                    fetchJobs();
                  }}
                  className="ml-auto text-xs text-blue-600 hover:underline font-semibold"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 mb-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Results Header */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900">
                {activeTab === 'saved'
                  ? `Saved Opportunities (${filteredJobs.length})`
                  : activeTab === 'walkins'
                  ? `Walk-Ins & Offline Opportunities (${filteredWalkins.length})`
                  : `Live Verified Jobs (${filteredJobs.length})`}
              </h2>
              <button
                onClick={() => setHasSearched(false)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                ← Back to Featured
              </button>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Strictly &le; 7 days old • Deduplicated across 30+ portals & aggregators
            </span>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 border rounded-2xl shadow-2xs animate-pulse border-gray-100 bg-white">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2.5"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-1/4 mb-3"></div>
                  <div className="h-6 bg-gray-100 rounded w-24"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-white border-gray-200">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="text-base font-bold text-gray-900">No jobs match your current filters</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm">
                Try widening your filters (e.g. choose Any Time or Any Distance).
              </p>
              <button
                onClick={() => {
                  setWorkMode('Any Mode');
                  setPostedTime('Any Time');
                  setDistance('Any Distance');
                  setApplicants('Any Applicants');
                  setVerifiedOnly(false);
                  setIsStartupOnly(false);
                  fetchJobs();
                }}
                className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Job Feed */}
          {!isLoading && (
            <div className="space-y-3.5">
              {filteredJobs.map((job, idx) => (
                <JobCardItem
                  key={job.id || idx}
                  job={job}
                  rec={calculateRecommendation(job)}
                  isSaved={savedJobIds.includes(job.id)}
                  tailor={tailorMap[job.id]}
                  locationQuery={locationQuery}
                  onOpenDetails={openJobDetails}
                  onToggleSave={toggleSaveJob}
                  onTailorResume={handleTailorResume}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── LinkedIn-Style Detailed Job Drawer ── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedJob(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          ></div>

          {/* Slide-over panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider">{selectedJob.company}</span>
                  {selectedJob.isVerified && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      🛡️ Verified Genuine
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-gray-900 leading-snug">{selectedJob.title}</h2>
                <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                  <span>📍 {selectedJob.location}</span>
                  <span>•</span>
                  <span>🏢 {selectedJob.workMode}</span>
                  <span>•</span>
                  <span>⏱️ {selectedJob.postedText || formatTimeAgo(selectedJob.postedAt)}</span>
                  <span>•</span>
                  <span className="text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                    👥 {selectedJob.applicantText || (selectedJob.applicantCount ? `${selectedJob.applicantCount} applicants` : 'Early applicant')}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Primary Actions Bar */}
              <div className="flex gap-2.5 flex-wrap items-center">
                <a
                  href={selectedJob.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl text-center shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Apply on Company Portal ↗
                </a>

                <button
                  onClick={() => toggleSaveJob(selectedJob.id)}
                  className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold transition-colors"
                >
                  {savedJobIds.includes(selectedJob.id) ? '★ Saved' : '☆ Save'}
                </button>

                <button
                  onClick={() => setActiveOutreachJob(selectedJob)}
                  className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold transition-colors"
                >
                  ✉️ Email HR
                </button>

                <button
                  onClick={() => setActivePrepJob(selectedJob)}
                  className="px-4 py-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-sm font-semibold transition-colors"
                >
                  🎙️ Prep
                </button>
              </div>

              {/* Fit Analysis Box */}
              {(() => {
                const rec = calculateRecommendation(selectedJob);
                return (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/90 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        AI Candidate Fit Rating
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs rounded-full border ${rec.badgeBg}`}>
                        {rec.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700">{rec.reason}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200">
                      <div>
                        <strong className="text-gray-900">🎓 Education: </strong>
                        <span className="text-gray-600">{rec.educationMatch || 'Not specified'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-900">💼 Seniority: </strong>
                        <span className="text-gray-600">{rec.experienceMatch || 'Aligned'}</span>
                      </div>
                    </div>

                    {rec.matchedSkills.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-gray-700 block mb-1">Your Matched Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.matchedSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded text-[11px] font-medium">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.missingSkills.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-amber-800 block mb-1">Skills to Highlight in CV:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.missingSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[11px] font-medium">
                              + {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Full Description */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Full Job Description
                  </h3>
                  {selectedJob.url && selectedJob.url !== '#' && (
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      View on official portal ↗
                    </a>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-xs bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 whitespace-pre-line font-sans">
                  {selectedJob.description}
                </div>
              </div>

              {/* Key metadata */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Employment Type:</span>
                  <span className="font-semibold text-gray-800">{selectedJob.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source:</span>
                  <span className="font-semibold text-gray-800">{selectedJob.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Link Type:</span>
                  <span className="font-semibold text-emerald-700">Official Company Direct Posting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Comprehensive Platform Footer ── */}
      <footer className="mt-16 bg-white border-t border-gray-200 py-12 text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                  NH
                </div>
                <span className="font-extrabold text-lg text-gray-900 tracking-tight">NicheHire</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                The verified career platform engineered to eliminate ghost jobs. Sourced directly from official enterprise career portals and tier-1 ATS feeds under 7 days old.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-100">
                <span>🛡️</span> 100% Genuine Direct Portal Guarantee
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">For Job Seekers</h4>
              <ul className="space-y-1.5 text-gray-500">
                <li><button onClick={() => { setHasSearched(false); setActiveTab('all'); }} className="hover:text-blue-600">Browse Verified Jobs</button></li>
                <li><button onClick={() => { setHasSearched(true); setActiveTab('walkins'); }} className="hover:text-blue-600">Offline & Walk-In Openings</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-blue-600">AI Resume Matcher</button></li>
                <li><button onClick={() => setHelpModalOpen(true)} className="hover:text-blue-600">How to Apply Direct</button></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Trust & Verification</h4>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link href="/about" className="hover:text-blue-600">4-Pillar Verification Engine</Link></li>
                <li><Link href="/about" className="hover:text-blue-600">Strict &le; 7-Day Cutoff Policy</Link></li>
                <li><Link href="/about" className="hover:text-blue-600">Anti-Scam & Zero Fees Pledge</Link></li>
                <li><Link href="/about" className="hover:text-blue-600">About NicheHire</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">For Employers</h4>
              <ul className="space-y-1.5 text-gray-500">
                <li><button onClick={() => setPostJobOpen(true)} className="hover:text-blue-600 font-semibold text-blue-600">Post a Verified Job ➔</button></li>
                <li><Link href="/pricing" className="hover:text-blue-600">Employer Pricing & Plans</Link></li>
                <li><Link href="/pricing" className="hover:text-blue-600">Greenhouse & Lever ATS Sync</Link></li>
                <li><button onClick={() => setFeedbackModalOpen(true)} className="hover:text-blue-600">Recruiter Support</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
            <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-gray-600">About</Link>
              <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
              <button onClick={() => setFeedbackModalOpen(true)} className="hover:text-gray-600">Contact</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Active Modals ── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setAuthModalOpen(false);
        }}
      />

      {activeOutreachJob && (
        <EmailDraftModal
          isOpen={true}
          onClose={() => setActiveOutreachJob(null)}
          job={activeOutreachJob}
          resumeText={resumeText}
        />
      )}

      {activePrepJob && (
        <InterviewPrepModal
          isOpen={true}
          onClose={() => setActivePrepJob(null)}
          job={activePrepJob}
          resumeText={resumeText}
        />
      )}

      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      <FeedbackModal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />

      <PostWalkInModal
        isOpen={postWalkInOpen}
        onClose={() => setPostWalkInOpen(false)}
        onSuccess={() => fetchWalkins()}
      />

      <PostJobModal
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
        onSuccess={(newListing) => {
          setAllLiveJobs((prev) => [newListing, ...prev]);
        }}
      />
    </div>
  );
}