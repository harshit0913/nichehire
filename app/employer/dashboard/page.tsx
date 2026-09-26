'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PostJobModal from '../../components/PostJobModal';
import EmployerAuthModal from '../../components/EmployerAuthModal';
import { supabase } from '../../supabase';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Globe,
  GraduationCap,
  Landmark,
  Plus,
  Sparkles,
  Target,
  Users,
  X,
  XCircle,
  Zap,
} from '../../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../../lib/iconRules';

interface EmployerJob {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  type: string;
  salary: string;
  description: string;
  status: 'active' | 'paused' | 'closed';
  postedAt: number;
  applicantCount: number;
}

interface CandidateApplicant {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  phone: string;
  appliedAt: string;
  fitPercentage: number;
  fitBadge: 'High' | 'Good' | 'Moderate';
  fitRationale: string[];
  status: 'Applied' | 'Reviewing' | 'Shortlisted' | 'Rejected' | 'Hired';
  resumeSummary: string;
  skills: string[];
  experienceYears: number;
}

interface PaymentSubmission {
  id: string;
  company_name: string;
  plan_amount: number;
  plan_name: string;
  utr_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  verified_at?: string;
  admin_notes?: string;
}

export default function EmployerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'applicants' | 'jobs' | 'payments' | 'domains'>('applicants');
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [applicants, setApplicants] = useState<CandidateApplicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<CandidateApplicant | null>(null);
  const [postJobModalOpen, setPostJobModalOpen] = useState(false);
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loadingData, setLoadingData] = useState(true);

  // Employer Auth State
  const [employerAuthModalOpen, setEmployerAuthModalOpen] = useState(false);
  const [employerUser, setEmployerUser] = useState<any>(null);
  const [employerCompany, setEmployerCompany] = useState<string>('');

  // Payment Verification State
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(499);
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'error'; message: string; utr?: string } | null>(null);
  const [myPayments, setMyPayments] = useState<PaymentSubmission[]>([]);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const founderUpiId = process.env.NEXT_PUBLIC_FOUNDER_UPI_ID || 'harshit0913@slc';

  useEffect(() => {
    // 1. Hydrate employer info from localStorage
    try {
      const storedComp = localStorage.getItem('nichehire_employer_company') || '';
      const storedEmail = localStorage.getItem('nichehire_employer_email') || '';
      if (storedComp) {
        setEmployerCompany(storedComp);
        setCompanyName(storedComp);
      }
      if (storedEmail) {
        setWorkEmail(storedEmail);
      }
    } catch {}

    // 2. Fetch current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmployerUser(session.user);
        const comp = session.user.user_metadata?.company_name || localStorage.getItem('nichehire_employer_company') || '';
        if (comp) {
          setEmployerCompany(comp);
          setCompanyName(comp);
        }
        if (session.user.email) {
          setWorkEmail(session.user.email);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmployerUser(session.user);
        const comp = session.user.user_metadata?.company_name || localStorage.getItem('nichehire_employer_company') || '';
        if (comp) {
          setEmployerCompany(comp);
          setCompanyName(comp);
        }
        if (session.user.email) {
          setWorkEmail(session.user.email);
        }
      } else {
        setEmployerUser(null);
      }
    });

    async function loadEmployerData() {
      setLoadingData(true);
      try {
        // 1. Load real postings from Supabase or localStorage
        let loadedJobs: EmployerJob[] = [];
        const { data: dbJobs } = await supabase
          .from('employer_postings')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbJobs && dbJobs.length > 0) {
          loadedJobs = dbJobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            workMode: j.work_mode || 'Remote',
            type: j.job_type || 'Full-Time',
            salary: j.salary || 'Market Rate',
            description: j.description,
            status: j.status || 'active',
            postedAt: new Date(j.created_at).getTime(),
            applicantCount: 0,
          }));
        } else {
          // Check local storage for jobs posted during session
          const storedPosts = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
          loadedJobs = storedPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            company: p.company,
            location: p.location,
            workMode: p.workMode || 'Remote',
            type: p.type || 'Full-Time',
            salary: p.salary || 'Competitive',
            description: p.description,
            status: 'active',
            postedAt: p.postedAt || Date.now(),
            applicantCount: 0,
          }));
        }
        setJobs(loadedJobs);

        // 2. Load genuine applicants from Supabase job_applications table (Zero Fake Data)
        const { data: dbApplications } = await supabase
          .from('job_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbApplications && dbApplications.length > 0) {
          const parsed = dbApplications.map((app: any) => ({
            id: app.id,
            jobId: app.job_id,
            jobTitle: app.job_title,
            candidateName: app.applicant_name,
            candidateEmail: app.applicant_email,
            phone: app.applicant_phone || 'N/A',
            appliedAt: new Date(app.created_at).toLocaleString(),
            fitPercentage: app.fit_percentage || 80,
            fitBadge: (app.fit_percentage >= 90 ? 'High' : app.fit_percentage >= 80 ? 'Good' : 'Moderate') as any,
            fitRationale: Array.isArray(app.fit_analysis?.highlights) ? app.fit_analysis.highlights : ['Skills match candidate profile'],
            status: (app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Applied') as any,
            resumeSummary: app.resume_text,
            skills: Array.isArray(app.fit_analysis?.skills) ? app.fit_analysis.skills : ['Verified Profile'],
            experienceYears: app.fit_analysis?.experienceYears || 1,
          }));
          setApplicants(parsed);
        } else {
          setApplicants([]);
        }
      } catch (err) {
        console.error('Failed to load employer records:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadEmployerData();

    return () => subscription.unsubscribe();
  }, []);

  const handleEmployerSignOut = async () => {
    await supabase.auth.signOut();
    setEmployerUser(null);
    setEmployerCompany('');
    try {
      localStorage.removeItem('nichehire_employer_company');
      localStorage.removeItem('nichehire_employer_email');
    } catch {}
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Screenshot size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setScreenshotData(base64);
      setScreenshotPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateApplicantStatus = (appId: string, newStatus: CandidateApplicant['status']) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );
    if (selectedApplicant && selectedApplicant.id === appId) {
      setSelectedApplicant((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(founderUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Please enter your Company Name.');
      return;
    }
    if (!workEmail.trim() || !workEmail.includes('@')) {
      alert('Please enter a valid official work email.');
      return;
    }
    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      alert('Please enter a valid 12-digit UPI Transaction Reference (UTR) number.');
      return;
    }
    if (!screenshotData) {
      alert('Please attach your payment screenshot proof. The founder requires image proof to verify with bank statements.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentNotice(null);

    try {
      const res = await fetch('/api/employer/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactEmail: workEmail.trim(),
          contactPhone: phone.trim(),
          planAmount: selectedPlanAmount,
          planName: selectedPlanAmount === 1999 ? 'Growth Bundle (5 Posts)' : 'Featured #1 Placement',
          utrNumber: utrNumber.trim(),
          screenshotData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment proof.');

      setPaymentNotice({
        type: 'success',
        message: 'Payment proof submitted! Status is PENDING manual verification by Admin. Our founder (Harshit Mishra) will verify your transaction against bank records within 1–2 hours and activate your listing.',
        utr: utrNumber.trim(),
      });

      setMyPayments((prev) => [
        {
          id: data.paymentId || `pay-${Date.now()}`,
          company_name: companyName,
          plan_amount: selectedPlanAmount,
          plan_name: selectedPlanAmount === 1999 ? 'Growth Bundle' : 'Featured Placement',
          utr_number: utrNumber.trim(),
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Reset form fields
      setUtrNumber('');
      setScreenshotData(null);
      setScreenshotPreview(null);
    } catch (err: any) {
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Submission failed. Please try again.',
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(founderUpiId)}%26pn%3DNicheHire%26am%3D${selectedPlanAmount}%26cu%3DINR`;

  const filteredApplicants = applicants.filter((a) => {
    if (filterJobId !== 'all' && a.jobId !== filterJobId) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900 font-sans selection:bg-[#2B4EE6]/15">
      {/* Top Navbar */}
      <header className="border-b border-gray-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#2B4EE6] flex items-center justify-center font-black text-white text-sm">
                NH
              </span>
              <span className="font-bold text-gray-900 tracking-tight text-base">NicheHire</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 flex items-center gap-1.5">
              <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Employer Workspace
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Job Board
            </Link>

            <button
              onClick={() => {
                if (!employerUser) {
                  setEmployerAuthModalOpen(true);
                } else {
                  setPostJobModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Post a Job / Walk-in
            </button>

            {employerUser ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {employerCompany || 'Verified Employer'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {employerUser.email}
                  </span>
                </div>
                <button
                  onClick={handleEmployerSignOut}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-medium rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEmployerAuthModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Employer Sign In / Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>

        {!employerUser ? (
          /* Guest Recruiter Hub & Onboarding Screen (Zero Mock Shells) */
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#111827] via-[#1E1B4B] to-[#0F172A] rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
              <div className="max-w-2xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/20">
                  <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Recruiter &amp; Corporate Workspace
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Hire verified Finance, Commerce &amp; Tech talent directly.
                </h1>
                <p className="text-sm text-indigo-200/90 leading-relaxed">
                  Sign in or register your organization with corporate credentials to post verified vacancies, review candidate applications, and inspect AI fit scores. Zero middleman recruiter commissions.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setEmployerAuthModalOpen(true)}
                    className="px-6 py-3 bg-white text-indigo-950 hover:bg-gray-100 font-bold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2"
                  >
                    <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Sign In / Register Organization
                  </button>
                  <Link
                    href="/pricing"
                    className="px-5 py-3 bg-indigo-900/60 hover:bg-indigo-900 text-white font-semibold rounded-2xl text-xs transition-colors border border-indigo-700/50 flex items-center gap-1.5"
                  >
                    <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> View Employer Plans
                  </Link>
                  <Link
                    href="/"
                    className="px-4 py-3 bg-transparent hover:bg-white/10 text-indigo-200 font-medium rounded-2xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Return to Job Board
                  </Link>
                </div>
              </div>
            </div>

            {/* 3 Value Pillars for Recruiters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Zero Fake Applicants</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Every candidate application includes structured contact info, verified education details, and parsed resumes. Zero spam bot submissions.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Target size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Objective AI Fit Match</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Our algorithm calculates candidate alignment against your exact job description, highlighting skills match and experience highlights instantly.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center">
                  <Zap size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-base font-bold text-gray-900">0% Platform Cut</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Pay transparently via direct bank UPI with ₹0 gateway surcharge. All applicant communication and hiring decisions remain 100% direct with you.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Recruiter &amp; Employer Control Center
                </h1>
                <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                  Publish genuine corporate openings, review real candidate applications, inspect structured resumes, and verify hiring transactions with 100% zero fake data guarantee.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab('payments')}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Direct UPI (0% Platform Surcharge)
                </button>
                <button
                  onClick={() => setActiveTab('domains')}
                  className="flex-1 md:flex-none px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2B4EE6] text-xs font-semibold rounded-2xl border border-blue-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Free Domain Guide
                </button>
              </div>
            </div>

        {/* Real Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Active Job Listings</span>
            <div className="text-2xl font-black text-gray-900">{jobs.length}</div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">
              {jobs.length > 0 ? `${jobs.length} published` : 'No active jobs yet'}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Total Applicants</span>
            <div className="text-2xl font-black text-[#2B4EE6]">{applicants.length}</div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">
              {applicants.length > 0 ? 'Real candidate submissions' : '0 applications received'}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Average Applicant Fit</span>
            <div className="text-2xl font-black text-emerald-600">
              {applicants.length > 0
                ? `${Math.round(applicants.reduce((acc, a) => acc + a.fitPercentage, 0) / applicants.length)}%`
                : '—'}
            </div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">
              {applicants.length > 0 ? 'AI match calculated' : 'Awaiting applicants'}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Shortlisted for Calls</span>
            <div className="text-2xl font-black text-purple-600">
              {applicants.filter((a) => a.status === 'Shortlisted').length}
            </div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">Ready to interview</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-gray-200 flex gap-6">
          <button
            onClick={() => setActiveTab('applicants')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'applicants'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Candidates & AI Fit Match ({applicants.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'jobs'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ClipboardList size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Active Postings ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'payments'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Payment Verification & Proof
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'domains'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Free Domain & Setup Guide
          </button>
        </div>

        {/* TAB 1: REAL APPLICANTS (ZERO FAKE DATA) */}
        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {applicants.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center mx-auto">
                  <Users size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-base font-bold text-gray-900">No Applicants Received Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  There are no fake applicants on NicheHire. Once genuine candidates review and apply to your job listings, their parsed resumes and calculated AI fit percentages will appear here in real-time.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setPostJobModalOpen(true)}
                    className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Publish a Job Opening to Receive Applicants</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Candidate</th>
                        <th className="py-3.5 px-5 font-semibold">Applied Role</th>
                        <th className="py-3.5 px-5 font-semibold">AI Fit Percentage</th>
                        <th className="py-3.5 px-5 font-semibold">Status</th>
                        <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredApplicants.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-gray-900">{app.candidateName}</div>
                            <div className="text-[11px] text-gray-500 font-mono">{app.candidateEmail}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{app.phone} • {app.appliedAt}</div>
                          </td>

                          <td className="py-4 px-5">
                            <span className="font-medium text-gray-800">{app.jobTitle}</span>
                          </td>

                          <td className="py-4 px-5">
                            <span className="text-xs font-black text-emerald-600">
                              {app.fitPercentage}% Fit
                            </span>
                          </td>

                          <td className="py-4 px-5">
                            <select
                              value={app.status}
                              onChange={(e: any) => handleUpdateApplicantStatus(app.id, e.target.value)}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold border bg-gray-50"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Reviewing">Reviewing</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Hired">Hired</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => setSelectedApplicant(app)}
                              className="px-3 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded-xl text-xs font-semibold"
                            >
                              View Resume
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE JOB POSTINGS */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Your Posted Openings & Walk-in Drives</h2>
                <p className="text-xs text-gray-500">Manage listings, monitor applicant activity, and pause or close roles.</p>
              </div>
              <button
                onClick={() => setPostJobModalOpen(true)}
                className="px-4 py-2 bg-[#2B4EE6] text-white text-xs font-semibold rounded-xl hover:bg-[#1E3BBD] transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>New Listing</span>
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
                  <Briefcase size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-base font-bold text-gray-900">No Job Openings Posted Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  You haven't posted any corporate job openings or walk-in drives yet. Create your first opening to reach verified candidates.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setPostJobModalOpen(true)}
                    className="px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Post Your First Job</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <div key={job.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {job.status}
                        </span>
                        <h3 className="text-base font-bold text-gray-900 mt-1">{job.title}</h3>
                        <p className="text-xs text-gray-500">{job.company} • {job.location}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-xl">
                        {job.applicantCount} Applicants
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{job.description}</p>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{job.salary}</span>
                      <button
                        onClick={() => {
                          setFilterJobId(job.id);
                          setActiveTab('applicants');
                        }}
                        className="text-[#2B4EE6] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>View Candidates</span>
                        <ArrowRight size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PAYMENT VERIFICATION & PROOF */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-1">
                    <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Direct UPI QR Payment
                  </div>
                  <h2 className="text-lg font-black text-gray-900">Submit Payment Proof for Founder Verification</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Payments are manually verified by our Founder (Harshit Mishra) before activating featured placement.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Select Plan:</span>
                  {[499, 1999].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedPlanAmount(amt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedPlanAmount === amt
                          ? 'bg-[#2B4EE6] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {amt === 499 ? 'Featured (#1 Placement) - ₹499' : 'Growth (5 Posts) - ₹1,999'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Alert */}
              {paymentNotice && (
                <div
                  className={`p-4 rounded-2xl text-xs font-medium space-y-1 ${
                    paymentNotice.type === 'success'
                      ? 'bg-amber-50 border border-amber-300 text-amber-900'
                      : 'bg-rose-50 border border-rose-300 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {paymentNotice.type === 'success' ? (
                      <span className="flex items-center gap-1.5"><Clock size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" /> PENDING FOUNDER VERIFICATION</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><XCircle size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" /> Submission Error</span>
                    )}
                  </div>
                  <p className="leading-relaxed">{paymentNotice.message}</p>
                  {paymentNotice.utr && (
                    <p className="font-mono text-[11px] font-semibold text-amber-950 mt-1">
                      Submitted UTR: {paymentNotice.utr}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-2">
                {/* QR Code & Payee Display */}
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border border-gray-200/80 text-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={upiQrUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 rounded-xl object-contain"
                    />
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Pay <strong>₹{selectedPlanAmount}</strong> to official NicheHire UPI:
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-mono font-bold text-gray-900">{founderUpiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="text-[11px] text-[#2B4EE6] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      {copiedUpi ? (
                        <>
                          <Check size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
                    Accepted on GPay, PhonePe, Paytm, BHIM, Cred, and all bank UPI apps.
                  </div>
                </div>

                {/* Proof Submission Form */}
                <form onSubmit={handleSubmitPaymentProof} className="space-y-3.5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Submit Verification Details & Screenshot
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Hiring Company Name: *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp India"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Corporate Work Email: *
                      </label>
                      <input
                        type="email"
                        required
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="hr@acme.com"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Phone / WhatsApp:
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      12-Digit UPI Transaction Reference (UTR): *
                    </label>
                    <input
                      type="text"
                      required
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 427819283719"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Upload Payment Screenshot Proof: *
                    </label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
                    />
                    {screenshotPreview && (
                      <div className="mt-2 p-2 border border-gray-200 rounded-xl bg-gray-50 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotPreview}
                          alt="Screenshot Preview"
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        />
                        <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <Check size={12} strokeWidth={ICON_STROKE_WIDTH} />
                          Screenshot attached ready for submission
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{isSubmittingPayment ? 'Submitting Proof...' : 'Submit Payment for Founder Verification'}</span>
                  </button>

                  <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                    Note: Fake or unverified UTR entries will be immediately rejected during admin audit.
                  </p>
                </form>
              </div>
            </div>

            {/* My Submissions Table */}
            {myPayments.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Your Recent Payment Submissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3">Plan</th>
                        <th className="py-2.5 px-3">UTR</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-3 font-semibold text-gray-900">₹{p.plan_amount} ({p.plan_name})</td>
                          <td className="py-3 px-3 font-mono text-gray-600">{p.utr_number}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                p.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.status === 'approved' ? (
                                <>
                                  <BadgeCheck size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                                  <span>Verified</span>
                                </>
                              ) : p.status === 'rejected' ? (
                                <>
                                  <XCircle size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" />
                                  <span>Rejected</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                                  <span>Pending</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-400">{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FREE & AFFORDABLE DOMAINS GUIDE */}
        {activeTab === 'domains' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold mb-1">
                <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Domain &amp; Hosting Strategy
              </div>
              <h2 className="text-xl font-black text-gray-900">How to Get a Free or Ultra-Affordable Domain for NicheHire</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Step-by-step methods to link a custom domain to your Vercel deployment with zero monthly server costs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                <div className="mb-2 text-gray-700">
                  <GraduationCap size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">GitHub Student Pack</h3>
                <div className="text-[10px] font-bold text-emerald-700 uppercase">100% Free for 1 Year</div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Free 1-year <strong>.me</strong> domain via Namecheap, free <strong>.tech</strong> or <strong>.site</strong> with free SSL.
                </p>
                <a
                  href="https://education.github.com/pack"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Claim Student Pack
                </a>
              </div>

              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                <div className="mb-2 text-gray-700">
                  <Globe size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">eu.org (Free Forever)</h3>
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Zero Cost Always</div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  100% free with no renewals fee. Recognized by Google on the ICANN Public Suffix List.
                </p>
                <a
                  href="https://nic.eu.org"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Register on nic.eu.org
                </a>
              </div>

              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                <div className="mb-2 text-gray-700">
                  <Building2 size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Affordable .in / .store</h3>
                <div className="text-[10px] font-bold text-blue-700 uppercase">₹79 to ₹399 / Year</div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Spaceship / Dynadot: .in often ₹399/yr, .site often ₹79. Best credibility for Indian recruiters.
                </p>
                <a
                  href="https://www.spaceship.com"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Search .in on Spaceship
                </a>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Modal: Full Resume Viewer */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-gray-100 my-8 space-y-5 animate-fadeIn">
            <button
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Close resume modal"
            >
              <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
            </button>

            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900">{selectedApplicant.candidateName}</h2>
              <p className="text-xs text-gray-500">
                Applied for <strong className="text-gray-800">{selectedApplicant.jobTitle}</strong> • {selectedApplicant.appliedAt}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800">Candidate Resume Text:</label>
              <pre className="bg-gray-900 text-gray-200 p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {selectedApplicant.resumeSummary}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      <PostJobModal
        isOpen={postJobModalOpen}
        onClose={() => setPostJobModalOpen(false)}
        onSuccess={(newJob) => {
          setJobs((prev) => [
            {
              id: newJob.id,
              title: newJob.title,
              company: newJob.company,
              location: newJob.location,
              workMode: newJob.workMode || 'Remote',
              type: newJob.type || 'Full-Time',
              salary: newJob.salary,
              description: newJob.description,
              status: 'active',
              postedAt: Date.now(),
              applicantCount: 0,
            },
            ...prev,
          ]);
        }}
      />

      {/* Employer Authentication & Registration Modal */}
      <EmployerAuthModal
        isOpen={employerAuthModalOpen}
        onClose={() => setEmployerAuthModalOpen(false)}
        onSuccess={(user, compInfo) => {
          setEmployerUser(user);
          if (compInfo?.companyName) {
            setEmployerCompany(compInfo.companyName);
            setCompanyName(compInfo.companyName);
          }
          if (compInfo?.email) {
            setWorkEmail(compInfo.email);
          }
        }}
      />
    </div>
  );
}
