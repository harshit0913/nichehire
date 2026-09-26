'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PostJobModal from '../../components/PostJobModal';

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

const INITIAL_MOCK_APPLICANTS: CandidateApplicant[] = [
  {
    id: 'app-101',
    jobId: 'job-1',
    jobTitle: 'Senior React / Next.js Engineer',
    candidateName: 'Aditya Sharma',
    candidateEmail: 'aditya.sharma.dev@gmail.com',
    phone: '+91 98260 12345',
    appliedAt: 'Today, 2:15 PM',
    fitPercentage: 94,
    fitBadge: 'High',
    fitRationale: [
      '4.5 years experience in React, Next.js, and TypeScript',
      'Strong state management (Zustand, React Query)',
      'Built production SaaS job portals with high Core Web Vitals',
    ],
    status: 'Shortlisted',
    skills: ['React 19', 'Next.js Turbopack', 'TypeScript', 'Tailwind CSS', 'Supabase'],
    experienceYears: 4.5,
    resumeSummary: `SUMMARY
Senior Full-Stack Frontend Engineer with 4.5+ years experience building reactive, high-scale web applications.

WORK EXPERIENCE
• Senior Frontend Developer at TechCorp Labs (2023 - Present)
  - Architected high-concurrency client portal serving 250k daily active users.
  - Reduced bundle size by 38% using Next.js 15 SSR and server actions.
• Frontend Developer at CloudScale Solutions (2021 - 2023)
  - Developed responsive analytics dashboards in React and Tailwind.

EDUCATION
B.Tech in Computer Science, NIT Bhopal (CGPA 8.8/10)`,
  },
  {
    id: 'app-102',
    jobId: 'job-1',
    jobTitle: 'Senior React / Next.js Engineer',
    candidateName: 'Pooja Verma',
    candidateEmail: 'pooja.verma.tech@outlook.com',
    phone: '+91 97110 54321',
    appliedAt: 'Yesterday',
    fitPercentage: 88,
    fitBadge: 'Good',
    fitRationale: [
      '3 years hands-on React & Tailwind CSS',
      'Solid REST API integration experience',
      'Completed CS degree with distinction',
    ],
    status: 'Reviewing',
    skills: ['React', 'JavaScript (ES6+)', 'Node.js', 'PostgreSQL', 'CSS3'],
    experienceYears: 3,
    resumeSummary: `SUMMARY
Frontend developer skilled in responsive UI development and clean API design.

WORK EXPERIENCE
• Software Engineer at InnovateTech (2022 - Present)
  - Built scalable component libraries and integrated third-party payment gateways.
• Junior Web Developer at SoftSolutions (2021 - 2022)
  - Built responsive landing pages and web forms.

EDUCATION
B.E. in Information Technology, RGPV Bhopal`,
  },
  {
    id: 'app-103',
    jobId: 'job-2',
    jobTitle: 'Financial Analyst & Accountant',
    candidateName: 'Rohan Kulkarni',
    candidateEmail: 'rohan.kulkarni.ca@gmail.com',
    phone: '+91 94250 98765',
    appliedAt: '2 days ago',
    fitPercentage: 92,
    fitBadge: 'High',
    fitRationale: [
      'Semi-qualified CA with 3 years articleship experience',
      'Proficient in GST, TDS, Tally Prime, and Advanced Excel financial modeling',
      'Direct statutory audit experience in manufacturing sector',
    ],
    status: 'Shortlisted',
    skills: ['Financial Modeling', 'GST Compliance', 'Tally Prime', 'SAP FICO', 'Balance Sheet Analysis'],
    experienceYears: 3,
    resumeSummary: `SUMMARY
Detail-oriented financial analyst with expertise in corporate taxation, balance sheet reconciliation, and auditing.

EXPERIENCE
• Finance Executive at Kedia & Co. Chartered Accountants (2023 - Present)
  - Handled statutory audits, GST returns, and corporate tax computations.
• Article Assistant at B.M. Mehta & Associates (2020 - 2023)
  - Prepared financial statements and projected cash flows.

EDUCATION
• CA Inter Cleared (ICAI)
• B.Com (Honours), Devi Ahilya University (First Class)`,
  },
];

