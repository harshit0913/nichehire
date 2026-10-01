'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { SignInButton, SignUpButton, UserButton, useUser, useClerk, useAuth } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';
import { isFounderEmail } from './lib/authResolver';
import AuthModal from './components/AuthModal';
import EmailDraftModal from './components/EmailDraftModal';
import InterviewPrepModal from './components/InterviewPrepModal';
import HelpModal from './components/HelpModal';
import FeedbackModal from './components/FeedbackModal';
import PostWalkInModal from './components/PostWalkInModal';
import PostJobModal from './components/PostJobModal';
import UserTierBadge from './components/UserTierBadge';
import PremiumUnlockModal from './components/PremiumUnlockModal';
import CareerGuidanceModal from './components/CareerGuidanceModal';
import ResumeBuilderModal from './components/ResumeBuilderModal';
import UsageMeterPill from './components/UsageMeterPill';
import JobCardItem, { Job, FitRecommendation, TailorState } from './components/JobCardItem';
import CandidateSideDrawer from './components/CandidateSideDrawer';
import ProfileEditModal, { CandidateProfileData } from './components/ProfileEditModal';
import WebsiteTour from './components/WebsiteTour';
import { INITIAL_VERIFIED_JOBS } from './data/initialVerifiedJobs';
import { supabase } from './supabase';
import type { WalkInJob } from './api/walkins/route';
import { matchCoordinatesToRegion, LocationMatch } from './lib/indianGeoBounds';
import { resolvePanIndiaLocation } from './lib/panIndiaGeo';
import { suggestRelevantMissingSkills, evaluateDegreeAlignment } from './lib/skillsTaxonomy';
import { getCandidateSession, clearCandidateSession, enforceSessionExpiry } from './lib/authSession';
import { normalizeSearchInput, doesJobMatchQuery } from './lib/searchRankingEngine';
import { detectGovtCrossPortalSuggestion } from './lib/govtCrossPortal';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  Briefcase,
  Building2,
  Check,
  Compass,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  Footprints,
  HelpCircle,
  Info,
  Landmark,
  LocateFixed,
  Lock,
  Mail,
  Menu,
  Mic,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from './components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from './lib/iconRules';

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
  const { isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const { getToken: getClerkToken } = useAuth();
  const { openSignIn } = useClerk();

  // Modals state
  const [activeOutreachJob, setActiveOutreachJob] = useState<Job | null>(null);
  const [activePrepJob, setActivePrepJob] = useState<Job | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [postWalkInOpen, setPostWalkInOpen] = useState(false);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [careerGuidanceOpen, setCareerGuidanceOpen] = useState(false);
  const [resumeBuilderOpen, setResumeBuilderOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Candidate Side Drawer, Profile & Website Tour States
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileData | null>(null);
  const [isWalkInsInSearchOpen, setIsWalkInsInSearchOpen] = useState(false);

  // Access & Quota Status
  const [accessStatus, setAccessStatus] = useState<any>({
    level: 'member',
    quotaBypass: false,
    badge: 'none',
    remainingQuotas: { tailoredResumes: 11, hrEmailDrafts: 20 },
    referralCount: 0,
  });

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
  const [govtSuggestion, setGovtSuggestion] = useState<any | null>(null);

  // Pagination State (Limit 30 jobs initially with next page navigation)
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 30;

  // User Location Detection State & Dynamic Company Suggestions
  const [userLocationMatch, setUserLocationMatch] = useState<LocationMatch | null>(null);
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);
  const [locationToast, setLocationToast] = useState('');

  const detectCurrentLocation = async () => {
    setIsDetectingLoc(true);
    setLocationToast('');

    const applyDetectedLocation = (name: string, matchObj?: LocationMatch | null) => {
      if (matchObj) {
        setUserLocationMatch(matchObj);
      }
      setLocationQuery(name);
      setLocationToast(`✓ Location detected: ${name}`);
      setTimeout(() => setLocationToast(''), 5000);
      // Immediately search jobs in this location for maximum responsiveness
      fetchJobs(undefined, name);
    };

    const fallbackToIpGeo = async () => {
      try {
        const res = await fetch('/api/geo/detect');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.state && data.state !== 'All India') {
            const locName = data.city
              ? (data.state && data.city !== data.state ? `${data.city}, ${data.state}` : data.city)
              : (data.district && data.district !== 'All Districts' ? `${data.district}, ${data.state}` : data.state);
            applyDetectedLocation(locName, {
              state: data.state,
              district: data.district || data.city || 'All Districts',
              isBorderZone: false,
              confidence: 'provisional',
            });
            return true;
          }
        }
      } catch (e) {
        console.warn('IP geo fallback error:', e);
      }
      return false;
    };

    // If browser does not have geolocation at all
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const ok = await fallbackToIpGeo();
      setIsDetectingLoc(false);
      if (!ok) {
        setLocationToast('Could not detect location. Please type your city or choose below.');
        setTimeout(() => setLocationToast(''), 4000);
      }
      return;
    }

    // Try HTML5 browser geolocation first
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const match = matchCoordinatesToRegion(pos.coords.latitude, pos.coords.longitude);
        if (match && match.state && match.state !== 'All India') {
          setIsDetectingLoc(false);
          const detectedName = match.district && match.district !== 'All Districts'
            ? `${match.district}, ${match.state}`
            : match.state;
          applyDetectedLocation(detectedName, match);
        } else {
          // Centroid match defaulted to All India, fall back to IP lookup
          const ok = await fallbackToIpGeo();
          setIsDetectingLoc(false);
          if (!ok) {
            setLocationToast('Could not pinpoint exact region. Please type your city.');
            setTimeout(() => setLocationToast(''), 4000);
          }
        }
      },
      async () => {
        // HTML5 Geolocation failed (e.g. desktop LAN, permission dismissed, timeout)
        // Silently fallback to IP Geolocation without showing an error to user
        const ok = await fallbackToIpGeo();
        setIsDetectingLoc(false);
        if (!ok) {
          setLocationToast('Could not auto-detect location. Please type your city or choose below.');
          setTimeout(() => setLocationToast(''), 4000);
        }
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  };

  const getSuggestedCompanies = (loc: string) => {
    const l = loc.toLowerCase().trim();
    if (!l) {
      return ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tata Group', 'Adobe', 'Flipkart'];
    }
    const resolved = resolvePanIndiaLocation(l);
    return resolved.suggestedEmployers && resolved.suggestedEmployers.length > 0
      ? resolved.suggestedEmployers
      : ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Tata Group', 'Adobe', 'Flipkart'];
  };

  // Per-job tailoring state
  const [tailorMap, setTailorMap] = useState<Record<string, TailorState>>({});
  const [copiedTailorJobId, setCopiedTailorJobId] = useState<string | null>(null);

  // ─── Auth Lifecycle & Saved Jobs ───────────────────────────────────────────

  const fetchAccessStatus = async (token?: string, emailHint?: string, userIdHint?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (emailHint) headers['x-user-email'] = emailHint;
      if (userIdHint) headers['x-user-id'] = userIdHint;
      const res = await fetch('/api/user/access-status', { headers });
      if (res.ok) {
        const data = await res.json();
        setAccessStatus(data);
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    // Capture referral query parameter from URL (e.g. ?ref=REF-123456 or ?r=REF-123456)
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref') || params.get('r');
        if (refParam) {
          localStorage.setItem('nichehire_referral_code', refParam.trim().toUpperCase());
        }
      }
    } catch {
      // Ignore
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        if (session?.access_token) {
          fetchAccessStatus(session.access_token, session.user.email);
        }
        loadCandidateData(session.user.id);
      } else {
        const candidateSession = getCandidateSession();
        if (candidateSession?.user) {
          setUser(candidateSession.user);
          if (candidateSession.sessionToken) {
            fetchAccessStatus(candidateSession.sessionToken, candidateSession.user.email, candidateSession.user.id);
          }
          loadCandidateData(candidateSession.user.id);
        } else {
          setUser(null);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (session?.access_token) {
          fetchAccessStatus(session.access_token, session.user.email);
        }
        loadCandidateData(session.user.id);
      }
    });

    // Enforce 2.5-hour auto-logout interval & tab-focus check
    const checkExpiry = () => {
      const expired = enforceSessionExpiry();
      if (expired) {
        handleSignOut();
      }
    };
    const expiryInterval = setInterval(checkExpiry, 60000); // Check every minute
    window.addEventListener('focus', checkExpiry);

    // Load walk-ins count silently in background
    fetchWalkins();

    return () => {
      clearInterval(expiryInterval);
      window.removeEventListener('focus', checkExpiry);
      subscription.unsubscribe();
    };
  }, []);

  // Sync Clerk authenticated user into local user profile state and fetch live access status
  useEffect(() => {
    async function syncClerkUser() {
      if (isClerkSignedIn && clerkUser) {
        const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
        const mappedUser = {
          id: clerkUser.id,
          email,
          user_metadata: {
            full_name: clerkUser.fullName || clerkUser.firstName || 'Candidate',
          },
        };
        setUser(mappedUser);
        loadCandidateData(clerkUser.id);

        // Instant optimistic unlock if account matches Founder
        if (isFounderEmail(email)) {
          setAccessStatus((prev: any) => ({
            ...prev,
            isFounder: true,
            level: 'unlimited',
            quotaBypass: true,
            badge: 'founder',
            referralCode: 'FOUNDER',
            assignedRole: 'Founder & CEO',
          }));
        }

        try {
          const token = await getClerkToken();
          await fetchAccessStatus(token || undefined, email, clerkUser.id);
        } catch {
          await fetchAccessStatus(undefined, email, clerkUser.id);
        }
      }
    }
    syncClerkUser();
  }, [isClerkSignedIn, clerkUser]);

  const loadCandidateData = (userId?: string) => {
    try {
      const savedKey = userId ? `nichehire_saved_jobs_${userId}` : 'nichehire_saved_jobs_guest';
      const saved = localStorage.getItem(savedKey) || localStorage.getItem('nichehire_saved_jobs');
      if (saved) setSavedJobIds(JSON.parse(saved));
      else setSavedJobIds([]);

      const profKey = userId ? `nichehire_candidate_profile_${userId}` : 'nichehire_candidate_profile_guest';
      const profData = localStorage.getItem(profKey);
      if (profData) setCandidateProfile(JSON.parse(profData));

      // Tour check for new user
      const tourKey = `nichehire_tour_completed_${userId || 'guest'}`;
      if (!localStorage.getItem(tourKey)) {
        setTimeout(() => setIsTourOpen(true), 1200);
      }
    } catch {}
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCandidateSession();
    setUser(null);
    setAccessStatus(null);
    loadCandidateData();
  };

  const toggleSaveJob = (id: string) => {
    setSavedJobIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        const savedKey = user?.id ? `nichehire_saved_jobs_${user.id}` : 'nichehire_saved_jobs_guest';
        localStorage.setItem(savedKey, JSON.stringify(updated));
        // Backwards compatibility
        localStorage.setItem('nichehire_saved_jobs', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Saved Jobs details computed for candidate private dashboard drawer
  const savedJobsDetails = useMemo(() => {
    const combined = [...allLiveJobs, ...INITIAL_VERIFIED_JOBS];
    const uniqueMap = new Map<string, Job>();
    combined.forEach((j) => uniqueMap.set(j.id, j));
    return savedJobIds.map((id) => uniqueMap.get(id)).filter(Boolean) as Job[];
  }, [savedJobIds, allLiveJobs]);

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
        reason: 'Upload your resume to calculate your AI Match & Alignment Score.',
      };
    }

    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const candidateSkills = parsedProfile.skills || [];

    // Matched skills
    const matchedSkills = candidateSkills.filter((s) => jobText.includes(s.toLowerCase()));
    const skillRatio = matchedSkills.length / Math.max(candidateSkills.length, 1);

    // Multi-disciplinary missing skills tailored strictly to the job's actual field
    const missingSkills = suggestRelevantMissingSkills(jobText, candidateSkills);

    // Multi-degree education check across BA, BCA, B.Com, CA, CMA, CS, BBA, BMS, MBBS, BDS, B.Pharm, LLB, BALLB, MBA, etc.
    const candidateEdu = parsedProfile.education || '';
    const eduEval = evaluateDegreeAlignment(jobText, candidateEdu);
    const eduScore = eduEval.score;
    const eduText = eduEval.text;

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
        reason: `Significant requirements gap. Missing core skills like ${missingSkills.join(', ') || 'core domain competencies'}.`,
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
    setCurrentPage(1);

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

      if (data.govtSuggestion) {
        setGovtSuggestion(data.govtSuggestion);
      } else {
        const clientGovt = detectGovtCrossPortalSuggestion(roleToUse);
        if (clientGovt && clientGovt.isGovtExam) {
          setGovtSuggestion({
            isGovtExam: true,
            query: roleToUse,
            matchedTitle: clientGovt.matchedTitle,
            conductingBody: clientGovt.conductingBody,
            category: clientGovt.category,
            targetUrl: clientGovt.targetUrl,
            message: clientGovt.advisoryNote,
          });
        } else {
          setGovtSuggestion(null);
        }
      }

      if ((!data.jobs || data.jobs.length === 0) && data.meta?.failedSources?.length && !data.govtSuggestion) {
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
    // 1. Must be signed in
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    // 2. Must have uploaded or created a resume
    if (!resumeText.trim()) {
      setDiscoveryTab('resume');
      setTailorMap((prev) => ({
        ...prev,
        [job.id]: {
          loading: false,
          open: true,
          error: 'Resume required: Please upload or paste your resume in the Resume Match tab (or create one using Resume Builder) before tailoring.',
        },
      }));
      return;
    }

    // 3. Quota check: if not unlimited bypass and remaining resumes <= 0
    if (!accessStatus.quotaBypass && (accessStatus.remainingQuotas?.tailoredResumes ?? 0) <= 0) {
      setPremiumModalOpen(true);
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
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setPremiumModalOpen(true);
        }
        throw new Error(data.error || 'Failed to tailor resume');
      }

      // Refresh remaining quota
      const session = await supabase.auth.getSession();
      if (session.data.session?.access_token) {
        fetchAccessStatus(session.data.session.access_token);
      }

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

    // Strict query matching on client side:
    // Ensures combined filters (e.g. "digital marketing" + "Remote") apply simultaneously (AND logic),
    // and unrelated jobs are never displayed.
    const cleanSearchQ = normalizeSearchInput(searchQuery);
    if (cleanSearchQ && !doesJobMatchQuery(job, cleanSearchQ)) {
      return false;
    }

    // Distance Filter (Hierarchical proximity)
    if (distance && distance !== 'Any Distance' && locationQuery) {
      if (job.workMode === 'Remote') {
        if (workMode === 'On-site') return false;
      } else {
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

  // ─── Pagination & Curated Slicing (30 jobs per page limit) ─────────────────
  const totalJobs = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * JOBS_PER_PAGE;
  const endIndex = Math.min(startIndex + JOBS_PER_PAGE, totalJobs);
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Curated portals for landing view filtered strictly by selected workMode
  const displayedCuratedJobs = INITIAL_VERIFIED_JOBS.filter((job) => {
    if (workMode !== 'Any Mode' && job.workMode !== workMode) return false;
    return true;
  });

  const TRENDING_ROLES = [
    'Software Engineer',
    'CA Articleship',
    'B.Com Accounts Executive',
    'Legal Intern (High Court / Corporate)',
    'BBA / MBA Operations Manager',
    'Product Manager',
    'Financial Analyst',
    'Medical Officer / Clinical Associate',
    'Content Writer / Journalist (BA)',
    'Data Analyst (BCA / B.Sc)',
    'Site Engineer (Civil / Mech)',
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
          {/* Left: Full Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setHasSearched(false)}>
              <div className="w-8 h-8 rounded-lg bg-[#12172B] flex items-center justify-center text-white font-black text-sm tracking-tight shadow-2xs">
                NH
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#12172B] tracking-tight">
                  NicheHire
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] rounded-full">
                  Verified Direct
                </span>
              </div>
            </div>
          </div>

          {/* Right: Clean, Uncluttered Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Classy & Premium Govt Jobs */}
            <Link
              href="/govt-exams"
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-amber-700" />
              <span>Govt Jobs</span>
            </Link>

            <button
              onClick={() => setResumeBuilderOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg transition-colors hidden md:flex items-center gap-1.5"
            >
              <FileText size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-[#2B4EE6]" />
              <span>Resume Builder</span>
            </button>

            <button
              onClick={() => setCareerGuidanceOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg transition-colors hidden lg:flex items-center gap-1.5"
            >
              <Compass size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-purple-600" />
              <span>Guidance</span>
            </button>

            <Link
              href="/employer/dashboard"
              className="px-2.5 py-1.5 text-xs font-medium text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-[#5B6478]" />
              <span>Employers</span>
            </Link>

            {/* Founder Admin Direct Link if user is identified as founder */}
            {(accessStatus?.isFounder || isFounderEmail(user?.email)) && (
              <Link
                href="/admin"
                className="px-2.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-amber-900" />
                <span>Admin</span>
              </Link>
            )}

            {/* Authenticated User Minimalist State */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#E4E7EC]">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#12172B]">
                    Hi, {candidateProfile?.fullName?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  <UserTierBadge
                    access={
                      isFounderEmail(user?.email) || accessStatus?.isFounder
                        ? {
                            level: 'unlimited',
                            quotaBypass: true,
                            badge: 'founder',
                            tier: 'premium',
                            assignedRole: 'Founder & CEO',
                            isFounder: true,
                          }
                        : accessStatus
                    }
                    onClick={() => setPremiumModalOpen(true)}
                    compact={true}
                  />
                </div>

                {/* Side Toggle: My Dashboard */}
                <button
                  onClick={() => setIsSideDrawerOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-[#2B4EE6] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Open private candidate dashboard"
                >
                  <Briefcase size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>My Dashboard</span>
                  {savedJobIds.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[#2B4EE6] text-white rounded-full">
                      {savedJobIds.length}
                    </span>
                  )}
                </button>

                {isClerkSignedIn ? (
                  <UserButton />
                ) : (
                  <button
                    onClick={handleSignOut}
                    className="px-2.5 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#12172B] hover:bg-[#F7F8FA] rounded-lg transition-colors hidden md:inline"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTourOpen(true)}
                  className="p-1.5 text-[#5B6478] hover:text-[#12172B] hover:bg-[#F7F8FA] rounded-lg transition-colors hidden sm:flex items-center gap-1 text-xs"
                  title="Platform Guide & Features"
                >
                  <HelpCircle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Tour</span>
                </button>
                <SignInButton mode="modal">
                  <button
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-lg transition-colors shadow-2xs"
                  >
                    Sign In
                  </button>
                </SignInButton>
              </div>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="p-1.5 text-[#5B6478] hover:text-[#12172B] hover:bg-[#F7F8FA] rounded-lg border border-[#E4E7EC] lg:hidden transition-colors flex items-center justify-center"
            >
              {mobileMenuOpen ? (
                <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
              ) : (
                <Menu size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </button>
          </div>
        </div>

        {/* Clean Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E4E7EC] bg-white px-4 py-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md">
            {user && (
              <div className="pb-2 border-b border-[#E4E7EC] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#12172B]">
                  Hi, {candidateProfile?.fullName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSideDrawerOpen(true);
                  }}
                  className="px-2.5 py-1 bg-blue-50 text-[#2B4EE6] font-bold text-xs rounded border border-blue-200"
                >
                  Open Dashboard
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <Link
                href="/govt-exams"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg text-left bg-amber-50 text-amber-900 border border-amber-200 font-semibold flex items-center gap-1.5"
              >
                <Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Govt Jobs</span>
              </Link>
              <button
                onClick={() => {
                  setResumeBuilderOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left bg-white border border-[#E4E7EC] text-[#12172B] flex items-center gap-1.5"
              >
                <FileText size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Resume Builder</span>
              </button>
              <button
                onClick={() => {
                  setCareerGuidanceOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left bg-white border border-[#E4E7EC] text-[#12172B] flex items-center gap-1.5"
              >
                <Compass size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Guidance</span>
              </button>
              <Link
                href="/employer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg text-left bg-white border border-[#E4E7EC] text-[#12172B] flex items-center gap-1.5"
              >
                <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Employers</span>
              </Link>
            </div>
            <div className="pt-2 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#5B6478]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsTourOpen(true);
                }}
                className="hover:text-[#12172B]"
              >
                Platform Tour
              </button>
              {user || isClerkSignedIn ? (
                <div className="flex items-center gap-2">
                  {isClerkSignedIn ? (
                    <UserButton />
                  ) : (
                    <button onClick={handleSignOut} className="text-red-600 font-semibold text-xs">
                      Sign Out
                    </button>
                  )}
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[#2B4EE6] font-semibold text-xs"
                  >
                    Sign In
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Initial Discovery State ("What are you looking for?") ── */}
      {!hasSearched && (
        <section className="min-h-[75vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16 bg-[#F7F8FA]">
          <div className="max-w-4xl w-full text-center space-y-6">
            {/* Top Verified Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] text-xs text-[#5B6478]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]"></span>
              <span>Direct Links to Official Company Portals</span>
            </div>

            {/* Main Editorial Headline (Inter + Newsreader serif) */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal text-[#12172B] tracking-tight leading-tight">
              Verified careers & roles. <br />
              <span className="font-serif italic text-[#12172B]">Direct from company career portals.</span>
            </h1>

            {/* Sentence-case subhead */}
            <p className="text-sm sm:text-base text-[#5B6478] max-w-2xl mx-auto leading-relaxed">
              Direct access to official corporate career sites (Google, Microsoft, Amazon, Tata, Stripe) across Engineering, Finance, Operations, Design &amp; Public Sector exams. Zero aggregator ghost jobs.
            </p>

            {/* Direct Portal Highlights Bar (Truth in Advertising) */}
            <div className="pt-1 pb-1 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-[#5B6478]">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full bg-white border border-[#E4E7EC]">
                <span className="flex items-center gap-1.5 font-medium text-[#12172B]">
                  <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
                  Direct Corporate Portals
                </span>
                <span className="text-[#E4E7EC]">•</span>
                <span>Zero Intermediaries</span>
                <span className="text-[#E4E7EC] hidden sm:inline">•</span>
                <span className="hidden sm:inline">100% Free for Candidates</span>
                <span className="text-[#E4E7EC] hidden md:inline">•</span>
                <span className="hidden md:inline">ATS-Optimized Guidance</span>
              </div>
            </div>

            {/* Company Portals Sourced (Location-Aware Marquee) */}
            <div className="pt-1">
              <div className="flex items-center justify-center gap-2 mb-2 text-xs text-[#5B6478]">
                <span>Top employers sourced daily:</span>
                {locationQuery ? (
                  <span className="px-2 py-0.5 rounded bg-white border border-[#2B4EE6]/30 text-[11px] font-medium text-[#2B4EE6] inline-flex items-center gap-1">
                    <LocateFixed size={12} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{locationQuery}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E4E7EC] text-[11px] font-medium text-[#5B6478]">
                    Pan-India
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#12172B]">
                {getSuggestedCompanies(locationQuery).map((co) => (
                  <button
                    key={co}
                    onClick={() => {
                      setSearchQuery(co);
                      fetchJobs(co, locationQuery);
                    }}
                    className="px-2.5 py-1 bg-white border border-[#E4E7EC] rounded text-[#12172B] text-xs font-medium hover:border-[#2B4EE6] hover:text-[#2B4EE6] transition-colors"
                  >
                    {co}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Testimonial */}
            <div className="inline-flex items-center gap-2.5 p-3 bg-white border border-[#E4E7EC] rounded-md text-xs text-[#5B6478] max-w-xl mx-auto text-left">
              <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
              <p className="text-xs leading-relaxed">
                “Applied direct to Amazon via NicheHire and interviewed within 48 hours. Zero recruiter spam or aggregator ghosting.” <span className="font-semibold text-[#12172B]">— Senior Product Analyst, India</span>
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
                  <span>Direct corporate portals updated every 6 hours</span>
                </div>
              </div>

              {/* Mode 1: Search by Role & Location */}
              {discoveryTab === 'search' && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <Search size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-3 text-[#5B6478]" />
                      <input
                        type="text"
                        placeholder="Job title, department, or role (e.g. Product Manager, Financial Analyst, Software Engineer)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                    </div>

                    <div className="flex-1 relative flex items-center">
                      <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-3 text-[#5B6478]" />
                      <input
                        type="text"
                        placeholder="Location (e.g. Bangalore, Delhi NCR, Mumbai, or Remote)..."
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                        className="w-full pl-9 pr-24 py-2.5 bg-white border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
                      />
                      <button
                        type="button"
                        onClick={detectCurrentLocation}
                        disabled={isDetectingLoc}
                        className="absolute right-1.5 top-1.5 px-2.5 py-1 text-[11px] font-medium text-[#2B4EE6] hover:bg-[#2B4EE6]/10 rounded border border-[#2B4EE6]/20 transition-colors flex items-center gap-1"
                        title="Detect your current city"
                      >
                        <LocateFixed size={12} strokeWidth={ICON_STROKE_WIDTH} />
                        <span>{isDetectingLoc ? 'Detecting...' : 'Detect'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => fetchJobs()}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-sm rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? 'Searching...' : 'Search Verified Jobs'}
                    </button>
                  </div>

                  {locationToast && (
                    <div className="text-xs text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/20 px-3 py-1.5 rounded flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                        <span>{locationToast}</span>
                      </span>
                      <button
                        onClick={() => setLocationToast('')}
                        className="text-[#5B6478] hover:text-[#12172B] text-xs font-semibold"
                      >
                        <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      </button>
                    </div>
                  )}

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
                          onClick={() => {
                            setWorkMode(m);
                            setCurrentPage(1);
                            if (hasSearched) {
                              fetchJobs(undefined, undefined, { workMode: m });
                            }
                          }}
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
                      <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Direct Portals Only</span>
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
                    {['Bangalore', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune', 'Remote'].map((loc) => (
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

                  {/* ── Walk-In Section inside Search Area ── */}
                  <div className="pt-3 border-t border-[#E4E7EC] mt-3">
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <Footprints size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#12172B]">
                              Local Walk-In Hiring Drives
                            </span>
                            <span className="px-2 py-0.2 text-[10px] font-bold bg-amber-200/60 text-amber-900 rounded-full">
                              {walkins.length} Active in {locationQuery || 'India'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5B6478]">
                            Direct in-person interview drives with venue addresses &amp; timings.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setIsWalkInsInSearchOpen(!isWalkInsInSearchOpen)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#12172B] bg-white hover:bg-[#F7F8FA] border border-amber-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Footprints size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>{isWalkInsInSearchOpen ? 'Hide Drives' : `View Drives (${walkins.length})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              setAuthModalOpen(true);
                            } else {
                              setPostWalkInOpen(true);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          title="Know a walk-in? Help candidates attend"
                        >
                          <Plus size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>+ Post a Walk-In</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Walk-In Drives List & Community Prompt */}
                    {isWalkInsInSearchOpen && (
                      <div className="mt-3 p-3.5 bg-white border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                        {/* Prompt to post walk-in if they know one */}
                        <div className="p-3 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-300/80 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          <div className="text-xs">
                            <span className="font-bold text-amber-950 block">
                              Know an offline or campus walk-in hiring drive?
                            </span>
                            <span className="text-[11px] text-amber-800">
                              Help candidates in {locationQuery || 'your region'} find verified physical interview opportunities!
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                setAuthModalOpen(true);
                              } else {
                                setPostWalkInOpen(true);
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                          >
                            + Post Walk-In Details
                          </button>
                        </div>

                        {walkins.length === 0 ? (
                          <div className="text-center py-6 text-xs text-[#5B6478]">
                            No active walk-in drives listed for this location yet. Be the first to post one!
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {walkins.map((w) => (
                              <div
                                key={w.id}
                                className="p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg space-y-1.5 text-xs text-[#12172B]"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <h5 className="font-bold text-sm text-[#12172B] line-clamp-1">{w.title}</h5>
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
                                    {w.role_type || 'Walk-In'}
                                  </span>
                                </div>
                                <div className="font-medium text-[#2B4EE6]">{w.company}</div>
                                <div className="text-[11px] text-[#5B6478]">
                                  📍 <strong>Venue:</strong> {w.location}
                                </div>
                                {w.timings && (
                                  <div className="text-[11px] text-[#5B6478]">
                                    🕒 <strong>Date &amp; Time:</strong> {w.timings}
                                  </div>
                                )}
                                {w.contact_info && (
                                  <div className="text-[11px] text-[#5B6478]">
                                    📞 <strong>Contact:</strong> {w.contact_info}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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

                    <div className="w-12 h-12 rounded bg-white border border-[#E4E7EC] text-[#2B4EE6] flex items-center justify-center mx-auto mb-3">
                      <FileText size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                    </div>

                    <h3 className="text-base font-semibold text-[#12172B]">
                      {isParsing ? 'Analyzing your skills & experience with AI…' : 'Drop your resume (PDF or DOCX)'}
                    </h3>
                    <p className="text-xs text-[#5B6478] max-w-md mx-auto mt-1 leading-relaxed">
                      Our system extracts your skills and experience to calculate instant <strong className="text-[#12172B]">High / Medium / Low AI Match Scores</strong> against active verified openings.
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
                          <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                          <span>Profile analyzed: {parsedProfile.role || 'Software Engineer'} ({parsedProfile.experienceLevel || 'Mid-Level'})</span>
                        </div>
                        <div className="text-[11px] text-[#5B6478] mt-0.5">
                          {parsedProfile.skills?.slice(0, 6).join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => fetchJobs(parsedProfile.role, parsedProfile.location)}
                        className="px-3.5 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-medium text-xs rounded transition-colors shrink-0 flex items-center gap-1"
                      >
                        <span>View matched openings</span>
                        <ArrowUpRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      </button>
                    </div>
                  )}

                  {/* Privacy Guarantee Trust Note */}
                  <div className="p-3 bg-[#F7F8FA] border border-[#E4E7EC] rounded flex items-start gap-2.5 text-xs text-[#5B6478]">
                    <Lock size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#12172B]">100% In-memory privacy guarantee:</strong> Your resume text is parsed temporarily to calculate match scores and search parameters. We never store, sell, or broadcast your personal data to external recruiters.
                    </div>
                  </div>

                  {/* Apply Chances Methodology Explainer */}
                  <div className="p-3 bg-white border border-[#E4E7EC] rounded flex items-start gap-2.5 text-xs text-[#5B6478]">
                    <Info size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#12172B]">How AI Match Score evaluation works:</strong> We evaluate skill overlap (50%), experience alignment (25%), education (20%), and role relevance (5%):
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
                    <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Direct Corporate Portals</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#12172B]">
                    Curated Direct Company Portals &amp; Openings
                  </h2>
                  <p className="text-xs text-[#5B6478]">
                    Direct links to official corporate career sites (Google, Microsoft, Amazon, Tata Group, Stripe). Apply directly with zero intermediary aggregators.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#12172B] bg-[#F7F8FA] px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {displayedCuratedJobs.length} Curated Portals{workMode !== 'Any Mode' ? ` (${workMode})` : ''}
                  </span>
                </div>
              </div>

              {/* Truth-in-Advertising Disclosure */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <Info size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-blue-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-blue-800">
                  <strong>Direct Portal Directory:</strong> The opportunities below link straight to each employer&apos;s verified career portal. Job availability, requirements, and live status are managed directly on the respective company website.
                </p>
              </div>

              {displayedCuratedJobs.length === 0 ? (
                <div className="p-8 text-center bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl text-xs text-[#5B6478]">
                  <p className="font-semibold text-[#12172B] mb-1">No featured direct portals under &quot;{workMode}&quot;</p>
                  <p>Try switching to &quot;All Modes&quot; or use the search bar above to fetch live verified {workMode.toLowerCase()} roles across India.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkMode('Any Mode');
                      setCurrentPage(1);
                    }}
                    className="mt-3 px-3 py-1.5 bg-[#12172B] text-white rounded text-xs font-medium"
                  >
                    Reset to All Modes
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedCuratedJobs.map((job) => (
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
                      onCloseTailor={closeTailor}
                      onPrintPdf={handlePrintPdf}
                      formatTimeAgo={formatTimeAgo}
                    />
                  ))}
                </div>
              )}
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
                <Search size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-2.5 text-[#5B6478]" />
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
                <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-2.5 text-[#5B6478]" />
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
                <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Verified Portals Only</span>
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
                <span>Startups</span>
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

          {/* Government Recruitment Cross-Portal Suggestion Card */}
          {govtSuggestion && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-[#12172B] via-[#1E293B] to-[#1E3BBD] text-white rounded-2xl shadow-md border border-blue-900 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                    <span>🏛️ Government Recruitment Detected</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Looking for {govtSuggestion.matchedTitle || govtSuggestion.conductingBody || govtSuggestion.query}?
                  </h3>
                  <p className="text-xs text-blue-200 max-w-xl leading-relaxed">
                    {govtSuggestion.message ||
                      `"${govtSuggestion.query}" is an official examination conducted by ${govtSuggestion.conductingBody}. We track all active notifications, admit cards, and eligibility criteria on our dedicated Government Jobs portal.`}
                  </p>
                </div>
                <Link
                  href={govtSuggestion.targetUrl || `/govt-exams?q=${encodeURIComponent(govtSuggestion.query)}`}
                  className="shrink-0 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 hover:scale-[1.02]"
                >
                  <span>Explore Government Portal</span>
                  <ArrowRight size={13} strokeWidth={ICON_STROKE_WIDTH} />
                </Link>
              </div>
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
                  : `Live Verified Jobs (${totalJobs}${totalJobs > JOBS_PER_PAGE ? ` • Page ${validCurrentPage} of ${totalPages}` : ''})`}
              </h2>
              <button
                onClick={() => setHasSearched(false)}
                className="text-xs text-[#2B4EE6] hover:underline font-medium flex items-center gap-1"
              >
                <ArrowUpRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="rotate-180 shrink-0" />
                Back to Featured
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
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed rounded-2xl bg-white border-[#E4E7EC]">
              {activeTab === 'saved' ? (
                <>
                  <div className="w-10 h-10 rounded bg-[#FFFBEB] text-[#D97B0A] flex items-center justify-center mb-2 border border-[#FDE68A]">
                    <Bookmark size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#12172B]">No saved jobs yet</h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-sm">
                    Save jobs to compare them here → Click the bookmark icon on any verified role to add it to your shortlist.
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
                  <div className="w-10 h-10 rounded bg-[#F7F8FA] text-[#12172B] flex items-center justify-center mb-2 border border-[#E4E7EC]">
                    <Footprints size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#12172B]" />
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
              ) : govtSuggestion ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2B4EE6] flex items-center justify-center mb-3 border border-blue-100">
                    <Search size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#12172B]">
                    0 Private Sector Jobs for "{searchQuery}"
                  </h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-md">
                    "{searchQuery}" is recognized as an official government recruitment or competitive exam. Check the government notifications banner above to explore open vacancies.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        fetchJobs('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-xl shadow-xs transition-colors"
                    >
                      Browse All Private Jobs
                    </button>
                    <Link
                      href={govtSuggestion.targetUrl || `/govt-exams?q=${encodeURIComponent(searchQuery)}`}
                      className="px-4 py-2 text-xs font-bold text-gray-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-2xs"
                    >
                      Go to Government Portal →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-[#5B6478] flex items-center justify-center mb-3 border border-[#E4E7EC]">
                    <Search size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#5B6478]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#12172B]">
                    {searchQuery ? `No jobs found matching "${searchQuery}"` : 'No jobs match your current filters'}
                  </h3>
                  <p className="mt-1 text-xs text-[#5B6478] max-w-md">
                    {searchQuery
                      ? `We couldn't find any verified openings matching "${searchQuery}". Try different keywords, clear your filters, or check spelling.`
                      : 'Try widening your filters (e.g. choose Any Mode or All Types).'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => {
                        setWorkMode('Any Mode');
                        setSelectedType('All Types');
                        setPostedTime('Any Time');
                        setDistance('Any Distance');
                        setApplicants('Any Applicants');
                        setVerifiedOnly(false);
                        setIsStartupOnly(false);
                        setSearchQuery('');
                        fetchJobs('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-xl shadow-xs transition-colors"
                    >
                      Clear all filters &amp; Browse all jobs
                    </button>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setWorkMode('Any Mode');
                          setSelectedType('All Types');
                          setPostedTime('Any Time');
                          setDistance('Any Distance');
                          setApplicants('Any Applicants');
                          setVerifiedOnly(false);
                          setIsStartupOnly(false);
                          fetchJobs(searchQuery);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        Keep "{searchQuery}" &amp; Reset other filters
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Job Feed */}
          {!isLoading && paginatedJobs.length > 0 && (
            <div className="space-y-3">
              {paginatedJobs.map((job, idx) => (
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
                  onCloseTailor={closeTailor}
                  onPrintPdf={handlePrintPdf}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls (30 Jobs Per Page Limit) */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#5B6478]">
                Showing <span className="font-semibold text-[#12172B]">{startIndex + 1}</span>–<span className="font-semibold text-[#12172B]">{endIndex}</span> of <span className="font-semibold text-[#12172B]">{totalJobs}</span> opportunities (30 per page)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={validCurrentPage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E4E7EC] rounded-md text-[#12172B] bg-white hover:bg-[#F7F8FA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - validCurrentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push(`dots-${page}`);
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item) => {
                      if (typeof item === 'string') {
                        return (
                          <span key={item} className="px-1 text-xs text-[#5B6478]">
                            …
                          </span>
                        );
                      }
                      const isCurrent = item === validCurrentPage;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setCurrentPage(item);
                            window.scrollTo({ top: 350, behavior: 'smooth' });
                          }}
                          className={`min-w-[32px] h-8 text-xs font-semibold rounded-md border transition-colors ${
                            isCurrent
                              ? 'bg-[#12172B] text-white border-[#12172B]'
                              : 'bg-white text-[#12172B] border-[#E4E7EC] hover:bg-[#F7F8FA]'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E4E7EC] rounded-md text-[#12172B] bg-white hover:bg-[#F7F8FA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight size={13} />
                </button>
              </div>
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
                      <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E] shrink-0" />
                      Verified Direct
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-[#12172B] leading-snug">{selectedJob.title}</h2>
                <p className="text-xs text-[#5B6478] mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <LocateFixed size={12} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{selectedJob.location}</span>
                  </span>
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
                <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
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
                  <span>Apply on company portal</span>
                  <ArrowUpRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                </a>

                <button
                  onClick={() => toggleSaveJob(selectedJob.id)}
                  className={`px-3 py-2 rounded border text-xs font-medium transition-colors ${
                    savedJobIds.includes(selectedJob.id)
                      ? 'bg-blue-50/60 text-[#2B4EE6] border-blue-200'
                      : 'border-[#E4E7EC] hover:bg-[#F7F8FA] text-[#12172B]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Bookmark
                      size={ICON_SIZES.inline}
                      strokeWidth={ICON_STROKE_WIDTH}
                      className={savedJobIds.includes(selectedJob.id) ? 'fill-[#2B4EE6] text-[#2B4EE6]' : 'text-[#5B6478]'}
                    />
                    <span>{savedJobIds.includes(selectedJob.id) ? 'Saved' : 'Save'}</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      setAuthModalOpen(true);
                      return;
                    }
                    if (!accessStatus.quotaBypass && (accessStatus.remainingQuotas?.hrEmailDrafts ?? 0) <= 0) {
                      setPremiumModalOpen(true);
                      return;
                    }
                    setActiveOutreachJob(selectedJob);
                  }}
                  className="px-3 py-2 rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] text-xs font-medium text-[#12172B] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Mail size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Email HR</span>
                </button>

                <button
                  onClick={() => handleTailorResume(selectedJob)}
                  disabled={tailorMap[selectedJob.id]?.loading}
                  className="px-3 py-2 rounded border border-[#2B4EE6]/40 bg-[#2B4EE6]/5 hover:bg-[#2B4EE6]/10 text-xs font-medium text-[#2B4EE6] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>{tailorMap[selectedJob.id]?.loading ? 'Tailoring…' : 'Tailor CV'}</span>
                </button>

                <button
                  onClick={() => setActivePrepJob(selectedJob)}
                  className="px-3 py-2 rounded border border-[#E4E7EC] hover:bg-[#F7F8FA] text-xs font-medium text-[#12172B] transition-colors flex items-center gap-1.5"
                >
                  <Mic size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Prep</span>
                </button>
              </div>

              {/* Drawer Tailor Resume Panel */}
              {tailorMap[selectedJob.id]?.open && (
                <div className="p-4 bg-[#F7F8FA] rounded-md border border-[#2B4EE6]/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                    <div className="flex items-center gap-2">
                      <Sparkles size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                      <span className="text-xs font-bold text-[#12172B]">AI Tailored Resume</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-[#2B4EE6]/10 text-[#2B4EE6] rounded font-semibold">
                        ATS Optimized
                      </span>
                    </div>
                    <button
                      onClick={() => closeTailor(selectedJob.id)}
                      className="text-xs text-[#5B6478] hover:text-[#12172B] font-medium px-2 py-0.5 rounded hover:bg-gray-200 flex items-center gap-1"
                    >
                      <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      <span>Close</span>
                    </button>
                  </div>

                  {tailorMap[selectedJob.id]?.loading && (
                    <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-[#5B6478]">
                      <span className="w-5 h-5 border-2 border-[#2B4EE6] border-t-transparent rounded-full animate-spin"></span>
                      <span>Aligning bullet points with genuine job keywords…</span>
                    </div>
                  )}

                  {tailorMap[selectedJob.id]?.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {tailorMap[selectedJob.id]?.error}
                    </div>
                  )}

                  {tailorMap[selectedJob.id]?.text && (
                    <div className="space-y-3">
                      <div className="bg-white p-3.5 rounded border border-[#E4E7EC] text-xs font-mono text-[#12172B] max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                        {tailorMap[selectedJob.id]?.text}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tailorMap[selectedJob.id]?.text || '');
                            setCopiedTailorJobId(selectedJob.id);
                            setTimeout(() => setCopiedTailorJobId(null), 2000);
                          }}
                          className="px-3 py-1.5 bg-white border border-[#E4E7EC] hover:bg-[#F7F8FA] rounded text-xs font-medium text-[#12172B] flex items-center gap-1.5"
                        >
                          <Copy size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>{copiedTailorJobId === selectedJob.id ? 'Copied!' : 'Copy Text'}</span>
                        </button>
                        <button
                          onClick={() => handlePrintPdf(tailorMap[selectedJob.id]?.text || '', selectedJob.title)}
                          className="px-3 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded text-xs font-medium shadow-2xs flex items-center gap-1.5"
                        >
                          <Printer size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Print / Download PDF</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                            <span key={s} className="px-2 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] text-[#12172B] rounded text-[11px] font-medium inline-flex items-center gap-1">
                              <Check size={11} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                              <span>{s}</span>
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
                      <span>View on official portal</span>
                      <ArrowUpRight size={12} strokeWidth={ICON_STROKE_WIDTH} />
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

      {/* ── Relocated How It Works Section ── */}
      <section id="how-it-works" className="py-16 bg-white border-t border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#2B4EE6] tracking-wider uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Why NicheHire
            </span>
            <h2 className="text-3xl font-bold text-[#12172B] tracking-tight">
              Direct connection to verified career portals
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6478] leading-relaxed">
              Job seekers shouldn&apos;t have to navigate expired, duplicate, or ghost listings on scrapers and aggregators. Here is how NicheHire connects you directly to authentic corporate opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 bg-[#F7F8FA] rounded-2xl border border-[#E4E7EC] space-y-3 hover:border-[#12172B]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7EC] text-[#12172B] flex items-center justify-center font-bold text-sm shadow-2xs">
                1
              </div>
              <h3 className="text-sm font-bold text-[#12172B]">Direct career portal verification</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                We crawl official company career pages and enterprise ATS systems (Greenhouse, Lever, SAP, Workday). Every apply button routes straight to the employer&apos;s verified domain.
              </p>
            </div>

            <div className="p-6 bg-[#F7F8FA] rounded-2xl border border-[#E4E7EC] space-y-3 hover:border-[#12172B]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#0E9F6E] flex items-center justify-center font-bold text-sm shadow-2xs">
                2
              </div>
              <h3 className="text-sm font-bold text-[#12172B]">Strict &le; 7-day cutoff policy</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Positions older than 7 calendar days (and up to 21 days for regional hubs) are pruned automatically. You will never waste time applying to positions that were closed weeks ago.
              </p>
            </div>

            <div className="p-6 bg-[#F7F8FA] rounded-2xl border border-[#E4E7EC] space-y-3 hover:border-[#12172B]/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2B4EE6] flex items-center justify-center font-bold text-sm shadow-2xs">
                3
              </div>
              <h3 className="text-sm font-bold text-[#12172B]">All disciplines &amp; pan-India radius</h3>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Equal priority for non-tech disciplines: B.Com, MBA, Arts, Law, and Medicine alongside Engineering, with hyper-local to pan-India geo radius expansion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Relocated Pricing Section ── */}
      <section id="pricing" className="py-16 bg-[#F7F8FA] border-t border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#0E9F6E] tracking-wider uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Clear &amp; Honest Pricing
            </span>
            <h2 className="text-3xl font-bold text-[#12172B] tracking-tight">
              100% Free for Candidates. Transparent for Employers.
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6478] leading-relaxed">
              Job seekers never pay for applications. Employers hire with zero lock-in subscriptions via direct bank UPI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
            {/* Candidate Plan */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2B4EE6] border border-blue-100">
                  Job Seekers &amp; Students
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#12172B]">₹0</span>
                    <span className="text-xs text-[#5B6478]">/ forever</span>
                  </div>
                  <span className="text-xs text-[#0E9F6E] font-medium">100% Free Access</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5B6478] pt-2 border-t border-[#E4E7EC]">
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Direct company portal links</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Pan-India &amp; local district search</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Private saved jobs dashboard</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> ATS Resume builder &amp; export</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  if (!user) setAuthModalOpen(true);
                  else setIsSideDrawerOpen(true);
                }}
                className="w-full mt-6 py-2.5 bg-[#F7F8FA] hover:bg-[#E4E7EC] text-[#12172B] text-xs font-bold rounded-xl transition-colors border border-[#E4E7EC]"
              >
                {user ? 'Open My Dashboard' : 'Create Free Account'}
              </button>
            </div>

            {/* Employer Launch Pilot */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#0E9F6E] border border-emerald-200">
                  Free Starter (10 Days)
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#12172B]">₹0</span>
                    <span className="text-xs text-[#5B6478]">/ 1st post</span>
                  </div>
                  <span className="text-xs text-[#5B6478]">10 Days active validity</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5B6478] pt-2 border-t border-[#E4E7EC]">
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> 1 verified live opening</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Direct company careers redirect</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Indexed for Google for Jobs</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Standard candidate applications</li>
                </ul>
              </div>
              <button
                onClick={() => setPostJobOpen(true)}
                className="w-full mt-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                Post 1st Role Free
              </button>
            </div>

            {/* Growth Tier */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2B4EE6] border border-blue-100">
                  Growth Plan (Popular)
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#12172B]">₹299</span>
                    <span className="text-xs text-[#5B6478]">/ 2 jobs</span>
                  </div>
                  <span className="text-xs text-[#2B4EE6] font-medium">14 Days active validity</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5B6478] pt-2 border-t border-[#E4E7EC]">
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> 2 active job listings</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> 14 days listing validity</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Direct candidate CVs unlocked</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Verified corporate badge</li>
                </ul>
              </div>
              <Link
                href="/employer/dashboard"
                className="w-full mt-6 py-2.5 bg-white hover:bg-[#F7F8FA] text-[#12172B] border border-[#E4E7EC] text-xs font-bold rounded-xl transition-colors shadow-2xs text-center block"
              >
                Unlock Growth (₹299) &rarr;
              </Link>
            </div>

            {/* Pro Recruiter */}
            <div className="bg-white rounded-2xl p-6 border-2 border-[#2B4EE6] flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#2B4EE6] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Recommended • Best Value
              </div>
              <div className="space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2B4EE6]/10 text-[#2B4EE6] border border-[#2B4EE6]/20">
                  Pro Recruiter (5 Jobs)
                </span>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#12172B]">₹599</span>
                    <span className="text-xs text-[#5B6478]">/ 5 jobs</span>
                  </div>
                  <span className="text-xs text-[#2B4EE6] font-medium">21 Days active validity</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5B6478] pt-2 border-t border-[#E4E7EC]">
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> 5 active job listings</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> 21 days listing validity</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Priority AI candidate ranking</li>
                  <li className="flex items-center gap-1.5"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" /> Walk-in drives &amp; HR outreach</li>
                </ul>
              </div>
              <Link
                href="/employer/dashboard"
                className="w-full mt-6 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs text-center block"
              >
                Get Pro Recruiter (₹599) &rarr;
              </Link>
            </div>
          </div>

          {/* Enterprise 20-Job Callout */}
          <div className="mt-6 p-4 bg-white border border-[#E4E7EC] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#12172B] text-white font-bold text-[11px]">Enterprise</span>
              <span className="text-[#5B6478]">
                Need high-volume hiring? Scale with <strong className="text-[#12172B]">Enterprise / Volume Plan (₹999 for 20 jobs • 30 days)</strong> with zero platform cut.
              </span>
            </div>
            <Link
              href="/pricing"
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl whitespace-nowrap transition-colors"
            >
              Compare All 4 Plans &rarr;
            </Link>
          </div>
        </div>
      </section>

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
                <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                <span>100% Genuine Direct Portal Guarantee</span>
              </div>
              <div className="pt-1">
                <a
                  href="https://www.linkedin.com/company/nichehirejobs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0A66C2] hover:text-[#004182] hover:underline"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c-.97 0-1.75-.79-1.75-1.76s.78-1.75 1.75-1.75 1.75.78 1.75 1.75-.78 1.76-1.75 1.76m1.39 9.74v-8.37H5.07v8.37h2.78z" />
                  </svg>
                  <span>Follow NicheHire on LinkedIn</span>
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">For job seekers</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><button onClick={() => { setHasSearched(false); setActiveTab('all'); }} className="hover:text-[#2B4EE6]">Browse verified jobs</button></li>
                <li><Link href="/govt-exams" className="hover:text-amber-800 font-medium text-amber-700 flex items-center gap-1"><Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> <span>Govt Jobs &amp; Public Sector</span></Link></li>
                <li><button onClick={() => { setIsWalkInsInSearchOpen(true); window.scrollTo({ top: 300, behavior: 'smooth' }); }} className="hover:text-[#2B4EE6]">Offline &amp; walk-in openings</button></li>
                <li><button onClick={() => setIsTourOpen(true)} className="hover:text-[#2B4EE6] flex items-center gap-1"><HelpCircle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> <span>Platform Guide &amp; Tour</span></button></li>
                {user && (
                  <li><button onClick={() => setIsSideDrawerOpen(true)} className="hover:text-[#2B4EE6] font-semibold text-[#2B4EE6] flex items-center gap-1"><Briefcase size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> <span>My Private Dashboard</span></button></li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">Trust &amp; verification</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><Link href="/about" className="hover:text-[#2B4EE6]">4-Pillar verification engine</Link></li>
                <li><Link href="/about" className="hover:text-[#2B4EE6]">Strict ≤ 7-day cutoff policy</Link></li>
                <li><Link href="/privacy" className="hover:text-[#2B4EE6]">Privacy Policy (DPDP Act)</Link></li>
                <li><Link href="/terms" className="hover:text-[#2B4EE6]">Terms of Service</Link></li>
                <li><Link href="/about" className="hover:text-[#2B4EE6]">About NicheHire</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#12172B] text-xs">For employers</h4>
              <ul className="space-y-1.5 text-[#5B6478]">
                <li><Link href="/employer/dashboard" className="font-semibold text-[#2B4EE6] hover:underline flex items-center gap-1"><Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> <span>Employer Portal &amp; Login</span></Link></li>
                <li><button onClick={() => setPostJobOpen(true)} className="hover:underline font-medium text-[#2B4EE6] flex items-center gap-1"><span>Post a verified role</span> <ArrowUpRight size={12} strokeWidth={ICON_STROKE_WIDTH} /></button></li>
                <li><Link href="/pricing" className="hover:text-[#2B4EE6]">Employer pricing &amp; plans</Link></li>
                <li><Link href="/pricing" className="hover:text-[#2B4EE6]">Greenhouse &amp; Lever sync</Link></li>
                <li><button onClick={() => setFeedbackModalOpen(true)} className="hover:text-[#2B4EE6]">Recruiter support</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#5B6478]">
            <p>© {new Date().getFullYear()} NicheHire. Verified job listings under 7 days old, direct from company career portals.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/about" className="hover:text-[#12172B]">About</Link>
              <a href="https://www.linkedin.com/company/nichehirejobs" target="_blank" rel="noopener noreferrer" className="hover:text-[#0A66C2] font-medium flex items-center gap-1">
                <span>LinkedIn</span>
                <ArrowUpRight size={10} strokeWidth={ICON_STROKE_WIDTH} />
              </a>
              <Link href="/privacy" className="hover:text-[#12172B]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#12172B]">Terms</Link>
              <button onClick={() => setFeedbackModalOpen(true)} className="hover:text-[#12172B]">Suggestions &amp; Help</button>
              <a href="mailto:harshit@nichehire.tech" className="text-[#2B4EE6] font-semibold hover:underline">harshit@nichehire.tech</a>
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
          if (u?.id) {
            loadCandidateData(u.id);
            try {
              const tourKey = `nichehire_tour_completed_${u.id}`;
              if (!localStorage.getItem(tourKey)) {
                setTimeout(() => setIsTourOpen(true), 600);
              }
            } catch {}
          }
        }}
      />

      {activeOutreachJob && (
        <EmailDraftModal
          isOpen={true}
          onClose={() => setActiveOutreachJob(null)}
          job={activeOutreachJob}
          resumeText={resumeText}
          userId={user?.id}
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
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        userId={user?.id}
        userEmail={user?.email}
      />

      <PremiumUnlockModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        referralCount={accessStatus?.referralCount ?? 0}
        provisionalCount={accessStatus?.provisionalCount ?? 0}
        recentReferrals={accessStatus?.recentReferrals ?? []}
        referralCode={
          isFounderEmail(user?.email) || accessStatus?.isFounder
            ? 'FOUNDER'
            : accessStatus?.referralCode || (user?.id ? `REF-${user.id.slice(0, 8).toUpperCase()}` : 'REF-NICHE2026')
        }
        isLoggedIn={!!user}
        onLoginClick={() => {
          setPremiumModalOpen(false);
          setAuthModalOpen(true);
        }}
      />

      <CareerGuidanceModal
        isOpen={careerGuidanceOpen}
        onClose={() => setCareerGuidanceOpen(false)}
        userId={user?.id}
        defaultResumeText={resumeText}
        isLoggedIn={!!user}
        onLoginClick={() => {
          setCareerGuidanceOpen(false);
          setAuthModalOpen(true);
        }}
        isUnlimited={accessStatus?.quotaBypass}
      />

      <ResumeBuilderModal
        isOpen={resumeBuilderOpen}
        onClose={() => setResumeBuilderOpen(false)}
        userId={user?.id}
        isLoggedIn={!!user}
        candidateProfile={candidateProfile}
      />

      <PostWalkInModal
        isOpen={postWalkInOpen}
        onClose={() => setPostWalkInOpen(false)}
        onSuccess={() => fetchWalkins()}
        initialLocation={locationQuery}
      />

      <PostJobModal
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
        isLoggedIn={typeof window !== 'undefined' ? Boolean(localStorage.getItem('nichehire_employer_email')) : false}
        employerEmail={typeof window !== 'undefined' ? (localStorage.getItem('nichehire_employer_email') || '') : ''}
        onRequireAuth={() => {
          window.location.href = '/employer/dashboard';
        }}
        onRequireMembership={() => {
          window.location.href = '/pricing';
        }}
        onSuccess={(newListing) => {
          setAllLiveJobs((prev) => [newListing, ...prev]);
        }}
      />

      {/* Candidate Private Side Drawer */}
      <CandidateSideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        user={user}
        accessStatus={accessStatus}
        candidateProfile={candidateProfile}
        savedJobIds={savedJobIds}
        savedJobsDetails={savedJobsDetails}
        onToggleSaveJob={toggleSaveJob}
        onOpenResumeBuilder={() => setResumeBuilderOpen(true)}
        onOpenCareerGuidance={() => setCareerGuidanceOpen(true)}
        onOpenEditProfile={() => setIsProfileModalOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Candidate Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={user?.id}
        userEmail={user?.email}
        onSaved={(updated) => setCandidateProfile(updated)}
      />

      {/* Website Tour / Onboarding Guide */}
      <WebsiteTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        userId={user?.id}
      />
    </div>
  );
}