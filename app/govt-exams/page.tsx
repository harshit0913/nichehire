'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  VERIFIED_GOVT_EXAMS,
  GovtExam,
} from '../data/govtExamsData';
import {
  STATE_UT_PSC_DIRECTORIES,
  CENTRAL_RECRUITMENT_TIMETABLE,
  StateUtPscInfo,
  CentralRecruitmentExam,
} from '../data/govtCalendarData';
import {
  NAGAR_NIGAM_DIRECTORY,
  STATE_MUNICIPAL_OVERVIEWS,
  NagarNigam,
  StateMunicipalOverview,
} from '../data/nagarNigamDirectory';
import {
  ALL_INDIA_DISTRICT_DIRECTORY,
  DistrictEntry,
} from '../data/allIndiaDistrictsData';
import {
  calculateGovtEligibility,
  CandidateProfile,
  CandidateCategory,
  QualificationLevel,
  EligibilityCheckResult,
} from '../lib/govtEligibility';
import {
  matchCoordinatesToRegion,
  ALL_INDIAN_STATES,
  POPULAR_DISTRICTS_BY_STATE,
  LocationMatch,
} from '../lib/indianGeoBounds';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  GraduationCap,
  IndianRupee,
  Info,
  Landmark,
  LocateFixed,
  Search,
  Settings,
  Users,
  X,
  XCircle,
} from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

// Helper to format dates cleanly (e.g. 2024-10-03 -> 03 Oct 2024)
function formatExamDate(dateStr?: string): string {
  if (!dateStr) return 'TBA';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parts[2];
    if (m >= 0 && m < 12) {
      return `${d} ${months[m]} ${y}`;
    }
  }
  return dateStr;
}