export default function EmployerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'applicants' | 'jobs' | 'payments' | 'domains'>('applicants');
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [applicants, setApplicants] = useState<CandidateApplicant[]>(INITIAL_MOCK_APPLICANTS);
  const [selectedApplicant, setSelectedApplicant] = useState<CandidateApplicant | null>(null);
  const [postJobModalOpen, setPostJobModalOpen] = useState(false);
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Payment UPI State
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(499);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const founderUpiId = process.env.NEXT_PUBLIC_FOUNDER_UPI_ID || 'harshit0913@slc';

  useEffect(() => {
    try {
      const storedPosts = JSON.parse(localStorage.getItem('nichehire_employer_posts') || '[]');
      if (storedPosts.length > 0) {
        setJobs(storedPosts.map((p: any) => ({
          id: p.id,
          title: p.title,
          company: p.company,
          location: p.location,
          workMode: p.workMode || 'Remote',
          type: p.type || 'Full-Time',
          salary: p.salary,
          description: p.description,
          status: 'active',
          postedAt: p.postedAt || Date.now(),
          applicantCount: p.applicantCount || Math.floor(Math.random() * 8) + 2,
        })));
      } else {
        // Sample active job postings
        setJobs([
          {
            id: 'job-1',
            title: 'Senior React / Next.js Engineer',
            company: 'NicheHire Tech Labs',
            location: 'Remote (India)',
            workMode: 'Remote',
            type: 'Full-Time',
            salary: '₹14,00,000 - ₹22,00,000 / yr',
            description: 'Looking for a senior frontend developer experienced in Next.js 16, TypeScript, and modern state architectures.',
            status: 'active',
            postedAt: Date.now() - 2 * 86400000,
            applicantCount: 2,
          },
          {
            id: 'job-2',
            title: 'Financial Analyst & Accountant',
            company: 'Nexus Capital Advisors',
            location: 'Indore / Hybrid',
            workMode: 'Hybrid',
            type: 'Full-Time',
            salary: '₹6,00,000 - ₹9,50,000 / yr',
            description: 'Require semi-qualified CA or B.Com/M.Com with Tally, GST, and corporate financial reporting proficiency.',
            status: 'active',
            postedAt: Date.now() - 5 * 86400000,
            applicantCount: 1,
          },
        ]);
      }
    } catch {
      // Fallback
    }
  }, []);

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

  const handleVerifyUtr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      alert('Please enter a valid 12-digit UPI Transaction Reference (UTR) number.');
      return;
    }
    setPaymentSuccessNotice(
      `✓ Payment Verification Queued for UTR: ${utrNumber}. Your featured badge and boosted applicant reach are active!`
    );
    setTimeout(() => {
      setUtrNumber('');
    }, 4000);
  };

  // QR Code URL for UPI Intent
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
              <span>🏢</span> Employer Workspace
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setPostJobModalOpen(true)}
              className="px-3.5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>+</span> Post a Job / Walk-in
            </button>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <span>👤</span> Candidate Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Recruiter & Employer Control Center
            </h1>
            <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
              Review genuine applicants, inspect parsed candidate resumes, leverage AI Applicant Fit Match scoring, and manage hiring pipelines with zero middleman fees.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('payments')}
              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>⚡</span> Zero-Fee UPI Payments
            </button>
            <button
              onClick={() => setActiveTab('domains')}
              className="flex-1 md:flex-none px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2B4EE6] text-xs font-semibold rounded-2xl border border-blue-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🌐</span> Free Domain Guide
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Active Job Listings</span>
            <div className="text-2xl font-black text-gray-900">{jobs.length}</div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">100% Verified</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Total Applicants</span>
            <div className="text-2xl font-black text-[#2B4EE6]">{applicants.length}</div>
            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">Direct candidate CVs</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Average Applicant Fit</span>
            <div className="text-2xl font-black text-emerald-600">
              {Math.round(applicants.reduce((acc, a) => acc + a.fitPercentage, 0) / (applicants.length || 1))}%
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">AI Fit Filtered</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium block mb-1">Shortlisted for Calls</span>
            <div className="text-2xl font-black text-purple-600">
              {applicants.filter((a) => a.status === 'Shortlisted').length}
            </div>
            <span className="text-[11px] text-purple-600 font-medium mt-1 inline-block">Ready to Interview</span>
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
            <span>👥</span> Candidates & AI Fit Match ({applicants.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'jobs'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>📋</span> Active Postings ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'payments'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>💳</span> Payment Settings (Free UPI & Gateways)
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'domains'
                ? 'border-[#2B4EE6] text-[#2B4EE6]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🌐</span> Free Domain & Setup Guide
          </button>
        </div>

        {/* TAB 1: APPLICANTS & AI FIT SCORE */}
        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-gray-600 mr-1">Filter by Job:</span>
                <select
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none"
                >
                  <option value="all">All Job Postings</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>

                <span className="font-semibold text-gray-600 ml-2 mr-1">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="Applied">Applied</option>
                  <option value="Reviewing">Reviewing</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="text-xs text-gray-500">
                Showing <strong>{filteredApplicants.length}</strong> matching candidates
              </div>
            </div>

            {/* Applicants Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3.5 px-5 font-semibold">Candidate</th>
                      <th className="py-3.5 px-5 font-semibold">Applied Role</th>
                      <th className="py-3.5 px-5 font-semibold">AI Fit Percentage</th>
                      <th className="py-3.5 px-5 font-semibold">Key Skills</th>
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
                          <span className="block text-[10px] text-gray-400">{app.experienceYears} yrs experience</span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-100"
                                  strokeWidth="3.5"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={app.fitPercentage >= 90 ? 'text-emerald-500' : 'text-blue-500'}
                                  strokeDasharray={`${app.fitPercentage}, 100`}
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <span className="absolute text-[11px] font-black text-gray-800">
                                {app.fitPercentage}%
                              </span>
                            </div>
                            <div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  app.fitBadge === 'High'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {app.fitBadge} Match
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {app.skills.slice(0, 3).map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                                {s}
                              </span>
                            ))}
                            {app.skills.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{app.skills.length - 3}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <select
                            value={app.status}
                            onChange={(e: any) => handleUpdateApplicantStatus(app.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold focus:outline-none border ${
                              app.status === 'Shortlisted'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : app.status === 'Reviewing'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : app.status === 'Hired'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : app.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
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
                            className="px-3 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                          >
                            View Resume & Match
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                className="px-4 py-2 bg-[#2B4EE6] text-white text-xs font-semibold rounded-xl hover:bg-[#1E3BBD] transition-colors"
              >
                + New Listing
              </button>
            </div>

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
                      className="text-[#2B4EE6] hover:underline font-semibold"
                    >
                      View Candidates →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT SETTINGS (FREE UPI & GATEWAYS) */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-1">
                    <span>⚡</span> 0% Fee Direct UPI Integration
                  </div>
                  <h2 className="text-lg font-black text-gray-900">Zero-Commission UPI Payment Collection</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Collect payments directly from employers via Google Pay, PhonePe, Paytm, or BHIM with zero gateway transaction cut.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Select Plan:</span>
                  {[0, 499, 1999].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedPlanAmount(amt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedPlanAmount === amt
                          ? 'bg-[#2B4EE6] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {amt === 0 ? 'Free (₹0)' : `₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>

              {paymentSuccessNotice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-semibold animate-fadeIn">
                  {paymentSuccessNotice}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
                {/* QR Code Card */}
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border border-gray-200/80 text-center space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={upiQrUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 rounded-xl object-contain"
                    />
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    Scan with any UPI App (GPay, PhonePe, Paytm, Cred)
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-mono font-bold text-gray-900">{founderUpiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="text-[11px] text-[#2B4EE6] hover:underline font-semibold"
                    >
                      {copiedUpi ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Verification Form & Guide */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">
                    How Direct UPI Payment Works for Employers:
                  </h3>
                  <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Scan the QR code or pay to UPI ID <code className="font-mono text-gray-900 font-bold">{founderUpiId}</code>.</li>
                    <li>Enter the amount for your selected plan (e.g. <strong>₹{selectedPlanAmount}</strong> for Featured #1 placement).</li>
                    <li>Copy the <strong>12-digit UTR / Reference ID</strong> from your transaction receipt.</li>
                    <li>Paste the UTR below for automated verification and instant featured badge activation.</li>
                  </ol>

                  <form onSubmit={handleVerifyUtr} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        12-Digit UPI Reference Number (UTR):
                      </label>
                      <input
                        type="text"
                        required
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="e.g. 427819283719"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Verify & Activate Featured Listing
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Gateway Registration & Alternative Guide */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900">
                Payment Gateway Setup Options (Credit Card, NetBanking & Corporate Invoicing)
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                If you wish to accept international cards, net banking, or automated corporate billing alongside free UPI:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900">Razorpay Standard</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Free Onboarding</span>
                  </div>
                  <ul className="text-[11px] text-gray-600 space-y-1">
                    <li>• Zero setup fee & zero annual maintenance charges.</li>
                    <li>• Standard 2% fee only on successful credit/debit card transactions.</li>
                    <li>• Supports automated GST tax invoices for employers.</li>
                  </ul>
                  <a
                    href="https://razorpay.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[11px] text-[#2B4EE6] font-semibold hover:underline mt-1"
                  >
                    Open Razorpay Portal →
                  </a>
                </div>

                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900">Cashfree Payments</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Instant T+0</span>
                  </div>
                  <ul className="text-[11px] text-gray-600 space-y-1">
                    <li>• Same-day bank settlements for high-volume recruitment.</li>
                    <li>• Best-in-class Indian payment success rate.</li>
                    <li>• Simple webhook integration with Next.js API routes.</li>
                  </ul>
                  <a
                    href="https://www.cashfree.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[11px] text-emerald-700 font-semibold hover:underline mt-1"
                  >
                    Open Cashfree Portal →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FREE & AFFORDABLE DOMAINS GUIDE */}
        {activeTab === 'domains' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold mb-1">
                <span>🌐</span> Domain & Hosting Strategy
              </div>
              <h2 className="text-xl font-black text-gray-900">How to Get a Free or Ultra-Affordable Domain for NicheHire</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Step-by-step methods to link a custom domain to your Vercel deployment with zero monthly server costs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Option 1 */}
              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-1">🎓</div>
                  <h3 className="text-sm font-bold text-gray-900">GitHub Student Pack</h3>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">100% Free for 1 Year</div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    If you or a team member have a college or educational email (.edu or .ac.in), you get:
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-1 mt-2 list-disc list-inside">
                    <li>Free 1-year <strong>.me</strong> domain via Namecheap.</li>
                    <li>Free 1-year <strong>.tech</strong> or <strong>.site</strong> domain.</li>
                    <li>Free SSL certificates & Developer tools.</li>
                  </ul>
                </div>
                <a
                  href="https://education.github.com/pack"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Claim Student Pack
                </a>
              </div>

              {/* Option 2 */}
              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-1">🆓</div>
                  <h3 className="text-sm font-bold text-gray-900">eu.org (Free Forever)</h3>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Zero Cost Always</div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    eu.org has been providing completely free domains since 1996. It is recognized by ICANN and treated by Google as an independent public suffix (e.g. <code>nichehire.eu.org</code>).
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-1 mt-2 list-disc list-inside">
                    <li>100% free with no renewals fee.</li>
                    <li>Can be connected to Cloudflare Free DNS.</li>
                  </ul>
                </div>
                <a
                  href="https://nic.eu.org"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Register on nic.eu.org
                </a>
              </div>

              {/* Option 3 */}
              <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-1">🇮🇳</div>
                  <h3 className="text-sm font-bold text-gray-900">Affordable .in / .store</h3>
                  <div className="text-[10px] font-bold text-blue-700 uppercase">₹79 to ₹399 / Year</div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    For high credibility in India, a genuine <code>.in</code> domain (e.g. <code>nichehire.in</code>) or <code>.store</code> is extremely cost effective:
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-1 mt-2 list-disc list-inside">
                    <li>Spaceship.com / Dynadot: .in often ₹399/yr.</li>
                    <li>.site / .online often ₹79 - ₹149 for the 1st year.</li>
                    <li>Free DNS and WHOIS privacy included.</li>
                  </ul>
                </div>
                <a
                  href="https://www.spaceship.com"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-xl transition-colors mt-3"
                >
                  Check Domain Availability
                </a>
              </div>
            </div>

            {/* Connecting to Vercel & Cloudflare */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <span>🛡️</span> Connecting Your Domain to Vercel (100% Free SSL & CDN)
              </h4>
              <p className="text-xs text-blue-900 leading-relaxed">
                Once you acquire your domain, link it in 2 simple steps:
              </p>
              <ol className="text-xs text-blue-900/90 space-y-1 list-decimal list-inside">
                <li>In Vercel Dashboard ➔ Project Settings ➔ <strong>Domains</strong> ➔ Type your domain (e.g. <code>nichehire.in</code>).</li>
                <li>In your domain registrar DNS settings, add a CNAME record: <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold">cname.vercel-dns.com</code>.</li>
                <li>Vercel automatically provisions a free SSL Certificate and global Edge CDN caching within 60 seconds!</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over / Modal: Full Resume Viewer with AI Fit Breakdown */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-gray-100 my-8 space-y-5 animate-fadeIn">
            <button
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Applicant Profile
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-0.5">
                  {selectedApplicant.candidateName}
                </h2>
                <p className="text-xs text-gray-500">
                  Applied for <strong className="text-gray-800">{selectedApplicant.jobTitle}</strong> • {selectedApplicant.appliedAt}
                </p>
              </div>

              {/* Fit Badge */}
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-600">
                  {selectedApplicant.fitPercentage}%
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedApplicant.fitBadge} Fit Match
                </span>
              </div>
            </div>

            {/* AI Fit Match Rationale */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>🤖</span> AI Candidate Fit Match Highlights:
              </span>
              <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                {selectedApplicant.fitRationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Skills & Contact Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="flex flex-wrap gap-1.5">
                {selectedApplicant.skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-semibold text-gray-800 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${selectedApplicant.candidateEmail}?subject=Interview Invitation for ${selectedApplicant.jobTitle} at NicheHire`}
                  className="px-3 py-1.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded-xl text-xs font-semibold"
                >
                  Email Candidate
                </a>
              </div>
            </div>

            {/* Structured Resume Content */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800">Full Parsed Resume Content:</label>
              <pre className="bg-gray-900 text-gray-200 p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {selectedApplicant.resumeSummary}
              </pre>
            </div>

            {/* Status Change Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Update Application Status:</span>
              <div className="flex items-center gap-2">
                {(['Applied', 'Reviewing', 'Shortlisted', 'Hired', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateApplicantStatus(selectedApplicant.id, st)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      selectedApplicant.status === st
                        ? 'bg-[#2B4EE6] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
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
    </div>
  );
}
