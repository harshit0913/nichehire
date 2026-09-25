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
        label: 'Upload CV for fit',
        badgeBg: 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC]',
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
        label: 'High match',
        badgeBg: 'bg-[#ECFDF5] text-[#0E9F6E] border-[#A7F3D0]',
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
        label: 'Good fit',
        badgeBg: 'bg-[#FFFBEB] text-[#D97B0A] border-[#FDE68A]',
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
        label: 'Low match',
        badgeBg: 'bg-[#FEF2F2] text-[#D9534F] border-[#FECACA]',
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
    <div className="min-h-screen bg-[#F7F8FA] text-[#12172B] font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setHasSearched(false)}>
              <div className="w-8 h-8 rounded bg-[#12172B] flex items-center justify-center text-white font-bold text-xs">
                NH
              </div>
              <span className="text-base font-bold text-[#12172B] tracking-tight">
                NicheHire
              </span>
              <span className="ml-1 px-2 py-0.5 text-[11px] font-medium text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] rounded">
                Verified Direct
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setActiveTab('all');
                setHasSearched(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'all' && !hasSearched
                  ? 'bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC]'
                  : 'text-[#5B6478] hover:text-[#12172B]'
              }`}
            >
              All Jobs
            </button>

            <button
              onClick={() => {
                setActiveTab('saved');
                setHasSearched(true);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-[#FFFBEB] text-[#D97B0A] border border-[#FDE68A]'
                  : 'text-[#5B6478] hover:text-[#12172B]'
              }`}
            >
              <span>★</span> Saved
              {savedJobIds.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-semibold bg-[#FFFBEB] text-[#D97B0A] rounded border border-[#FDE68A]">
                  {savedJobIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('walkins');
                setHasSearched(true);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'walkins'
                  ? 'bg-[#12172B] text-white'
                  : 'text-[#5B6478] hover:text-[#12172B]'
              }`}
            >
              <span>🚶</span> Walk-Ins
              {walkins.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-semibold bg-[#F7F8FA] text-[#12172B] rounded border border-[#E4E7EC]">
                  {walkins.length}
                </span>
              )}
            </button>

            <a
              href="#how-it-works"
              onClick={() => {
                if (hasSearched) setHasSearched(false);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#12172B] rounded transition-colors hidden lg:inline"
            >
              How It Works
            </a>

            <Link
              href="/pricing"
              className="px-2.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#12172B] rounded transition-colors hidden md:inline"
            >
              Pricing
            </Link>

            <button
              onClick={() => setPostJobOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded transition-colors hidden sm:flex items-center gap-1.5"
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
              className="px-3 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 hover:bg-[#2B4EE6]/10 border border-[#2B4EE6]/20 rounded transition-colors flex items-center gap-1"
            >
              <span>+</span> Walk-In
            </button>

            <button
              onClick={() => setHelpModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#12172B] rounded transition-colors hidden xl:inline"
            >
              Help
            </button>

            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#12172B] rounded transition-colors hidden xl:inline"
            >
              Feedback
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5B6478] hidden md:inline">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-medium text-[#12172B] bg-[#F7F8FA] hover:bg-[#E4E7EC] border border-[#E4E7EC] rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Initial Discovery State ("What are you looking for?") ── */}
      {!hasSearched && (
        <section className="min-h-[75vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16 bg-[#F7F8FA]">
          <div className="max-w-4xl w-full text-center space-y-6">
            {/* Top Verified Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] text-xs text-[#5B6478]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
              <span>Direct from 35+ verified tech company portals</span>
            </div>

            {/* Main Editorial Headline (Inter + Newsreader serif) */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal text-[#12172B] tracking-tight leading-tight">
              Verified tech opportunities. <br />
              <span className="font-serif italic text-[#12172B]">Direct from company career portals.</span>
            </h1>

            {/* Sentence-case subhead */}
            <p className="text-sm sm:text-base text-[#5B6478] max-w-2xl mx-auto leading-relaxed">
              Sourced straight from official corporate career sites (Yash Technologies, Bellurbis, Stripe, Vercel). Strictly <strong className="text-[#12172B] font-semibold">under 7 days old</strong> with automated AI fit scoring. Never recruiter spam or ghost listings.
            </p>

            {/* Social Proof & Live Metrics Bar */}
            <div className="pt-1 pb-1 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-[#5B6478]">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full bg-white border border-[#E4E7EC]">
                <span className="flex items-center gap-1.5 font-medium text-[#12172B]">
                  <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
                  1,240 verified roles this week
                </span>
                <span className="text-[#E4E7EC]">•</span>
                <span>48 added today</span>
                <span className="text-[#E4E7EC] hidden sm:inline">•</span>
                <span className="hidden sm:inline">≤ 7 days max age</span>
                <span className="text-[#E4E7EC] hidden md:inline">•</span>
                <span className="hidden md:inline">100% direct portals</span>
              </div>
            </div>

            {/* Company Portals Sourced (Marquee) */}
            <div className="pt-1">
              <span className="text-xs text-[#5B6478] block mb-2 font-normal">
                Official corporate portals sourced daily:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#12172B]">
                {['Yash Technologies', 'Stripe', 'Vercel', 'Bellurbis', 'InfoBeans', 'Groww', 'InMobi', 'Postman', 'CRED', 'Kimirica'].map((co) => (
                  <span
                    key={co}
                    className="px-2.5 py-1 bg-white border border-[#E4E7EC] rounded text-[#12172B] text-xs font-medium hover:border-[#12172B]/30 transition-colors"
                  >
                    {co}
                  </span>
                ))}
              </div>
            </div>

            {/* Candidate Testimonial */}
            <div className="inline-flex items-center gap-2.5 p-3 bg-white border border-[#E4E7EC] rounded-md text-xs text-[#5B6478] max-w-xl mx-auto text-left">
              <span className="text-sm text-[#0E9F6E] shrink-0">✓</span>
              <p className="text-xs leading-relaxed">
                “Skipped weeks of aggregator ghosting. Applied direct to Yash Tech via NicheHire and interviewed within 48 hours.” <span className="font-semibold text-[#12172B]">— Senior Engineer, Indore</span>
              </p>
            </div>

            {/* Mode Switcher & Interaction Card (Spend Boldness Once) */}
            <div className="bg-white p-4 sm:p-6 rounded-md border border-[#E4E7EC] text-left space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded border border-[#E4E7EC] text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDiscoveryTab('search')}
                    className={`px-3.5 py-1.5 rounded transition-colors ${
                      discoveryTab === 'search'
                        ? 'bg-white text-[#12172B] font-semibold border border-[#E4E7EC]'
                        : 'text-[#5B6478] hover:text-[#12172B]'
                    }`}
                  >
                    Search verified jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscoveryTab('resume')}
                    className={`px-3.5 py-1.5 rounded transition-colors ${
                      discoveryTab === 'resume'
                        ? 'bg-[#12172B] text-white font-semibold'
                        : 'text-[#5B6478] hover:text-[#12172B]'
                    }`}
                  >
                    Instant AI resume match
                  </button>
                </div>

                <div className="text-xs text-[#5B6478] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
                  <span>Live crawlers active across 35+ career sites</span>
                </div>
              </div>

              {/* Mode 1: Search by Role & Location */}
              {discoveryTab === 'search' && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-2.5 text-[#5B6478] text-sm">🔍</span>
                      <input
                        type="text"
                        placeholder="Job title, technical skill, or role (e.g. React, Java, DevOps)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-2.5 text-[#5B6478] text-sm">📍</span>
                      <input
                        type="text"
                        placeholder="Location (e.g. Indore, Bangalore, or Remote)..."
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <button
                      onClick={() => fetchJobs()}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-sm rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? 'Searching...' : 'Search Verified Jobs'}
                    </button>
                  </div>

                  {/* Surface Core Filters on Landing View */}
                  <div className="pt-2 border-t border-[#E4E7EC] flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[#5B6478] text-[11px] font-medium mr-1">
                      Quick filters:
                    </span>

                    {/* Work Mode Filter */}
                    <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded border border-[#E4E7EC]">
                      {['Any Mode', 'Remote', 'Hybrid', 'On-site'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWorkMode(m)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            workMode === m
                              ? 'bg-[#12172B] text-white'
                              : 'text-[#5B6478] hover:text-[#12172B]'
                          }`}
                        >
                          {m === 'Remote' ? 'Remote' : m === 'Hybrid' ? 'Hybrid' : m === 'On-site' ? 'On-site' : 'All Modes'}
                        </button>
                      ))}
                    </div>

                    {/* Freshness Filter */}
                    <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded border border-[#E4E7EC]">
                      {['Any Time', 'Past 24 Hours', 'Past 3 Days', 'Past Week'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPostedTime(t)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            postedTime === t
                              ? 'bg-[#12172B] text-white'
                              : 'text-[#5B6478] hover:text-[#12172B]'
                          }`}
                        >
                          {t === 'Past 24 Hours' ? '< 24h' : t === 'Past 3 Days' ? '< 3d' : t === 'Past Week' ? '< 7d' : 'Any Age'}
                        </button>
                      ))}
                    </div>

                    {/* Verified Only Toggle */}
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`px-2.5 py-1 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        verifiedOnly
                          ? 'bg-[#ECFDF5] text-[#0E9F6E] border-[#A7F3D0]'
                          : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
                      }`}
                    >
                      <span>🛡️</span> Direct Portals Only
                    </button>
                  </div>

                  {/* Trending Role Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[#5B6478] text-[11px] font-medium mr-1">Trending roles:</span>
                    {TRENDING_ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSearchQuery(r);
                          fetchJobs(r);
                        }}
                        className="px-2.5 py-1 bg-[#F7F8FA] hover:bg-white text-[#5B6478] hover:text-[#12172B] border border-[#E4E7EC] rounded text-[11px] font-medium transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Popular Locations */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[#5B6478] text-[11px] font-medium mr-1">Locations:</span>
                    {POPULAR_LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocationQuery(loc);
                          fetchJobs(undefined, loc);
                        }}
                        className="px-2.5 py-1 bg-[#F7F8FA] hover:bg-white text-[#5B6478] hover:text-[#12172B] border border-[#E4E7EC] rounded text-[11px] font-medium transition-colors"
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
                    className={`p-6 sm:p-8 rounded border border-dashed transition-colors cursor-pointer text-center ${
                      isDragging ? 'border-[#2B4EE6] bg-[#2B4EE6]/5' : 'border-[#E4E7EC] bg-[#F7F8FA] hover:border-[#2B4EE6] hover:bg-white'
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

                    <div className="w-12 h-12 rounded bg-white border border-[#E4E7EC] text-[#2B4EE6] flex items-center justify-center text-xl mx-auto mb-3">
                      📄
                    </div>

                    <h3 className="text-base font-semibold text-[#12172B]">
                      {isParsing ? 'Analyzing your technical skills with AI…' : 'Drop your resume (PDF or DOCX)'}
                    </h3>
                    <p className="text-xs text-[#5B6478] max-w-md mx-auto mt-1 leading-relaxed">
                      Our system extracts your skills and experience to calculate instant <strong className="text-[#12172B]">High / Medium / Low Apply Chances</strong> against active verified openings.
                    </p>

                    <div className="pt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-medium text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors"
                      >
                        {isParsing ? 'Analyzing…' : 'Select resume file'}
                      </button>
                    </div>
                  </div>

                  {/* Active Profile Pill if parsed */}
                  {parsedProfile && (
                    <div className="p-3.5 bg-white border border-[#0E9F6E]/40 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-[#12172B] flex items-center gap-1.5">
                          <span className="text-[#0E9F6E]">✓</span> Profile analyzed: {parsedProfile.role || 'Software Engineer'} ({parsedProfile.experienceLevel || 'Mid-Level'})
                        </div>
                        <div className="text-[11px] text-[#5B6478] mt-0.5">
                          {parsedProfile.skills?.slice(0, 6).join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => fetchJobs(parsedProfile.role, parsedProfile.location)}
                        className="px-3.5 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors shrink-0"
                      >
                        View matched openings ➔
                      </button>
                    </div>
                  )}

                  {/* Privacy Guarantee Trust Note */}
                  <div className="p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded flex items-start gap-2.5 text-xs text-[#5B6478]">
                    <span className="text-sm text-[#0E9F6E]">🔒</span>
                    <div>
                      <strong className="text-[#12172B]">100% In-memory privacy guarantee:</strong> Your resume text is parsed temporarily to calculate match scores and search parameters. We never store, sell, or broadcast your personal data to external recruiters.
                    </div>
                  </div>

                  {/* Apply Chances Methodology Explainer */}
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded flex items-start gap-2.5 text-xs text-[#5B6478]">
                    <span className="text-sm text-[#2B4EE6]">ℹ️</span>
                    <div>
                      <strong className="text-[#12172B]">How Apply Chances scoring works:</strong> We evaluate technical skill overlap (50%), experience alignment (25%), education (20%), and portfolio relevance (5%):
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span> High Match (65%+)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#D97B0A] border border-[#FDE68A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97B0A]"></span> Good Fit (40-64%)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#D9534F] border border-[#FECACA]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]"></span> Low Match (&lt; 40%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── How It Works / Why NicheHire Section ── */}
            <div id="how-it-works" className="pt-8 pb-2 text-left w-full space-y-4">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <span className="text-xs font-medium text-[#5B6478]">Why NicheHire</span>
                <h2 className="text-2xl font-semibold text-[#12172B]">Engineered to eliminate ghost jobs</h2>
                <p className="text-xs text-[#5B6478]">
                  Over 40% of listings on traditional aggregators are expired or fake. Here is how NicheHire guarantees 100% genuine opportunities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-5 bg-white rounded-md border border-[#E4E7EC] space-y-2">
                  <div className="w-7 h-7 rounded bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">Direct career portal scraping</h3>
                  <p className="text-xs text-[#5B6478] leading-relaxed">
                    We crawl official company career pages and verified enterprise ATS systems (Greenhouse, Lever, SAP, Workday). Every apply link routes straight to the employer&apos;s verified domain.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-md border border-[#E4E7EC] space-y-2">
                  <div className="w-7 h-7 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#0E9F6E] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">Strict &le; 7-day purge policy</h3>
                  <p className="text-xs text-[#5B6478] leading-relaxed">
                    Positions older than 7 calendar days are automatically pruned from our index. You will never waste time applying to positions that were closed or filled weeks ago.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-md border border-[#E4E7EC] space-y-2">
                  <div className="w-7 h-7 rounded bg-[#F7F8FA] border border-[#E4E7EC] text-[#2B4EE6] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">AI fit scoring &amp; direct outreach</h3>
                  <p className="text-xs text-[#5B6478] leading-relaxed">
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

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#E4E7EC]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] mb-1">
                    <span>✓</span> Today&apos;s live verified openings
                  </div>
                  <h2 className="text-lg font-semibold text-[#12172B]">
                    Direct from official company portals (≤ 7 days old)
                  </h2>
                  <p className="text-xs text-[#5B6478]">
                    Verified authentic roles from Yash Technologies, Bellurbis, Stripe, Vercel, InMobi &amp; 30+ enterprise feeds.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#12172B] bg-[#F7F8FA] px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {INITIAL_VERIFIED_JOBS.length} Verified Roles
                  </span>
                </div>
              </div>

              <div className="space-y-3">
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
          <div className="bg-white p-4 rounded-md border border-[#E4E7EC] mb-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-2.5 text-[#5B6478] text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Job title, keywords, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                  className="w-full pl-9 pr-4 py-2 border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                />
              </div>

              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-2.5 text-[#5B6478] text-sm">📍</span>
                <input
                  type="text"
                  placeholder="City, state, or Remote..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                  className="w-full pl-9 pr-4 py-2 border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                />
              </div>

              <button
                onClick={() => fetchJobs()}
                disabled={isLoading}
                className="px-5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-sm font-medium rounded disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Candidate Resume Pill if Active */}
            {parsedProfile && (
              <div className="p-3 bg-white border border-[#0E9F6E]/40 rounded flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
                  <span className="font-semibold text-[#12172B]">Matching candidate:</span>
                  <span className="text-[#5B6478]">{parsedProfile.name} • {parsedProfile.role}</span>
                  {parsedProfile.education && <span className="text-[#5B6478] hidden sm:inline">({parsedProfile.education})</span>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(parsedProfile.skills || []).slice(0, 5).map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC] rounded text-[10px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Bar (Zero Aggregator Dropdown!) */}
            <div className="flex flex-wrap gap-2.5 items-center pt-2.5 border-t border-[#E4E7EC] text-xs">
              {/* Work Mode */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#5B6478] font-medium">Work mode:</span>
                <select
                  value={workMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkMode(val);
                    fetchJobs(undefined, undefined, { workMode: val });
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-[#12172B] focus:outline-none font-medium"
                >
                  <option>Any Mode</option>
                  <option>On-site</option>
                  <option>Hybrid</option>
                  <option>Remote</option>
                </select>
              </div>

              {/* Posted Time */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#5B6478] font-medium">Posted:</span>
                <select
                  value={postedTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostedTime(val);
                    fetchJobs(undefined, undefined, { postedTime: val });
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-[#12172B] focus:outline-none font-medium"
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
                <span className="text-[#5B6478] font-medium">Distance:</span>
                <select
                  value={distance}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDistance(val);
                    fetchJobs(undefined, undefined, { distance: val });
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-[#12172B] focus:outline-none font-medium"
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
                <span className="text-[#5B6478] font-medium">Applicants:</span>
                <select
                  value={applicants}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApplicants(val);
                    fetchJobs(undefined, undefined, { applicants: val });
                  }}
                  className="px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-[#12172B] focus:outline-none font-medium"
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
                className={`px-2.5 py-1.5 rounded border text-xs font-medium flex items-center gap-1 transition-colors ${
                  verifiedOnly ? 'bg-[#ECFDF5] text-[#0E9F6E] border-[#A7F3D0]' : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
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
                className={`px-2.5 py-1.5 rounded border text-xs font-medium flex items-center gap-1 transition-colors ${
                  isStartupOnly ? 'bg-[#12172B] text-white' : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
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
                  className="ml-auto text-xs text-[#2B4EE6] hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 mb-6 text-xs text-[#D97B0A] bg-[#FFFBEB] border border-[#FDE68A] rounded">
              {errorMsg}
            </div>
          )}

          {/* Results Header */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-[#12172B]">
                {activeTab === 'saved'
                  ? `Saved Opportunities (${filteredJobs.length})`
                  : activeTab === 'walkins'
                  ? `Walk-Ins & Offline Opportunities (${filteredWalkins.length})`
                  : `Live Verified Jobs (${filteredJobs.length})`}
              </h2>
              <button
                onClick={() => setHasSearched(false)}
                className="text-xs text-[#2B4EE6] hover:underline font-medium flex items-center gap-1"
              >
                ← Back to Featured
              </button>
            </div>
            <span className="text-xs text-[#5B6478]">
              Strictly ≤ 7 days old • Direct corporate portals only
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
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-md bg-white border-[#E4E7EC]">
              {activeTab === 'saved' ? (
                <>
                  <div className="w-10 h-10 rounded bg-[#FFFBEB] text-[#D97B0A] flex items-center justify-center text-base mb-2 border border-[#FDE68A]">
                    ★
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">No saved jobs yet</h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-sm">
                    Save jobs to compare them here → Click the star icon (☆) on any verified role to add it to your shortlist.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      setHasSearched(false);
                    }}
                    className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/20 rounded hover:bg-[#2B4EE6]/10 transition-colors"
                  >
                    Browse verified jobs
                  </button>
                </>
              ) : activeTab === 'walkins' ? (
                <>
                  <div className="w-10 h-10 rounded bg-[#F7F8FA] text-[#12172B] flex items-center justify-center text-base mb-2 border border-[#E4E7EC]">
                    🚶
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">No walk-in drives found</h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-sm">
                    There are no offline walk-in hiring drives matching your current location or role search.
                  </p>
                  <button
                    onClick={() => setPostWalkInOpen(true)}
                    className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/20 rounded hover:bg-[#2B4EE6]/10 transition-colors"
                  >
                    + Post a walk-in drive
                  </button>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-2 text-[#5B6478]">🔍</div>
                  <h3 className="text-sm font-semibold text-[#12172B]">No jobs match your current filters</h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-sm">
                    Try widening your filters (e.g. choose Any Age or All Modes).
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
                    className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/20 rounded hover:bg-[#2B4EE6]/10 transition-colors"
                  >
                    Reset all filters
                  </button>
                </>
              )}
            </div>
          )}

          {/* Job Feed */}
          {!isLoading && (
            <div className="space-y-3">
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
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto border-l border-[#E4E7EC]">
            {/* Header */}
            <div className="p-5 border-b border-[#E4E7EC] sticky top-0 bg-white z-20 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold text-[#12172B] text-xs">{selectedJob.company}</span>
                  {selectedJob.isVerified && (
                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] inline-flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#0E9F6E]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      Verified Direct
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-[#12172B] leading-snug">{selectedJob.title}</h2>
                <p className="text-xs text-[#5B6478] mt-1 flex flex-wrap items-center gap-1.5">
                  <span>📍 {selectedJob.location}</span>
                  <span className="text-[#E4E7EC]">•</span>
                  <span>{selectedJob.workMode}</span>
                  <span className="text-[#E4E7EC]">•</span>
                  <span>{selectedJob.postedText || formatTimeAgo(selectedJob.postedAt)}</span>
                  <span className="text-[#E4E7EC]">•</span>
                  <span>{selectedJob.applicantText || (selectedJob.applicantCount ? `${selectedJob.applicantCount} applicants` : 'Early applicant')}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] flex items-center justify-center text-[#5B6478] hover:text-[#12172B] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 flex-1">
              {/* Primary Actions Bar */}
              <div className="flex gap-2 flex-wrap items-center">
                <a
                  href={selectedJob.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  Apply on company portal ↗
                </a>

                <button
                  onClick={() => toggleSaveJob(selectedJob.id)}
                  className={`px-3 py-2 rounded border text-xs font-medium transition-colors ${
                    savedJobIds.includes(selectedJob.id)
                      ? 'bg-[#FFFBEB] text-[#D97B0A] border-[#FDE68A]'
                      : 'border-[#E4E7EC] hover:bg-[#F7F8FA] text-[#12172B]'
                  }`}
                >
                  {savedJobIds.includes(selectedJob.id) ? '★ Saved' : '☆ Save'}
                </button>

                <button
                  onClick={() => setActiveOutreachJob(selectedJob)}
                  className="px-3 py-2 rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] text-xs font-medium text-[#12172B] transition-colors"
                >
                  ✉️ Email HR
                </button>

                <button
                  onClick={() => setActivePrepJob(selectedJob)}
                  className="px-3 py-2 rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] text-xs font-medium text-[#12172B] transition-colors"
                >
                  🎙️ Prep
                </button>
              </div>

              {/* Fit Analysis Box */}
              {(() => {
                const rec = calculateRecommendation(selectedJob);
                return (
                  <div className="p-4 bg-white rounded border border-[#E4E7EC] space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[#12172B]">
                        AI candidate fit analysis
                      </span>
                      {rec.tier === 'high' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span> High match ({rec.score}%)
                        </span>
                      )}
                      {rec.tier === 'medium' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#D97B0A] border border-[#FDE68A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97B0A]"></span> Good fit ({rec.score}%)
                        </span>
                      )}
                      {rec.tier === 'low' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#D9534F] border border-[#FECACA]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]"></span> Low match ({rec.score}%)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#5B6478]">{rec.reason}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E4E7EC]">
                      <div>
                        <strong className="text-[#12172B]">Education: </strong>
                        <span className="text-[#5B6478]">{rec.educationMatch || 'Not specified'}</span>
                      </div>
                      <div>
                        <strong className="text-[#12172B]">Seniority: </strong>
                        <span className="text-[#5B6478]">{rec.experienceMatch || 'Aligned'}</span>
                      </div>
                    </div>

                    {rec.matchedSkills.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-medium text-[#12172B] block mb-1">Your matched skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.matchedSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] rounded text-[11px] font-medium">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.missingSkills.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-medium text-[#D97B0A] block mb-1">Skills to highlight in resume:</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.missingSkills.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-[#FFFBEB] text-[#D97B0A] border border-[#FDE68A] rounded text-[11px] font-medium">
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
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-[#12172B]">
                    Full job description
                  </h3>
                  {selectedJob.url && selectedJob.url !== '#' && (
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#2B4EE6] hover:underline font-medium flex items-center gap-1"
                    >
                      View on official portal ↗
                    </a>
                  )}
                </div>
                <div className="prose max-w-none text-[#12172B] leading-relaxed text-xs bg-[#F7F8FA] p-4 rounded border border-[#E4E7EC] whitespace-pre-line font-sans">
                  {selectedJob.description}
                </div>
              </div>

              {/* Key metadata */}
              <div className="p-4 bg-white border border-[#E4E7EC] rounded space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5B6478]">Employment type:</span>
                  <span className="font-medium text-[#12172B]">{selectedJob.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6478]">Source:</span>
                  <span className="font-medium text-[#12172B]">{selectedJob.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6478]">Link type:</span>
                  <span className="font-medium text-[#0E9F6E]">Official Company Direct Posting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Comprehensive Platform Footer ── */}
      <footer className="mt-16 bg-white border-t border-[#E4E7EC] py-12 text-xs text-[#5B6478]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#12172B] flex items-center justify-center text-white font-bold text-xs">
                  NH
                </div>
                <span className="font-bold text-base text-[#12172B] tracking-tight">NicheHire</span>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                The verified career platform engineered to eliminate ghost jobs. Sourced directly from official enterprise career portals and tier-1 ATS feeds under 7 days old.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ECFDF5] text-[#0E9F6E] text-[11px] font-medium border border-[#A7F3D0]">
                <span>✓</span> 100% Genuine Direct Portal Guarantee
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">For job seekers</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><button onClick={() => { setHasSearched(false); setActiveTab('all'); }} className="hover:text-[#2B4EE6]">Browse verified jobs</button></li>
                <li><button onClick={() => { setHasSearched(true); setActiveTab('walkins'); }} className="hover:text-[#2B4EE6]">Offline &amp; walk-in openings</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[#2B4EE6]">AI resume matcher</button></li>
                <li><button onClick={() => setHelpModalOpen(true)} className="hover:text-[#2B4EE6]">How to apply direct</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">Trust &amp; verification</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><Link href="/about" className="hover:text-[#2B4EE6]">4-Pillar verification engine</Link></li>
                <li><Link href="/about" className="hover:text-[#2B4EE6]">Strict ≤ 7-day cutoff policy</Link></li>
                <li><Link href="/about" className="hover:text-[#2B4EE6]">Anti-scam &amp; zero fees pledge</Link></li>
                <li><Link href="/about" className="hover:text-[#2B4EE6]">About NicheHire</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">For employers</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><button onClick={() => setPostJobOpen(true)} className="hover:underline font-medium text-[#2B4EE6]">Post a verified role ➔</button></li>
                <li><Link href="/pricing" className="hover:text-[#2B4EE6]">Employer pricing &amp; plans</Link></li>
                <li><Link href="/pricing" className="hover:text-[#2B4EE6]">Greenhouse &amp; Lever sync</Link></li>
                <li><button onClick={() => setFeedbackModalOpen(true)} className="hover:text-[#2B4EE6]">Recruiter support</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#5B6478]">
            <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-[#12172B]">About</Link>
              <Link href="/pricing" className="hover:text-[#12172B]">Pricing</Link>
              <button onClick={() => setFeedbackModalOpen(true)} className="hover:text-[#12172B]">Contact</button>
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