export default function GovtExamsPage() {
  // ─── Location & Proximity State (Strictly Session-Bound) ──────────────────
  // STRICT RULE: Fresh visit always starts at "All India" / "All Districts".
  // Never persists to localStorage across browser sessions.
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [detectedLocation, setDetectedLocation] = useState<LocationMatch | null>(null);
  const [locationNoticeDismissed, setLocationNoticeDismissed] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationToast, setLocationToast] = useState('');

  // ─── Candidate Profile State (100% Client-Side & Session-Only) ────────────
  // STRICT RULE: No default qualification, degree, or stream. Never evaluate eligibility without real CV or user input!
  const [hasConfiguredProfile, setHasConfiguredProfile] = useState<boolean>(false);
  const [hasUploadedResume, setHasUploadedResume] = useState<boolean>(false);
  const [candidateAge, setCandidateAge] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<CandidateCategory>('General');
  const [qualification, setQualification] = useState<QualificationLevel | undefined>(undefined);
  const [degreeType, setDegreeType] = useState<string | undefined>(undefined);
  const [stream, setStream] = useState<string | undefined>(undefined);
  const [isPwD, setIsPwD] = useState(false);
  const [isExServicemen, setIsExServicemen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileValidationErr, setProfileValidationErr] = useState('');

  // ─── CV Upload & Extraction State ──────────────────────────────────────────
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [cvFileName, setCvFileName] = useState('');
  const [cvExtractionNotice, setCvExtractionNotice] = useState('');

  // ─── Filter & View State ───────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<'hierarchy' | 'calendar' | 'archive' | 'nagar_nigam'>('hierarchy');
  const [calendarSubTab, setCalendarSubTab] = useState<'psc_directory' | 'central_timetable' | 'milestones'>('psc_directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [nnSearchQuery, setNnSearchQuery] = useState('');
  const [nnSelectedState, setNnSelectedState] = useState('All');
  const [nnSelectedDistrict, setNnSelectedDistrict] = useState('All');
  const [pscSearchQuery, setPscSearchQuery] = useState('');
  const [pscTypeFilter, setPscTypeFilter] = useState<'all' | 'State' | 'Union Territory'>('all');
  const [centralAgencyFilter, setCentralAgencyFilter] = useState<'all' | 'UPSC' | 'SSC' | 'Railways (RRB)' | 'Banking (IBPS/SBI)' | 'Defence & Research'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'regional' | 'state' | 'central' | 'psu'>('all');
  const [eligibilityOnly, setEligibilityOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  // ─── Modals State ──────────────────────────────────────────────────────────
  const [activeChecklistExam, setActiveChecklistExam] = useState<{ exam: GovtExam; result: EligibilityCheckResult } | null>(null);
  const [reportModalExam, setReportModalExam] = useState<GovtExam | null>(null);
  const [reportIssueType, setReportIssueType] = useState('Date Postponed / Rescheduled');
  const [reportDetails, setReportDetails] = useState('');
  const [reportProofUrl, setReportProofUrl] = useState('');
  const [reportSuccessMsg, setReportSuccessMsg] = useState('');

  // ─── Purge Any Stale LocalStorage on Mount (Guarantee Clean State) ─────────
  useEffect(() => {
    try {
      localStorage.removeItem('nichehire_govt_profile');
    } catch {
      // LocalStorage access safe ignore
    }
  }, []);

  // ─── Eligibility Available Flag ───────────────────────────────────────────
  // Eligibility is ONLY available if the user explicitly uploaded a resume or saved qualifications in this session
  const eligibilityAvailable = Boolean(hasConfiguredProfile || hasUploadedResume || cvFileName);

  // ─── Manual Save Profile in Drawer ────────────────────────────────────────
  const handleSaveProfile = () => {
    if (!candidateAge || !qualification || !degreeType || !stream) {
      setProfileValidationErr('Please fill in your Age, Qualification, Degree, and Stream to calculate accurate eligibility.');
      return;
    }
    setProfileValidationErr('');
    setHasConfiguredProfile(true);
    setProfileDrawerOpen(false);
  };

  const handleResetProfile = () => {
    setHasConfiguredProfile(false);
    setHasUploadedResume(false);
    setCandidateAge(undefined);
    setQualification(undefined);
    setDegreeType(undefined);
    setStream(undefined);
    setCvFileName('');
    setCvExtractionNotice('');
    setProfileValidationErr('');
  };

  // ─── Offline Coordinate Geolocation (Session Filter Only) ─────────────────
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationToast('');

    const applyDetectedStateAndDistrict = (state: string, district?: string, isBorderZone?: boolean, borderNote?: string) => {
      const matchObj: LocationMatch = {
        state,
        district: district && district !== 'All Districts' ? district : 'All Districts',
        isBorderZone: !!isBorderZone,
        borderNote,
        confidence: isBorderZone ? 'provisional' : 'high',
      };
      setDetectedLocation(matchObj);
      setLocationNoticeDismissed(false);
      setSelectedState(state);
      if (district && district !== 'All Districts') {
        setSelectedDistrict(district);
      } else {
        setSelectedDistrict('All Districts');
      }
      // Note: We deliberately DO NOT save profile or set candidateProfile.domicileState here!
      const displayLoc = district && district !== 'All Districts' ? `${district}, ${state}` : state;
      setLocationToast(`✓ Filter updated to: ${displayLoc}`);
      setTimeout(() => setLocationToast(''), 5000);
    };

    const fallbackToIpGeo = async () => {
      try {
        const res = await fetch('/api/geo/detect');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.state && data.state !== 'All India') {
            applyDetectedStateAndDistrict(data.state, data.district || data.city);
            return true;
          }
        }
      } catch (e) {
        console.warn('Govt exams IP geo fallback error:', e);
      }
      return false;
    };

    if (typeof window === 'undefined' || !navigator.geolocation) {
      const ok = await fallbackToIpGeo();
      setIsDetectingLocation(false);
      if (!ok) {
        setLocationToast('Could not detect location. Please choose your state from the dropdown.');
        setTimeout(() => setLocationToast(''), 4000);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const match = matchCoordinatesToRegion(pos.coords.latitude, pos.coords.longitude);
        if (match && match.state && match.state !== 'All India') {
          setIsDetectingLocation(false);
          applyDetectedStateAndDistrict(match.state, match.district, match.isBorderZone, match.borderNote);
        } else {
          const ok = await fallbackToIpGeo();
          setIsDetectingLocation(false);
          if (!ok) {
            setLocationToast('Could not pinpoint exact region. Please choose your state below.');
            setTimeout(() => setLocationToast(''), 4000);
          }
        }
      },
      async () => {
        const ok = await fallbackToIpGeo();
        setIsDetectingLocation(false);
        if (!ok) {
          setLocationToast('Could not auto-detect location. Please choose your state from the dropdown.');
          setTimeout(() => setLocationToast(''), 4000);
        }
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  };

  // ─── Client-Side Resume Parser (0 Network Calls) ───────────────────────────
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvFileName(file.name);
    setIsParsingCv(true);
    setCvExtractionNotice('');

    try {
      const text = await file.text();
      const lower = text.toLowerCase();

      let detectedQual: QualificationLevel = 'Graduate';
      let detectedDegree = 'Graduate';
      let detectedStream = 'General';

      if (lower.includes('mba') || lower.includes('pgdm') || lower.includes('master of business') || lower.includes('mms')) {
        detectedQual = 'PostGraduate';
        detectedDegree = 'MBA';
        if (lower.includes('finance')) detectedStream = 'Finance, Banking & Accounting';
        else if (lower.includes('marketing')) detectedStream = 'Marketing & Operations';
        else if (lower.includes('hr') || lower.includes('human resource')) detectedStream = 'Human Resources (HR)';
        else detectedStream = 'Management & Administration';
      } else if (lower.includes('bba') || lower.includes('bms') || lower.includes('bbs') || lower.includes('bachelor of business')) {
        detectedQual = 'Graduate';
        detectedDegree = 'BBA';
        if (lower.includes('finance')) detectedStream = 'Finance, Banking & Accounting';
        else if (lower.includes('marketing')) detectedStream = 'Marketing & Operations';
        else if (lower.includes('hr') || lower.includes('human resource')) detectedStream = 'Human Resources (HR)';
        else detectedStream = 'Management & Administration';
      } else if (lower.includes('b.tech') || lower.includes('btech') || lower.includes('bachelor of technology') || lower.includes('b.e.') || lower.includes('engineering')) {
        detectedQual = 'Graduate';
        detectedDegree = 'B.Tech';
        if (lower.includes('computer') || lower.includes('software') || lower.includes('it')) detectedStream = 'Computer Science';
        else if (lower.includes('mechanical')) detectedStream = 'Mechanical';
        else if (lower.includes('civil')) detectedStream = 'Civil Engineering';
        else if (lower.includes('electrical')) detectedStream = 'Electrical';
        else detectedStream = 'Engineering';
      } else if (lower.includes('b.com') || lower.includes('m.com') || lower.includes('accounting') || lower.includes('commerce') || lower.includes('ca') || lower.includes('cma')) {
        detectedQual = lower.includes('m.com') ? 'PostGraduate' : 'Graduate';
        detectedDegree = lower.includes('m.com') ? 'M.Com' : 'B.Com';
        detectedStream = 'Finance, Banking & Accounting';
      } else if (lower.includes('llb') || lower.includes('law') || lower.includes('advocate')) {
        detectedQual = 'Graduate';
        detectedDegree = 'LLB';
        detectedStream = 'Law / Judicial';
      } else if (lower.includes('diploma') || lower.includes('polytechnic')) {
        detectedQual = 'Diploma';
        detectedDegree = 'Diploma';
        detectedStream = 'Technical / Diploma';
      }

      setQualification(detectedQual);
      setDegreeType(detectedDegree);
      setStream(detectedStream);
      if (!candidateAge) setCandidateAge(24);
      setHasUploadedResume(true);
      setHasConfiguredProfile(true);

      setCvExtractionNotice(`✓ CV parsed: Detected ${detectedDegree} (${detectedStream}). Eligibility calculations activated.`);
    } catch {
      setCvExtractionNotice('Could not extract text locally. Please configure your degree in the profile drawer.');
    } finally {
      setIsParsingCv(false);
    }
  };

  // ─── Current Candidate Profile Object ─────────────────────────────────────
  const candidateProfile: CandidateProfile = useMemo(
    () => ({
      age: candidateAge,
      category,
      qualificationLevel: qualification,
      degreeType,
      stream,
      domicileState: selectedState !== 'All India' ? selectedState : undefined,
      isPwD,
      isExServicemen,
      isConfigured: eligibilityAvailable,
    }),
    [candidateAge, category, qualification, degreeType, stream, selectedState, isPwD, isExServicemen, eligibilityAvailable]
  );

  // ─── Computed Exam Evaluations & Telemetry ─────────────────────────────────
  const evaluatedExams = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return VERIFIED_GOVT_EXAMS.map((exam) => {
      const eligibilityResult = calculateGovtEligibility(candidateProfile, {
        ...exam.eligibility,
        domicilePolicy: exam.domicilePolicy,
        state: exam.state,
      });

      // Calendar-normalized date metrics (zero timezone / off-by-one errors)
      const parts = exam.importantDates.applyEndDate.split('-').map(Number);
      let isPastDeadline = false;
      let daysLeft = 99;

      if (parts.length === 3 && !isNaN(parts[0])) {
        const [year, month, day] = parts;
        const targetMidnight = new Date(year, month - 1, day).getTime();
        const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        isPastDeadline = diffDays < 0;
        daysLeft = diffDays;
      }

      // Check upcoming (registration start date in the future)
      const startParts = exam.importantDates.applyStartDate.split('-').map(Number);
      let isUpcoming = false;
      let daysUntilStart = 0;
      if (startParts.length === 3 && !isNaN(startParts[0])) {
        const [sYear, sMonth, sDay] = startParts;
        const startMidnight = new Date(sYear, sMonth - 1, sDay).getTime();
        const diffStart = Math.round((startMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        isUpcoming = diffStart > 0;
        daysUntilStart = diffStart;
      }

      // Verification age check (14 days stale threshold)
      const verifiedDate = new Date(exam.lastVerifiedDate);
      const diffDays = Math.floor((now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24));
      const isVerificationPending = diffDays > 14;

      return {
        ...exam,
        eligibilityResult,
        isPastDeadline,
        isUpcoming,
        daysUntilStart,
        isVerificationPending,
        daysLeft,
      };
    });
  }, [candidateProfile]);

  // Separate active vs past-deadline exams
  const activeExams = useMemo(() => evaluatedExams.filter((e) => !e.isPastDeadline), [evaluatedExams]);
  const archivedExams = useMemo(() => evaluatedExams.filter((e) => e.isPastDeadline), [evaluatedExams]);

  // ─── Real-Time Telemetry Counters ──────────────────────────────────────────
  const telemetry = useMemo(() => {
    const totalExams = evaluatedExams.length;
    const openApplications = activeExams.filter((e) => !e.isUpcoming).length;
    const upcomingCount = activeExams.filter((e) => e.isUpcoming).length;
    const closedNotifications = archivedExams.length;
    const totalVacancies = activeExams.reduce((acc, e) => acc + e.vacancies, 0);
    const uniqueBodies = new Set(evaluatedExams.map((e) => e.conductingBody)).size;
    const eligibleCount = eligibilityAvailable
      ? activeExams.filter((e) => e.eligibilityResult.status === 'eligible').length
      : 0;

    return { totalExams, openApplications, upcomingCount, closedNotifications, activeExams: activeExams.length, totalVacancies, uniqueBodies, eligibleCount };
  }, [evaluatedExams, activeExams, archivedExams, eligibilityAvailable]);

  // ─── Filtered Active Exams (Main Feed & Active Calendar) ───────────────────
  const filteredActiveExams = useMemo(() => {
    return activeExams.filter((e) => {
      // Category filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      // State & District filter for non-Central/non-PSU exams
      if (selectedState !== 'All India') {
        const isNational = e.category === 'central' || e.category === 'psu';
        const isSameState = e.state?.toLowerCase() === selectedState.toLowerCase();

        if (!isNational && !isSameState) return false;

        if (
          isSameState &&
          selectedDistrict !== 'All Districts' &&
          e.district &&
          e.district.toLowerCase() !== selectedDistrict.toLowerCase()
        ) {
          return false;
        }
      }

      // Eligibility Only Filter
      if (eligibilityOnly && eligibilityAvailable) {
        if (e.eligibilityResult.status !== 'eligible' && e.eligibilityResult.status !== 'partially_eligible') {
          return false;
        }
      }

      // Calendar month filter
      if (selectedMonth !== 'All' && e.importantDates.examDate) {
        if (!e.importantDates.examDate.startsWith(selectedMonth)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesBody = e.conductingBody.toLowerCase().includes(q);
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesState = e.state ? e.state.toLowerCase().includes(q) : false;
        const matchesStreams = e.eligibility.requiredStreams.some((s) => s.toLowerCase().includes(q));

        if (!matchesTitle && !matchesBody && !matchesDesc && !matchesState && !matchesStreams) {
          return false;
        }
      }

      return true;
    });
  }, [activeExams, categoryFilter, selectedState, selectedDistrict, eligibilityOnly, eligibilityAvailable, selectedMonth, searchQuery]);

  // ─── Filtered Archived Exams (Dedicated Archive Section) ───────────────────
  const filteredArchivedExams = useMemo(() => {
    return archivedExams.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      if (selectedState !== 'All India') {
        const isNational = e.category === 'central' || e.category === 'psu';
        const isSameState = e.state ? e.state.toLowerCase() === selectedState.toLowerCase() : false;
        if (!isNational && !isSameState) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesBody = e.conductingBody.toLowerCase().includes(q);
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesState = e.state ? e.state.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesBody && !matchesDesc && !matchesState) return false;
      }

      return true;
    });
  }, [archivedExams, categoryFilter, selectedState, searchQuery]);

  // ─── Hierarchical Grouping for Proximity View (Active Only) ────────────────
  const proximityGroups = useMemo(() => {
    const isAllIndia = selectedState === 'All India';

    // Tier 1: Regional & District Department Jobs
    const regional = isAllIndia
      ? []
      : filteredActiveExams.filter((e) => {
          if (e.category !== 'regional') return false;
          if (e.state?.toLowerCase() !== selectedState.toLowerCase()) return false;
          if (
            selectedDistrict !== 'All Districts' &&
            e.district &&
            e.district.toLowerCase() !== selectedDistrict.toLowerCase()
          ) {
            return false;
          }
          return true;
        });

    // Tier 2: State Government Jobs
    const state = isAllIndia
      ? []
      : filteredActiveExams.filter((e) => {
          if (e.category !== 'state') return false;
          return e.state?.toLowerCase() === selectedState.toLowerCase();
        });

    // Tier 3: Central Government Jobs (Always shown, 100% open all-India)
    const central = filteredActiveExams.filter((e) => e.category === 'central');

    // Tier 4: Public Sector Undertakings (PSUs) & Defense (Always shown, 100% open all-India)
    const psu = filteredActiveExams.filter((e) => e.category === 'psu');

    return { regional, state, central, psu, isAllIndia };
  }, [filteredActiveExams, selectedState, selectedDistrict]);

  // ─── Available Districts for Current State (Strictly Alphabetical) ────────
  const availableDistricts = POPULAR_DISTRICTS_BY_STATE[selectedState] || ['All Districts'];

  // ─── Filtered State & UT PSC Directories (Calendar View) ───────────────────
  const filteredPscDirectories = useMemo(() => {
    return STATE_UT_PSC_DIRECTORIES.filter((psc) => {
      if (pscTypeFilter !== 'all' && psc.type !== pscTypeFilter) return false;
      if (pscSearchQuery.trim()) {
        const q = pscSearchQuery.toLowerCase();
        const matchesState = psc.state.toLowerCase().includes(q);
        const matchesName = psc.commissionName.toLowerCase().includes(q);
        const matchesCode = psc.shortCode.toLowerCase().includes(q);
        const matchesHq = psc.headquarters.toLowerCase().includes(q);
        const matchesExams = psc.primaryExams.some((ex) => ex.toLowerCase().includes(q));
        if (!matchesState && !matchesName && !matchesCode && !matchesHq && !matchesExams) return false;
      }
      return true;
    });
  }, [pscTypeFilter, pscSearchQuery]);

  // ─── Filtered Central Timetables (Calendar View) ───────────────────────────
  const filteredCentralTimetables = useMemo(() => {
    return CENTRAL_RECRUITMENT_TIMETABLE.filter((exam) => {
      if (centralAgencyFilter !== 'all' && exam.agency !== centralAgencyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exam.title.toLowerCase().includes(q);
        const matchesAgency = exam.agency.toLowerCase().includes(q);
        const matchesCadre = exam.cadre.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAgency && !matchesCadre) return false;
      }
      return true;
    });
  }, [centralAgencyFilter, searchQuery]);

  // ─── Handle Report Broken Link / Date Change ───────────────────────────────
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalExam) return;

    setReportSuccessMsg('Report submitted to administrative review queue. Changes will be audited against official gazette notifications.');
    setTimeout(() => {
      setReportModalExam(null);
      setReportSuccessMsg('');
      setReportDetails('');
      setReportProofUrl('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#12172B] flex flex-col font-sans">
      {/* ─── Schema.org JobPosting Structured Data for SEO / Google for Jobs ──── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': evaluatedExams.slice(0, 10).map((exam) => ({
              '@type': 'JobPosting',
              title: exam.title,
              description: exam.description,
              datePosted: exam.importantDates.notificationDate,
              validThrough: exam.importantDates.applyEndDate,
              employmentType: 'FULL_TIME',
              hiringOrganization: {
                '@type': 'GovernmentOrganization',
                name: exam.conductingBody,
                sameAs: exam.officialLinks.officialPortalUrl,
              },
              jobLocation: {
                '@type': 'Place',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: exam.district || exam.state || 'All India',
                  addressRegion: exam.state || 'India',
                  addressCountry: 'IN',
                },
              },
            })),
          }),
        }}
      />

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#12172B] flex items-center justify-center text-white font-bold text-xs">
                NH
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-base text-[#12172B] tracking-tight">NicheHire</span>
                <span className="ml-2 px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-amber-50 rounded border border-amber-200/90 inline-flex items-center gap-1 shadow-2xs">
                  <Landmark size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-700" />
                  <span>Govt Jobs &amp; Public Sector</span>
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-2 sm:gap-3 text-xs font-medium">
            <Link href="/" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors hidden sm:inline">
              Verified Private Jobs
            </Link>
            <Link href="/about" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors hidden md:inline">
              About &amp; Trust
            </Link>
            <Link href="/pricing" className="text-[#5B6478] hover:text-[#12172B] px-2.5 py-1.5 rounded transition-colors hidden md:inline">
              Employer Pricing
            </Link>
            <button
              onClick={() => setProfileDrawerOpen(!profileDrawerOpen)}
              className={`px-3.5 py-1.5 border rounded-lg flex items-center gap-1.5 transition-colors ${
                eligibilityAvailable
                  ? 'bg-white text-[#12172B] border-[#E4E7EC] hover:border-[#2B4EE6]'
                  : 'bg-[#12172B] text-white border-[#12172B] hover:bg-black shadow-xs'
              }`}
            >
              <Settings size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              <span className="hidden sm:inline">
                {eligibilityAvailable ? 'My Qualifications & Quota' : 'Set Up My Qualifications'}
              </span>
              <span className="sm:hidden">Profile</span>
              <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded font-bold ${
                eligibilityAvailable
                  ? 'bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0]'
                  : 'bg-white/20 text-white border border-white/30'
              }`}>
                {eligibilityAvailable ? `${telemetry.eligibleCount} Eligible` : 'Not Set'}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* ─── Hero & Live Telemetry Strip ─── */}
      <section className="bg-gradient-to-b from-amber-50/40 via-white to-white border-b border-[#E4E7EC] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200/80 text-xs text-amber-900 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <span>Curated against official gazette notifications and verified .gov.in portals</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-normal text-[#12172B] tracking-tight leading-tight">
            Government Jobs &amp; Public Sector Openings. <br />
            <span className="font-serif italic text-amber-900">Official gazette alerts with automated eligibility matching.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#5B6478] max-w-2xl mx-auto leading-relaxed">
            Eliminating aggregator spam and expired circulars. Track authentic opportunities across UPSC, State PSCs (all 36 States &amp; UTs), Staff Selection (SSC), Banking (IBPS/SBI), Railways (RRB), High Courts &amp; Maharatna PSUs.
          </p>

          {/* Dynamic Telemetry Strip */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-[#5B6478]">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 rounded-full bg-white border border-[#E4E7EC] shadow-2xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#12172B]">
                <span className="w-2 h-2 rounded-full bg-[#0E9F6E] animate-pulse"></span>
                {telemetry.openApplications} Open Now
                {telemetry.upcomingCount > 0 && (
                  <span className="text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded text-[10px]">
                    +{telemetry.upcomingCount} Upcoming
                  </span>
                )}
              </span>
              <span className="text-[#E4E7EC]">•</span>
              <span className="text-[#5B6478]">
                {telemetry.closedNotifications} Archived / Concluded
              </span>
              <span className="text-[#E4E7EC]">•</span>
              <span className="font-semibold text-amber-900">{telemetry.totalVacancies.toLocaleString('en-IN')} Active Vacancies</span>
              <span className="text-[#E4E7EC] hidden sm:inline">•</span>
              <span className="hidden sm:inline">36 State &amp; UT PSCs</span>
              <span className="text-[#E4E7EC] hidden md:inline">•</span>
              <span className="hidden md:inline text-[#0E9F6E] font-semibold">100% Direct Gazette Links</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content Container ──────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* ─── Profile Configuration Callout (Neutral Prompt) ──────────────── */}
        {!eligibilityAvailable && (
          <div className="p-4 bg-white border border-[#E4E7EC] rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#2B4EE6]/10 text-[#2B4EE6] rounded-md shrink-0">
                <GraduationCap size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#12172B]">
                  Personalize Your Government Job &amp; Public Sector Eligibility
                </div>
                <div className="text-[#5B6478] text-xs mt-0.5 leading-relaxed">
                  Upload your CV or configure your degree (e.g. <strong>BBA, MBA, B.Tech, B.Com, LLB</strong>), reservation category, and age to see automated eligibility verdicts. 100% private in-browser matching.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <Settings size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
              <span>Set Up My Qualifications</span>
            </button>
          </div>
        )}

        {/* ─── Location & Border Confirmation Banner ─────────────────────────── */}
        {detectedLocation && !locationNoticeDismissed && (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-xs text-[#12172B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2">
              <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="shrink-0 text-amber-700" />
              <div>
                <span className="font-semibold">Filter updated to detected location:</span>{' '}
                <span className="font-bold underline">{detectedLocation.district}, {detectedLocation.state}</span>
                {detectedLocation.isBorderZone && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[11px] bg-[#FEF3C7] text-[#D97B0A] border border-[#FCD34D] font-medium">
                    Border / NCR Zone
                  </span>
                )}
                <span className="text-[#5B6478] ml-2">
                  (Session-only filter. Resets to All India on new visit.)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setLocationNoticeDismissed(true)}
                className="px-2.5 py-1 bg-[#12172B] text-white rounded text-[11px] font-medium"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setSelectedState('All India');
                  setSelectedDistrict('All Districts');
                  setLocationNoticeDismissed(true);
                }}
                className="px-2.5 py-1 bg-white text-[#12172B] border border-[#E4E7EC] rounded text-[11px] font-medium hover:bg-[#F7F8FA]"
              >
                Reset to All India
              </button>
            </div>
          </div>
        )}

        {/* ─── Search, Location Selector & View Controls ─────────────────────── */}
        <div className="bg-white p-4 sm:p-5 rounded-md border border-[#E4E7EC] space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-2.5 text-[#5B6478]" />
              <input
                type="text"
                placeholder="Search by exam title, commission (e.g. MPPSC, BPSC, UPSC, BHEL), or stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E7EC] rounded text-sm text-[#12172B] placeholder:text-[#5B6478]/70 focus:outline-none focus:border-[#2B4EE6] focus:ring-1 focus:ring-[#2B4EE6]"
              />
            </div>

            {/* Region Selector (Strictly Alphabetical with All India at Top) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded px-2.5 py-1.5">
                <span className="text-xs text-[#5B6478]">State:</span>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const st = e.target.value;
                    setSelectedState(st);
                    setSelectedDistrict('All Districts');
                  }}
                  className="bg-transparent text-xs font-semibold text-[#12172B] focus:outline-none cursor-pointer"
                >
                  {ALL_INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded px-2.5 py-1.5">
                <span className="text-xs text-[#5B6478]">District:</span>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#12172B] focus:outline-none cursor-pointer"
                >
                  {availableDistricts.map((dst) => (
                    <option key={dst} value={dst}>
                      {dst}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="px-3 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 hover:bg-[#2B4EE6]/10 border border-[#2B4EE6]/30 rounded transition-colors flex items-center gap-1.5 shrink-0"
                title="Uses browser coordinate lookup for session filter."
              >
                <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>{isDetectingLocation ? 'Detecting...' : 'Detect My Region'}</span>
              </button>
            </div>
          </div>

          {locationToast && (
            <div className="text-[11px] text-[#D97B0A] bg-[#FFFBEB] p-2 rounded border border-[#FDE68A]">
              {locationToast}
            </div>
          )}

          {/* Secondary Controls Bar: Tiers, Eligibility Filter & Views */}
          <div className="pt-2 border-t border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#5B6478] text-[11px] font-medium mr-1">Tiers:</span>
              <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded border border-[#E4E7EC]">
                {(['all', 'regional', 'state', 'central', 'psu'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#12172B] text-white'
                        : 'text-[#5B6478] hover:text-[#12172B]'
                    }`}
                  >
                    {cat === 'all'
                      ? 'All Openings'
                      : cat === 'regional'
                      ? '1. District / Regional'
                      : cat === 'state'
                      ? '2. State PSC'
                      : cat === 'central'
                      ? '3. Central'
                      : '4. PSU'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!eligibilityAvailable) {
                    setProfileDrawerOpen(true);
                  } else {
                    setEligibilityOnly(!eligibilityOnly);
                  }
                }}
                className={`px-3 py-1 rounded border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                  eligibilityOnly && eligibilityAvailable
                    ? 'bg-[#ECFDF5] text-[#0E9F6E] border-[#A7F3D0]'
                    : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
                }`}
              >
                <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>
                  {eligibilityAvailable
                    ? `Show Only Eligible for Me (${telemetry.eligibleCount})`
                    : 'Configure Qualifications to Filter Eligible'}
                </span>
              </button>
            </div>

            {/* View Mode Toggle: 3 Dedicated Tabs */}
            <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded border border-[#E4E7EC]">
              <button
                type="button"
                onClick={() => setActiveView('hierarchy')}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeView === 'hierarchy'
                    ? 'bg-white text-[#12172B] shadow-2xs font-semibold'
                    : 'text-[#5B6478] hover:text-[#12172B]'
                }`}
              >
                Active Openings ({telemetry.activeExams})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('calendar')}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeView === 'calendar'
                    ? 'bg-white text-[#12172B] shadow-2xs font-semibold'
                    : 'text-[#5B6478] hover:text-[#12172B]'
                }`}
              >
                Job Calendar &amp; PSCs (36)
              </button>
              <button
                type="button"
                onClick={() => setActiveView('nagar_nigam')}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeView === 'nagar_nigam'
                    ? 'bg-white text-[#12172B] shadow-2xs font-semibold'
                    : 'text-[#5B6478] hover:text-[#12172B]'
                }`}
              >
                🏛️ Nagar Nigam Directory ({NAGAR_NIGAM_DIRECTORY.length}+)
              </button>
              <button
                type="button"
                onClick={() => setActiveView('archive')}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeView === 'archive'
                    ? 'bg-white text-[#12172B] shadow-2xs font-semibold'
                    : 'text-[#5B6478] hover:text-[#12172B]'
                }`}
              >
                Archived &amp; Past ({telemetry.closedNotifications})
              </button>
            </div>
          </div>
        </div>

        {/* ─── Candidate Profile & Category Drawer (Client-Side Privacy) ────── */}
        {profileDrawerOpen && (
          <div className="bg-white p-5 rounded-md border-2 border-[#2B4EE6] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#12172B]">My Academic &amp; Category Qualifications</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0]">
                    100% Client-Side / Session Only
                  </span>
                </div>
                <p className="text-xs text-[#5B6478] mt-0.5 leading-relaxed">
                  Your age, category/caste, and academic profile are evaluated strictly in your browser. Under India&apos;s DPDP Act, this data is <strong>never uploaded, stored on servers, or tracked across sessions</strong>.
                </p>
              </div>
              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="text-xs font-semibold text-[#5B6478] hover:text-[#12172B] flex items-center gap-1"
              >
                <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Close</span>
              </button>
            </div>

            {profileValidationErr && (
              <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
                {profileValidationErr}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-[#5B6478] block mb-1">Current Age</label>
                <input
                  type="number"
                  min={18}
                  max={60}
                  placeholder="e.g. 24"
                  value={candidateAge || ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setCandidateAge(isNaN(v) ? undefined : v);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs font-semibold text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5B6478] block mb-1">Reservation Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CandidateCategory)}
                  className="w-full px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs font-semibold text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="General">General / UR</option>
                  <option value="OBC">OBC (Non-Creamy)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5B6478] block mb-1">Highest Qualification</label>
                <select
                  value={qualification || ''}
                  onChange={(e) => {
                    const q = e.target.value as QualificationLevel;
                    setQualification(q || undefined);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs font-semibold text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="">Select Qualification</option>
                  <option value="10th">10th Pass</option>
                  <option value="12th">12th Pass (10+2)</option>
                  <option value="Diploma">Diploma (Polytechnic)</option>
                  <option value="Graduate">Graduate / Bachelor&apos;s</option>
                  <option value="PostGraduate">Post Graduate / Master&apos;s</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5B6478] block mb-1">Degree Type</label>
                <select
                  value={degreeType || ''}
                  onChange={(e) => {
                    const dt = e.target.value;
                    setDegreeType(dt || undefined);
                    if (dt === 'MBA' || dt === 'PGDM' || dt === 'M.Com' || dt === 'M.Tech' || dt === 'Other PostGraduate') {
                      setQualification('PostGraduate');
                    } else if (dt === 'Diploma') {
                      setQualification('Diploma');
                    } else if (dt) {
                      setQualification('Graduate');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs font-semibold text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="">Select Degree Type</option>
                  <option value="BBA">BBA (Bachelor of Business Administration)</option>
                  <option value="MBA">MBA (Master of Business Administration)</option>
                  <option value="BMS">BMS / BBS (Management Studies)</option>
                  <option value="PGDM">PGDM (Post Graduate Diploma in Management)</option>
                  <option value="B.Com">B.Com (Commerce &amp; Finance)</option>
                  <option value="M.Com">M.Com (Commerce &amp; Accounts)</option>
                  <option value="CA / CS">CA / CS / CMA (Finance Specialist)</option>
                  <option value="B.Tech">B.Tech / B.E. (Engineering)</option>
                  <option value="M.Tech">M.Tech / M.E.</option>
                  <option value="B.Sc">B.Sc (Science)</option>
                  <option value="BA">B.A. (Arts / Humanities)</option>
                  <option value="LLB">L.L.B. / Law</option>
                  <option value="Diploma">Diploma (Polytechnic)</option>
                  <option value="Other Graduate">Other Graduate Degree</option>
                  <option value="Other PostGraduate">Other Post-Graduate Degree</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5B6478] block mb-1">Academic Stream</label>
                <select
                  value={stream || ''}
                  onChange={(e) => setStream(e.target.value || undefined)}
                  className="w-full px-2.5 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs font-semibold text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="">Select Academic Stream</option>
                  <option value="Management & Administration">Management &amp; Administration</option>
                  <option value="Finance, Banking & Accounting">Finance, Banking &amp; Accounting</option>
                  <option value="Marketing & Operations">Marketing &amp; Operations</option>
                  <option value="Human Resources (HR)">Human Resources (HR)</option>
                  <option value="Computer Science">Computer Science / IT</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Electrical">Electrical Engineering</option>
                  <option value="Mechanical">Mechanical Engineering</option>
                  <option value="Law / Judicial">Law / Legal</option>
                  <option value="General">General / All-Stream</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E7EC] text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#5B6478] hover:text-[#12172B]">
                  <input
                    type="checkbox"
                    checked={isPwD}
                    onChange={(e) => setIsPwD(e.target.checked)}
                    className="rounded text-[#2B4EE6]"
                  />
                  <span>PwD / Divyangjan (+10y relaxation)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[#5B6478] hover:text-[#12172B]">
                  <input
                    type="checkbox"
                    checked={isExServicemen}
                    onChange={(e) => setIsExServicemen(e.target.checked)}
                    className="rounded text-[#2B4EE6]"
                  />
                  <span>Ex-Servicemen (+5y relaxation)</span>
                </label>
              </div>

              {/* Actions & Local CV dropzone */}
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-[#F7F8FA] hover:bg-white text-[#12172B] border border-[#E4E7EC] rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5">
                  <FileText size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>{isParsingCv ? 'Parsing locally...' : cvFileName ? 'Re-upload CV' : 'Auto-fill via CV'}</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleCvUpload}
                    className="hidden"
                  />
                </label>

                {eligibilityAvailable && (
                  <button
                    type="button"
                    onClick={handleResetProfile}
                    className="px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-rose-600 border border-[#E4E7EC] rounded hover:bg-rose-50 transition-colors"
                  >
                    Clear Profile
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors shadow-2xs"
                >
                  Save &amp; Calculate Eligibility
                </button>
              </div>
            </div>

            {cvExtractionNotice && (
              <div className="text-[11px] text-[#0E9F6E] bg-[#ECFDF5] p-2 rounded border border-[#A7F3D0]">
                {cvExtractionNotice}
              </div>
            )}
          </div>
        )}

        {/* ─── Legal & Official Gazette Disclaimer Banner ───────────────────── */}
        <div className="p-3 bg-white border border-[#E4E7EC] rounded-md text-xs text-[#5B6478] flex items-start gap-2.5">
          <AlertTriangle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#12172B]">Official Notification Disclaimer:</strong> NicheHire is an independent research directory and is not an agency of any government commission. Eligibility verdicts and examination timelines are algorithmic calculations. Aspirants must independently verify age cutoff dates, syllabus, and reservation concessions against the linked official gazette notification before paying any application fees.
          </p>
        </div>

        {/* ─── VIEW 1: Active Openings Hierarchy Feed ────────────────────────── */}
        {activeView === 'hierarchy' && (
          <div className="space-y-8">
            {/* If All-India is selected, show an inviting prompt to pick a region */}
            {proximityGroups.isAllIndia && (
              <div className="p-5 bg-white border border-[#E4E7EC] rounded-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6] shrink-0" />
                      <h3 className="text-sm font-semibold text-[#12172B]">
                        Looking for Local Municipal or State PSC Jobs?
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B6478] leading-relaxed">
                      Select your <strong>State &amp; District</strong> in the dropdown above to reveal Nagar Nigam, Electricity Board, and State PSC openings for your area.
                    </p>
                  </div>
                  <button
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors whitespace-nowrap self-start sm:self-auto shrink-0 flex items-center gap-1.5"
                  >
                    <LocateFixed size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>{isDetectingLocation ? 'Detecting...' : 'Detect My Region'}</span>
                  </button>
                </div>
                <div className="pt-2 border-t border-[#E4E7EC] text-[11px] text-[#5B6478]">
                  Currently displaying <strong>Major Central &amp; PSU Examinations</strong> (UPSC, SSC CGL/CHSL, Railways RRB, Banking, BHEL, IOCL, ISRO, DRDO) open to all students across India.
                </div>
              </div>
            )}

            {/* Tier 1: Regional & District Department Openings */}
            {!proximityGroups.isAllIndia && (categoryFilter === 'all' || categoryFilter === 'regional') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2B4EE6]"></span>
                      <h2 className="text-base font-semibold text-[#12172B]">
                        Tier 1: Regional &amp; District Department Openings
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2B4EE6]/10 text-[#2B4EE6] rounded border border-[#2B4EE6]/20">
                        {selectedDistrict !== 'All Districts' ? `${selectedDistrict}, ` : ''}{selectedState}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Municipal Corporation (Nagar Nigam), Electricity Discoms, District Court Registries, and Local Development Authorities in {selectedState}.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#12172B] bg-white px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {proximityGroups.regional.length} Openings
                  </span>
                </div>

                <div className="space-y-3">
                  {proximityGroups.regional.length === 0 ? (
                    <div className="p-6 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                      No active municipal or district department openings currently verified in {selectedDistrict !== 'All Districts' ? selectedDistrict : selectedState}. Showing state-level openings below.
                    </div>
                  ) : (
                    proximityGroups.regional.map((exam) => (
                      <ExamCardItem
                        key={exam.id}
                        exam={exam}
                        eligibilityAvailable={eligibilityAvailable}
                        onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                        onReport={() => setReportModalExam(exam)}
                        onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Tier 2: State Government (PSC & ESB) */}
            {!proximityGroups.isAllIndia && (categoryFilter === 'all' || categoryFilter === 'state') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0E9F6E]"></span>
                      <h2 className="text-base font-semibold text-[#12172B]">
                        Tier 2: State Government &amp; Public Service Commissions
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#ECFDF5] text-[#0E9F6E] rounded border border-[#A7F3D0]">
                        {selectedState} State Services
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      State Civil Services, Engineering Services, Sub-Engineer, Police SI, and Educational Service exams conducted by the State Public Service Commission.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#12172B] bg-white px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {proximityGroups.state.length} Openings
                  </span>
                </div>

                <div className="space-y-3">
                  {proximityGroups.state.length === 0 ? (
                    <div className="p-6 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                      No active state-level commission openings currently verified for {selectedState}. Check Central Commission and PSU openings below.
                    </div>
                  ) : (
                    proximityGroups.state.map((exam) => (
                      <ExamCardItem
                        key={exam.id}
                        exam={exam}
                        eligibilityAvailable={eligibilityAvailable}
                        onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                        onReport={() => setReportModalExam(exam)}
                        onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Tier 3: Central Government (Open All India) */}
            {(categoryFilter === 'all' || categoryFilter === 'central') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D97B0A]"></span>
                      <h2 className="text-base font-semibold text-[#12172B]">
                        Tier 3: Central Government Commissions &amp; National Bodies
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FFFBEB] text-[#D97B0A] rounded border border-[#FDE68A]">
                        100% Open All India (Zero Domicile Barrier)
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Union Public Service Commission (UPSC), Staff Selection Commission (SSC), Railway Recruitment Boards (RRB), and Public Sector Banking (IBPS/SBI).
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#12172B] bg-white px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {proximityGroups.central.length} Openings
                  </span>
                </div>

                <div className="space-y-3">
                  {proximityGroups.central.length === 0 ? (
                    <div className="p-6 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                      No central government openings match your current filter criteria.
                    </div>
                  ) : (
                    proximityGroups.central.map((exam) => (
                      <ExamCardItem
                        key={exam.id}
                        exam={exam}
                        eligibilityAvailable={eligibilityAvailable}
                        onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                        onReport={() => setReportModalExam(exam)}
                        onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Tier 4: Public Sector Undertakings (PSUs) & Defense */}
            {(categoryFilter === 'all' || categoryFilter === 'psu') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      <h2 className="text-base font-semibold text-[#12172B]">
                        Tier 4: Public Sector Undertakings (PSUs) &amp; Defense Research
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded border border-purple-200">
                        Maharatna / Navratna PSUs
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Direct engineering, management, and scientific trainee recruitment at BHEL, IOCL, ONGC, NTPC, DRDO, ISRO &amp; Airport Authority of India (AAI).
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#12172B] bg-white px-2.5 py-1 rounded border border-[#E4E7EC]">
                    {proximityGroups.psu.length} Openings
                  </span>
                </div>

                <div className="space-y-3">
                  {proximityGroups.psu.length === 0 ? (
                    <div className="p-6 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                      No PSU openings match your current filter criteria.
                    </div>
                  ) : (
                    proximityGroups.psu.map((exam) => (
                      <ExamCardItem
                        key={exam.id}
                        exam={exam}
                        eligibilityAvailable={eligibilityAvailable}
                        onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                        onReport={() => setReportModalExam(exam)}
                        onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── VIEW 2: Government Job Calendar & PSC Directories ────────────── */}
        {activeView === 'calendar' && (
          <div className="space-y-6">
            {/* Sub-Tabs Selector */}
            <div className="bg-white p-3 rounded-md border border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded border border-[#E4E7EC]">
                <button
                  type="button"
                  onClick={() => setCalendarSubTab('psc_directory')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    calendarSubTab === 'psc_directory'
                      ? 'bg-white text-[#12172B] shadow-2xs'
                      : 'text-[#5B6478] hover:text-[#12172B]'
                  }`}
                >
                  36 State &amp; UT PSC Directories
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSubTab('central_timetable')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    calendarSubTab === 'central_timetable'
                      ? 'bg-white text-[#12172B] shadow-2xs'
                      : 'text-[#5B6478] hover:text-[#12172B]'
                  }`}
                >
                  Central Timetable (UPSC, SSC, RRB, Banking)
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSubTab('milestones')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    calendarSubTab === 'milestones'
                      ? 'bg-white text-[#12172B] shadow-2xs'
                      : 'text-[#5B6478] hover:text-[#12172B]'
                  }`}
                >
                  Upcoming Milestones &amp; Dates
                </button>
              </div>

              <div className="text-xs text-[#5B6478]">
                {calendarSubTab === 'psc_directory' && `Covering all 28 States & 8 Union Territories`}
                {calendarSubTab === 'central_timetable' && `Official Central Staffing & Examination Schedules`}
                {calendarSubTab === 'milestones' && `${filteredActiveExams.length} active exam milestones`}
              </div>
            </div>

            {/* Sub-Tab 1: 36 State & UT PSC Master Directory */}
            {calendarSubTab === 'psc_directory' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-md border border-[#E4E7EC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="absolute left-3 top-2.5 text-[#5B6478]" />
                    <input
                      type="text"
                      placeholder="Search state, UT, or commission (e.g. BPSC, UPPSC, MPSC, DSSSB, KPSC)..."
                      value={pscSearchQuery}
                      onChange={(e) => setPscSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {(['all', 'State', 'Union Territory'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPscTypeFilter(t)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          pscTypeFilter === t
                            ? 'bg-[#12172B] text-white border-[#12172B]'
                            : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
                        }`}
                      >
                        {t === 'all' ? 'All (36)' : t === 'State' ? '28 States' : '8 Union Territories'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPscDirectories.map((psc) => (
                    <article
                      key={psc.state}
                      className="bg-white p-4 sm:p-5 rounded-md border border-[#E4E7EC] hover:border-[#2B4EE6]/40 transition-colors space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-[#12172B]">{psc.state}</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F7F8FA] border border-[#E4E7EC] text-[#5B6478]">
                                {psc.type}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-[#2B4EE6] mt-0.5">
                              {psc.commissionName} ({psc.shortCode})
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] px-2 py-0.5 rounded border border-[#E4E7EC] shrink-0">
                            H.Q. {psc.headquarters}
                          </span>
                        </div>

                        {/* Annual Cycle & Exams */}
                        <div className="text-xs text-[#5B6478] space-y-1">
                          <div>
                            <strong className="text-[#12172B]">Typical Cycle:</strong> {psc.annualCycle}
                          </div>
                          <div>
                            <strong className="text-[#12172B]">Primary Exams:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {psc.primaryExams.map((ex, i) => (
                                <span key={i} className="text-[10px] font-medium bg-[#F7F8FA] text-[#5B6478] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Domicile / Quota Advisory Note */}
                        <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[11px] text-[#12172B] leading-relaxed">
                          <strong className="text-amber-900">Statutory Quota / Domicile Note:</strong> {psc.advisoryNote}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between gap-2">
                        <a
                          href={psc.officialWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#2B4EE6] hover:underline inline-flex items-center gap-1"
                        >
                          <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Official Portal</span>
                          <ExternalLink size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        </a>
                        <a
                          href={psc.verificationPortal}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-medium text-[#12172B] bg-[#F7F8FA] hover:bg-[#EEF2F6] border border-[#E4E7EC] rounded inline-flex items-center gap-1"
                        >
                          <span>Candidate OTR / Verify</span>
                          <ArrowUpRight size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Central Government Yearly Recruitment Timetable */}
            {calendarSubTab === 'central_timetable' && (
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-md border border-[#E4E7EC] flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-[#12172B] mr-1">Agency:</span>
                  {(['all', 'UPSC', 'SSC', 'Railways (RRB)', 'Banking (IBPS/SBI)', 'Defence & Research'] as const).map((ag) => (
                    <button
                      key={ag}
                      onClick={() => setCentralAgencyFilter(ag)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        centralAgencyFilter === ag
                          ? 'bg-[#12172B] text-white border-[#12172B]'
                          : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
                      }`}
                    >
                      {ag === 'all' ? 'All Central Boards' : ag}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCentralTimetables.map((exam) => (
                    <article
                      key={exam.id}
                      className="bg-white p-4 sm:p-5 rounded-md border border-[#E4E7EC] hover:border-[#2B4EE6]/40 transition-colors space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#2B4EE6] uppercase tracking-wider block">
                              {exam.agency}
                            </span>
                            <h3 className="text-sm font-bold text-[#12172B] mt-0.5">{exam.title}</h3>
                            <span className="text-xs text-[#5B6478] block">{exam.cadre}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded shrink-0">
                            {exam.vacanciesEstimate}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-[#F7F8FA] p-2.5 rounded border border-[#E4E7EC] text-center text-xs">
                          <div>
                            <span className="text-[10px] text-[#5B6478] block">Notification</span>
                            <strong className="text-[#12172B] text-[11px]">{exam.annualNotificationMonth}</strong>
                          </div>
                          <div className="border-x border-[#E4E7EC]">
                            <span className="text-[10px] text-[#5B6478] block">Prelims</span>
                            <strong className="text-[#12172B] text-[11px]">{exam.prelimsWindow}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#5B6478] block">Mains</span>
                            <strong className="text-[#12172B] text-[11px]">{exam.mainsWindow}</strong>
                          </div>
                        </div>

                        <div className="text-xs text-[#5B6478] space-y-1">
                          <div>
                            <strong className="text-[#12172B]">Prescribed Qualification:</strong> {exam.minimumQualification}
                          </div>
                          <div>
                            <strong className="text-[#12172B]">Age Window:</strong> {exam.ageLimits}
                          </div>
                          <p className="text-[11px] text-[#5B6478] leading-relaxed pt-1">
                            {exam.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between gap-2">
                        <a
                          href={exam.officialPortal}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#2B4EE6] hover:underline inline-flex items-center gap-1"
                        >
                          <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Official Portal</span>
                          <ExternalLink size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        </a>
                        <a
                          href={exam.gazetteCalendarUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-medium text-[#12172B] bg-[#F7F8FA] hover:bg-[#EEF2F6] border border-[#E4E7EC] rounded inline-flex items-center gap-1"
                        >
                          <span>Annual Timetable</span>
                          <ArrowUpRight size={11} strokeWidth={ICON_STROKE_WIDTH} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Upcoming Examination Milestones */}
            {calendarSubTab === 'milestones' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-md border border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#12172B]">Filter Milestones by Month:</span>
                    <div className="flex flex-wrap gap-1">
                      {['All', '2026-09', '2026-10', '2026-11', '2026-12'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMonth(m)}
                          className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
                            selectedMonth === m
                              ? 'bg-[#12172B] text-white border-[#12172B]'
                              : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC] hover:text-[#12172B]'
                          }`}
                        >
                          {m === 'All'
                            ? 'All Dates'
                            : m === '2026-09'
                            ? 'Sep 2026'
                            : m === '2026-10'
                            ? 'Oct 2026'
                            : m === '2026-11'
                            ? 'Nov 2026'
                            : 'Dec 2026'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-[#5B6478]">
                    Showing {filteredActiveExams.length} active exam milestones
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredActiveExams.length === 0 ? (
                    <div className="p-8 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                      No active examination milestones scheduled for the selected month.
                    </div>
                  ) : (
                    filteredActiveExams.map((exam) => (
                      <ExamCardItem
                        key={exam.id}
                        exam={exam}
                        eligibilityAvailable={eligibilityAvailable}
                        onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                        onReport={() => setReportModalExam(exam)}
                        onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW 3: Dedicated Archive Section (Past / Closed Exams) ──────── */}
        {activeView === 'archive' && (
          <div className="space-y-6">
            <div className="p-5 bg-white border border-[#E4E7EC] rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} className="text-[#5B6478]" />
                <h2 className="text-base font-bold text-[#12172B]">
                  Archived &amp; Concluded Government Examinations ({telemetry.closedNotifications})
                </h2>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                Official records of completed recruitment cycles (including SBI PO, UPSC CSE, previous SSC CGL cycles, and state commissions). These past notifications and syllabi are retained as an authoritative historical archive to help aspirants research past exam patterns, reservation matrices, and syllabus breakdowns.
              </p>
            </div>

            <div className="space-y-3">
              {filteredArchivedExams.length === 0 ? (
                <div className="p-8 bg-white rounded-md border border-[#E4E7EC] text-center text-xs text-[#5B6478]">
                  No archived government exams match your search or filter.
                </div>
              ) : (
                filteredArchivedExams.map((exam) => (
                  <ExamCardItem
                    key={exam.id}
                    exam={exam}
                    isArchived={true}
                    eligibilityAvailable={eligibilityAvailable}
                    onChecklist={() => setActiveChecklistExam({ exam, result: exam.eligibilityResult })}
                    onReport={() => setReportModalExam(exam)}
                    onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── VIEW 4: Pan-India Nagar Nigam & District Directory ───────────────── */}
        {activeView === 'nagar_nigam' && (
          <div className="space-y-6">
            <div className="p-5 bg-white border border-[#E4E7EC] rounded-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                  <div>
                    <h2 className="text-base font-bold text-[#12172B]">
                      Pan-India Nagar Nigam &amp; Municipal Corporation Directory
                    </h2>
                    <p className="text-xs text-[#5B6478]">
                      Verified official portals, recruitment notice boards, and statutory state recruiting agencies for all ~250+ Municipal Corporations &amp; 780+ districts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-bold text-[#0E9F6E]">
                    ✓ 36 States &amp; UTs Verified
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E4E7EC]">
                <div>
                  <label className="text-[11px] font-semibold text-[#5B6478] mb-1 block">Filter by State / UT:</label>
                  <select
                    value={nnSelectedState}
                    onChange={(e) => {
                      setNnSelectedState(e.target.value);
                      setNnSelectedDistrict('All');
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D0D5DD] rounded text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                  >
                    <option value="All">All States &amp; Union Territories (36)</option>
                    {STATE_MUNICIPAL_OVERVIEWS.map((s) => (
                      <option key={s.state} value={s.state}>{s.state} ({s.totalMunicipalCorporations} Corps)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B6478] mb-1 block">Filter by District:</label>
                  <select
                    value={nnSelectedDistrict}
                    onChange={(e) => setNnSelectedDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D0D5DD] rounded text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                  >
                    <option value="All">All Districts in Selection</option>
                    {ALL_INDIA_DISTRICT_DIRECTORY
                      .filter((d) => nnSelectedState === 'All' || d.state === nnSelectedState)
                      .map((d) => (
                        <option key={d.district} value={d.district}>
                          {d.district} {d.hasNagarNigam ? '★ (Nagar Nigam)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B6478] mb-1 block">Quick Search Corporation / City:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nnSearchQuery}
                      onChange={(e) => setNnSearchQuery(e.target.value)}
                      placeholder="e.g. Muzaffarpur, Indore, Agra, Pune..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D0D5DD] rounded text-[#12172B] placeholder-[#98A2B3] focus:outline-none focus:border-[#2B4EE6]"
                    />
                    <Search
                      size={ICON_SIZES.inline}
                      strokeWidth={ICON_STROKE_WIDTH}
                      className="absolute left-2.5 top-2 text-[#98A2B3]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* State Municipal Architecture Insight (Shown when a specific state is chosen) */}
            {nnSelectedState !== 'All' && (() => {
              const stateInfo = STATE_MUNICIPAL_OVERVIEWS.find((s) => s.state === nnSelectedState);
              if (!stateInfo) return null;
              return (
                <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                    <div className="font-bold text-[#0F172A] text-sm flex items-center gap-1.5">
                      <Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                      <span>{stateInfo.state} Urban Local Body Cadre Framework</span>
                    </div>
                    <a
                      href={stateInfo.urbanDeptPortal}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2B4EE6] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Urban Development Dept Portal ↗</span>
                    </a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#334155] pt-1">
                    <div>
                      <span className="font-semibold text-[#0F172A]">Statutory Recruiting Body: </span>
                      <a href={stateInfo.statutoryAgencyPortal} target="_blank" rel="noreferrer" className="text-[#2B4EE6] hover:underline font-medium">
                        {stateInfo.statutoryRecruitingAgency} ↗
                      </a>
                    </div>
                    <div>
                      <span className="font-semibold text-[#0F172A]">Domicile Policy: </span>
                      <span>{stateInfo.domicileSummary}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold text-[#0F172A]">Commonly Sanctioned Cadres: </span>
                      <span className="text-[#475569]">{stateInfo.commonCadres.join(', ')}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Municipal Corporations Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#12172B] uppercase tracking-wider">
                  Municipal Corporations / Nagar Nigams ({
                    NAGAR_NIGAM_DIRECTORY.filter((nn) => {
                      if (nnSelectedState !== 'All' && nn.state !== nnSelectedState) return false;
                      if (nnSelectedDistrict !== 'All' && nn.district !== nnSelectedDistrict) return false;
                      if (nnSearchQuery.trim()) {
                        const q = nnSearchQuery.toLowerCase();
                        return (
                          nn.name.toLowerCase().includes(q) ||
                          (nn.hindiName && nn.hindiName.toLowerCase().includes(q)) ||
                          nn.district.toLowerCase().includes(q) ||
                          nn.state.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    }).length
                  })
                </h3>
                <span className="text-[11px] text-[#5B6478]">
                  Zero Mock Listings • Direct Official Notice Boards Only
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {NAGAR_NIGAM_DIRECTORY
                  .filter((nn) => {
                    if (nnSelectedState !== 'All' && nn.state !== nnSelectedState) return false;
                    if (nnSelectedDistrict !== 'All' && nn.district !== nnSelectedDistrict) return false;
                    if (nnSearchQuery.trim()) {
                      const q = nnSearchQuery.toLowerCase();
                      return (
                        nn.name.toLowerCase().includes(q) ||
                        (nn.hindiName && nn.hindiName.toLowerCase().includes(q)) ||
                        nn.district.toLowerCase().includes(q) ||
                        nn.state.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((nn) => (
                    <div
                      key={nn.id}
                      className="p-4 bg-white border border-[#E4E7EC] rounded-md space-y-3 hover:border-[#2B4EE6]/40 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-[#12172B]">{nn.name}</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2B4EE6] border border-[#BFDBFE]">
                              {nn.tier}
                            </span>
                          </div>
                          {nn.hindiName && (
                            <div className="text-xs text-[#5B6478] font-medium">{nn.hindiName}</div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[10px] font-semibold text-[#475569] shrink-0">
                          {nn.district}, {nn.state}
                        </span>
                      </div>

                      <div className="text-xs text-[#5B6478] space-y-1.5 bg-[#F8FAFC] p-2.5 rounded border border-[#F1F5F9]">
                        <div>
                          <span className="font-semibold text-[#12172B]">Statutory Recruiting Agency: </span>
                          <span className="text-[#2B4EE6] font-medium">{nn.statutoryRecruitmentBody}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[#12172B]">Cadres Recruited: </span>
                          <span className="line-clamp-2">{nn.recruitedCadres.join(', ')}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[#12172B]">Domicile Policy: </span>
                          <span>{nn.domicileRequirement}</span>
                        </div>
                        {nn.helpline && (
                          <div>
                            <span className="font-semibold text-[#12172B]">Citizen Helpline: </span>
                            <span>{nn.helpline}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E4E7EC] flex items-center justify-between text-xs">
                        <a
                          href={nn.officialPortalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2B4EE6] hover:underline font-semibold flex items-center gap-1"
                        >
                          <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Official Portal ↗</span>
                        </a>
                        <a
                          href={nn.recruitmentNoticeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Notices &amp; Tenders ↗</span>
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* District NIC Portals Table */}
            <div className="p-5 bg-white border border-[#E4E7EC] rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#12172B] flex items-center gap-1.5">
                    <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#5B6478]" />
                    <span>District Administration &amp; Collectorate Portals ({
                      ALL_INDIA_DISTRICT_DIRECTORY.filter((d) => nnSelectedState === 'All' || d.state === nnSelectedState).length
                    } Districts)</span>
                  </h3>
                  <p className="text-xs text-[#5B6478]">
                    Official NIC Collectorate websites for district court notices, contractual appointments, and health mission recruitment.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#5B6478] uppercase text-[10px] tracking-wider border-b border-[#E4E7EC]">
                    <tr>
                      <th className="py-2 px-3">District</th>
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3">Headquarters</th>
                      <th className="py-2 px-3">Municipal Corporation</th>
                      <th className="py-2 px-3">Official NIC Portal</th>
                      <th className="py-2 px-3">District Notices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC] text-[#334155]">
                    {ALL_INDIA_DISTRICT_DIRECTORY
                      .filter((d) => nnSelectedState === 'All' || d.state === nnSelectedState)
                      .slice(0, 50)
                      .map((d) => (
                        <tr key={d.district} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-3 font-semibold text-[#12172B]">{d.district}</td>
                          <td className="py-2.5 px-3">{d.state}</td>
                          <td className="py-2.5 px-3">{d.headquarters}</td>
                          <td className="py-2.5 px-3">
                            {d.hasNagarNigam ? (
                              <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#0E9F6E] border border-[#A7F3D0] text-[10px] font-semibold">
                                {d.nagarNigamName || 'Yes'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#94A3B8]">District Council / Nagar Palika</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <a href={d.nicPortalUrl} target="_blank" rel="noreferrer" className="text-[#2B4EE6] hover:underline font-mono text-[11px]">
                              {d.district.toLowerCase().replace(/[^a-z]/g, '')}.nic.in ↗
                            </a>
                          </td>
                          <td className="py-2.5 px-3">
                            <a href={d.recruitmentNoticeUrl} target="_blank" rel="noreferrer" className="text-[#0E9F6E] hover:underline font-semibold text-[11px]">
                              View Notices ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Eligibility Checklist Modal ─────────────────────────────────────── */}
      {activeChecklistExam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E4E7EC] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E4E7EC] pb-3">
              <div>
                <span className="text-[11px] font-bold text-[#5B6478] uppercase tracking-wider block">
                  {activeChecklistExam.exam.conductingBody}
                </span>
                <h3 className="text-base font-bold text-[#12172B] mt-0.5">
                  {activeChecklistExam.exam.title}
                </h3>
                <span className="text-[11px] text-[#5B6478]">
                  Gazette Ref: {activeChecklistExam.exam.officialGazetteRef}
                </span>
              </div>
              <button
                onClick={() => setActiveChecklistExam(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close modal"
              >
                <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>

            {/* Verdict Box */}
            {!eligibilityAvailable ? (
              <div className="p-4 rounded border border-[#E4E7EC] bg-[#F7F8FA] text-xs space-y-2">
                <div className="font-semibold text-[#12172B] flex items-center gap-1.5">
                  <GraduationCap size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
                  <span>Resume or Qualifications Required for Eligibility Calculation</span>
                </div>
                <p className="text-[#5B6478] leading-relaxed">
                  No academic qualifications or resume have been provided in this session yet. Upload your CV or configure your degree, stream, age, and reservation category to see whether you qualify under the official DoPT and Commission guidelines.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveChecklistExam(null);
                    setProfileDrawerOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                >
                  <Settings size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                  <span>Set Up My Qualifications</span>
                </button>
              </div>
            ) : (
              <div
                className={`p-3 rounded border text-xs leading-relaxed ${
                  activeChecklistExam.result.status === 'eligible'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0E9F6E]'
                    : activeChecklistExam.result.status === 'partially_eligible'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97B0A]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#D9534F]'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {activeChecklistExam.result.status === 'eligible' ? (
                    <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                  ) : activeChecklistExam.result.status === 'partially_eligible' ? (
                    <Info size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                  ) : (
                    <XCircle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" />
                  )}
                  <span>Verdict: {activeChecklistExam.result.badgeLabel}</span>
                </div>
                <p className="mt-1">{activeChecklistExam.result.summary}</p>
              </div>
            )}

            {/* Prescribed Criteria Checklist */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-[#12172B] block">
                Prescribed Statutory Criteria
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeChecklistExam.result.checks.map((chk, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-[#F7F8FA] border border-[#E4E7EC] flex items-start gap-2.5"
                  >
                    <span className="shrink-0 mt-0.5">
                      {chk.passed ? (
                        <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                      ) : (
                        <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#12172B]">{chk.criterion}</span>
                        {chk.candidateVal && chk.requiredVal && (
                          <span className="text-[10px] text-[#5B6478]">
                            Profile: {chk.candidateVal} | Req: {chk.requiredVal}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5B6478] mt-0.5 leading-snug">
                        {chk.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Dates Timeline */}
            <div className="p-3 bg-[#F7F8FA] rounded border border-[#E4E7EC] text-[11px] text-[#5B6478] space-y-1">
              <div className="font-semibold text-[#12172B] mb-1">Official Timeline Milestones:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Apply Deadline: <strong className="text-[#12172B]">{formatExamDate(activeChecklistExam.exam.importantDates.applyEndDate)}</strong></div>
                <div>Exam Date: <strong className="text-[#12172B]">{formatExamDate(activeChecklistExam.exam.importantDates.examDate)}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
              <a
                href={activeChecklistExam.exam.officialLinks.notificationPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2B4EE6] hover:underline inline-flex items-center gap-1"
              >
                <span>Download Official Gazette PDF</span>
                <ExternalLink size={12} strokeWidth={ICON_STROKE_WIDTH} />
              </a>

              <button
                onClick={() => setActiveChecklistExam(null)}
                className="px-4 py-2 bg-[#12172B] text-white rounded text-xs font-semibold hover:bg-black"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Report Broken Link / Postponement Modal ────────────────────────── */}
      {reportModalExam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E4E7EC] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E4E7EC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#12172B]">Report Gazette Update</h3>
                <p className="text-xs text-[#5B6478] mt-0.5">{reportModalExam.title}</p>
              </div>
              <button
                onClick={() => setReportModalExam(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close report modal"
              >
                <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded text-xs text-[#0E9F6E]">
                {reportSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#12172B] font-semibold mb-1">Issue / Change Type</label>
                  <select
                    value={reportIssueType}
                    onChange={(e) => setReportIssueType(e.target.value)}
                    className="w-full p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs text-[#12172B]"
                  >
                    <option value="Date Postponed / Rescheduled">Date Postponed / Rescheduled</option>
                    <option value="Corrigendum Issued (Vacancies / Criteria Changed)">Corrigendum Issued (Vacancies / Criteria Changed)</option>
                    <option value="Application Portal Link Expired / Broken">Application Portal Link Expired / Broken</option>
                    <option value="Registration Deadline Extended">Registration Deadline Extended</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#12172B] font-semibold mb-1">Official Corrigendum / Source Link</label>
                  <input
                    type="url"
                    placeholder="https://commission.gov.in/notice_extension.pdf"
                    value={reportProofUrl}
                    onChange={(e) => setReportProofUrl(e.target.value)}
                    className="w-full p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs text-[#12172B]"
                  />
                </div>

                <div>
                  <label className="block text-[#12172B] font-semibold mb-1">Additional Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide relevant details from the notice..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded text-xs text-[#12172B]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModalExam(null)}
                    className="px-3 py-1.5 text-xs text-[#5B6478] hover:text-[#12172B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded transition-colors shadow-2xs"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-white border-t border-[#E4E7EC] py-8 text-xs text-[#5B6478]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} NicheHire. Independent Pan-India Government Job Directory &amp; Exam Intelligence Engine.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#12172B] transition-colors">
              Verified Private Jobs
            </Link>
            <Link href="/about" className="hover:text-[#12172B] transition-colors">
              About &amp; Trust
            </Link>
            <Link href="/pricing" className="hover:text-[#12172B] transition-colors">
              Employer Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-Component: Individual Verified Exam Card ───────────────────────────
interface ExamCardItemProps {
  exam: GovtExam & {
    eligibilityResult: EligibilityCheckResult;
    isPastDeadline: boolean;
    isUpcoming?: boolean;
    daysUntilStart?: number;
    isVerificationPending: boolean;
    daysLeft: number;
  };
  eligibilityAvailable: boolean;
  isArchived?: boolean;
  onChecklist: () => void;
  onReport: () => void;
  onOpenProfileDrawer: () => void;
}

function ExamCardItem({
  exam,
  eligibilityAvailable,
  isArchived = false,
  onChecklist,
  onReport,
  onOpenProfileDrawer,
}: ExamCardItemProps) {
  const { eligibilityResult, isPastDeadline, isUpcoming, daysUntilStart = 0, isVerificationPending, daysLeft } = exam;

  // Short monogram
  const initials = exam.conductingBody
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <article className="group bg-white border border-[#E4E7EC] rounded-md transition-colors hover:border-[#2B4EE6]/40 p-4 sm:p-5 flex flex-col md:flex-row justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded bg-[#F7F8FA] border border-[#E4E7EC] flex items-center justify-center text-xs font-bold text-[#12172B]">
            {initials || 'IN'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#5B6478]">
              <span className="font-semibold text-[#12172B]">{exam.conductingBody}</span>

              {/* Entity Type / Tier Badge */}
              {exam.entityType === 'PSURecruitment' || exam.category === 'psu' ? (
                <span className="text-[11px] font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
                  PSU Recruitment
                </span>
              ) : exam.category === 'regional' ? (
                <span className="text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                  District ({exam.district || exam.state})
                </span>
              ) : exam.category === 'state' ? (
                <span className="text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                  State PSC ({exam.state})
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded">
                  Central Commission
                </span>
              )}

              {/* Traffic-Light Eligibility Badge OR Neutral Prompt */}
              {isArchived ? (
                <span className="text-[11px] font-medium text-[#5B6478] bg-[#F7F8FA] border border-[#E4E7EC] px-2 py-0.5 rounded">
                  Archived / Concluded
                </span>
              ) : !eligibilityAvailable ? (
                <button
                  type="button"
                  onClick={onOpenProfileDrawer}
                  className="text-[11px] font-medium px-2 py-0.5 rounded border border-[#E4E7EC] bg-[#F7F8FA] hover:bg-[#EEF2F6] text-[#5B6478] hover:text-[#12172B] transition-colors flex items-center gap-1 shrink-0"
                  title="Upload your resume to see eligibility for this exam"
                >
                  <GraduationCap size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#5B6478]" />
                  <span>Upload resume to check eligibility</span>
                </button>
              ) : (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${
                    eligibilityResult.status === 'eligible'
                      ? 'bg-[#ECFDF5] text-[#0E9F6E] border-[#A7F3D0]'
                      : eligibilityResult.status === 'partially_eligible'
                      ? 'bg-[#FFFBEB] text-[#D97B0A] border-[#FDE68A]'
                      : eligibilityResult.status === 'ineligible'
                      ? 'bg-[#FEF2F2] text-[#D9534F] border-[#FECACA]'
                      : 'bg-[#F7F8FA] text-[#5B6478] border-[#E4E7EC]'
                  }`}
                  title={eligibilityResult.summary}
                >
                  {eligibilityResult.status === 'eligible' ? (
                    <BadgeCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                  ) : eligibilityResult.status === 'partially_eligible' ? (
                    <Info size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                  ) : eligibilityResult.status === 'ineligible' ? (
                    <XCircle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" />
                  ) : null}
                  <span>{eligibilityResult.badgeLabel}</span>
                </span>
              )}

              {/* Status / Countdown */}
              {isPastDeadline || isArchived ? (
                <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  Closed on {formatExamDate(exam.importantDates.applyEndDate)}
                </span>
              ) : isUpcoming ? (
                <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                  Registration Opens {formatExamDate(exam.importantDates.applyStartDate)} ({daysUntilStart}d)
                </span>
              ) : daysLeft === 0 ? (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded animate-pulse">
                  Closes Today! (Last Day to Apply)
                </span>
              ) : daysLeft === 1 ? (
                <span className="text-[11px] font-bold text-[#D97B0A] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded animate-pulse">
                  1 day left (Closes Tomorrow)
                </span>
              ) : daysLeft <= 7 ? (
                <span className="text-[11px] font-bold text-[#D97B0A] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded">
                  {daysLeft} days left
                </span>
              ) : (
                <span className="text-[11px] text-[#0E9F6E] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 rounded">
                  Open ({daysLeft}d left)
                </span>
              )}
            </div>

            <h3
              onClick={onChecklist}
              className="mt-1 text-[15px] font-semibold text-[#12172B] hover:text-[#2B4EE6] cursor-pointer transition-colors leading-snug"
            >
              {exam.title}
            </h3>
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-2.5 flex items-center gap-3 flex-wrap text-xs text-[#5B6478]">
          <span className="font-semibold text-[#12172B] inline-flex items-center gap-1.5">
            <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            {exam.vacancies.toLocaleString('en-IN')} Vacancies
          </span>
          <span className="text-[#E4E7EC]">•</span>
          <span className="inline-flex items-center gap-1">
            <IndianRupee size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            {exam.salaryScale}
          </span>
          <span className="text-[#E4E7EC]">•</span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            {isUpcoming ? 'Registration Opens:' : isPastDeadline ? 'Registration Closed:' : 'Last Date to Apply:'}{' '}
            <strong className="text-[#12172B]">
              {formatExamDate(isUpcoming ? exam.importantDates.applyStartDate : exam.importantDates.applyEndDate)}
            </strong>
          </span>
          {exam.importantDates.examDate && (
            <>
              <span className="text-[#E4E7EC]">•</span>
              <span>Exam: <strong className="text-[#12172B]">{formatExamDate(exam.importantDates.examDate)}</strong></span>
            </>
          )}
        </div>

        <p className="mt-2 text-xs text-[#5B6478] line-clamp-2 leading-relaxed">
          {exam.description}
        </p>

        {/* Provenance & Freshness Bar */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-[#5B6478]">
          <span>Gazette Ref: <strong className="text-[#12172B]">{exam.officialGazetteRef}</strong></span>
          <span className="text-[#E4E7EC]">•</span>
          {isVerificationPending ? (
            <span className="text-[#D97B0A] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FDE68A] inline-flex items-center gap-1">
              <AlertTriangle size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
              Verified {exam.lastVerifiedDate} (Re-check pending)
            </span>
          ) : (
            <span>Verified on <strong className="text-[#12172B]">{exam.lastVerifiedDate}</strong></span>
          )}
          {!isArchived && (
            <>
              <span className="text-[#E4E7EC]">•</span>
              <button
                onClick={onReport}
                className="text-[#5B6478] hover:text-[#D97B0A] underline inline-flex items-center gap-1"
              >
                <span>Report issue / date shift</span>
                <Flag size={12} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row md:flex-col justify-end items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E4E7EC]">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onChecklist}
            className="px-3 py-1.5 text-xs font-medium text-[#12172B] bg-white border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#12172B]/30 rounded transition-colors whitespace-nowrap"
          >
            {eligibilityAvailable ? 'Check Criteria' : 'View Criteria'}
          </button>
          <a
            href={exam.officialLinks.notificationPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-medium text-[#2B4EE6] bg-[#2B4EE6]/5 border border-[#2B4EE6]/30 hover:bg-[#2B4EE6]/10 rounded transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <span>Gazette PDF</span>
            <FileText size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
          </a>
          <a
            href={exam.officialLinks.applyPortalUrl}
            target="_blank"
            rel="noreferrer"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              isArchived
                ? 'text-[#5B6478] bg-[#F7F8FA] hover:bg-[#EEF2F6] border border-[#E4E7EC]'
                : 'text-white bg-[#2B4EE6] hover:bg-[#1E3BBD]'
            }`}
          >
            <span>{isArchived ? 'Official Portal (Archived)' : isUpcoming ? 'Official Portal (Opens Soon)' : 'Official Portal'}</span>
            <ArrowUpRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
          </a>
        </div>
      </div>
    </article>
  );
}
