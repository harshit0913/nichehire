'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';
import FeedbackModal from '../components/FeedbackModal';

interface UserDashboardData {
  userId: string;
  email: string;
  isFounder: boolean;
  assignedRole: string | null;
  level: string;
  badge: string;
  quotaBypass: boolean;
  referralCode: string;
  referralCount: number;
  provisionalCount: number;
  recentReferrals: Array<{ id: string; maskedId: string; status: string; createdAt: string }>;
  remainingQuotas: {
    tailoredResumes: number;
    hrEmailDrafts: number;
  };
}

interface UserFeedbackHistory {
  id: string;
  type: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function CandidateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<UserFeedbackHistory[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/user/access-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const access = await res.json();
        setData(access);

        // Fetch user's own submitted feedbacks & founder replies
        const { data: fbRows } = await supabase
          .from('user_feedbacks')
          .select('id, type, message, status, admin_reply, replied_at, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (fbRows) {
          setMyFeedbacks(fbRows);
        }
      } catch (err) {
        console.error('Failed to load user dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const referralUrl = typeof window !== 'undefined' && data?.referralCode
    ? `${window.location.origin}/?ref=${data.referralCode}`
    : `https://nichehire.in/?ref=${data?.referralCode || 'NICHE'}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! Check out NicheHire — fresh verified jobs under 7 days old, direct company career links, and AI resume tailoring. Join using my invite: ${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2B4EE6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-medium">Loading your candidate dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data?.userId) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center text-xl mx-auto">
            👤
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sign In Required</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Please sign in to view your tier status, team role, remaining AI quotas, and direct replies from the NicheHire team.
          </p>
          <Link
            href="/"
            className="block w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Go to Homepage & Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Tier info calculations
  const tierColor =
    data.level === 'unlimited' || data.isFounder
      ? 'from-amber-500 to-yellow-600'
      : data.level === 'premium'
      ? 'from-indigo-600 to-blue-600'
      : data.level === 'trusted'
      ? 'from-emerald-600 to-teal-600'
      : data.level === 'rising'
      ? 'from-cyan-600 to-blue-500'
      : 'from-gray-700 to-gray-900';

  const tierBadgeLabel =
    data.isFounder
      ? '👑 Founder'
      : data.level === 'unlimited'
      ? '⚡ Unlimited Bypass'
      : data.level === 'premium'
      ? '⭐ Full Premium'
      : data.level === 'trusted'
      ? '🛡️ Trusted Candidate'
      : data.level === 'rising'
      ? '🚀 Rising Member'
      : 'Standard Member';

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900 font-sans selection:bg-[#2B4EE6]/15">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      {/* Top Navbar */}
      <header className="border-b border-gray-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#2B4EE6] flex items-center justify-center font-black text-white text-sm">
                NH
              </span>
              <span className="font-bold text-gray-900 tracking-tight text-base">NicheHire</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
              Candidate Hub
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {data.isFounder && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-300 font-semibold hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
              >
                <span>👑</span> Founder Admin
              </Link>
            )}
            <Link
              href="/employer/dashboard"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              <span>🏢</span> Employer Portal
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-[#2B4EE6] text-white font-semibold hover:bg-[#1E3BBD] transition-colors"
            >
              Search Jobs
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Founder Assigned Role Banner (If Assigned) */}
        {data.assignedRole && data.assignedRole !== 'Member' && (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 text-white p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-purple-500/30 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shrink-0">
                {data.assignedRole.toLowerCase().includes('founder') ? '👑' : data.assignedRole.toLowerCase().includes('intern') ? '💼' : '🚀'}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-purple-200 font-bold">
                  Official Team Designation
                </div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{data.assignedRole}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium border border-white/20">
                    Verified
                  </span>
                </h2>
                <p className="text-xs text-purple-200/90 mt-0.5">
                  Assigned directly by the NicheHire Founder to your candidate profile.
                </p>
              </div>
            </div>
            {data.quotaBypass && (
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-semibold shrink-0">
                ⚡ Unlimited AI Access Enabled
              </div>
            )}
          </div>
        )}

        {/* Member Profile Hero & Tier Status Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Logged In Account:</span>
              <span className="text-xs font-mono font-semibold text-gray-800">{data.email}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex flex-wrap items-center gap-2.5">
              <span>Your Candidate Dashboard</span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold text-white bg-gradient-to-r ${tierColor} shadow-xs`}>
                {tierBadgeLabel}
              </span>
            </h1>
            <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
              Track your monthly AI quotas, access tailored government exams, invite peers to unlock higher tiers, and review direct responses from the NicheHire team.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-2xl transition-colors flex items-center gap-2"
            >
              <span>💬</span> Submit Feedback / Bug
            </button>
            <Link
              href="/govt-exams"
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2B4EE6] text-xs font-semibold rounded-2xl transition-colors flex items-center gap-2"
            >
              <span>🏛️</span> Govt Exams Hub
            </Link>
          </div>
        </div>

        {/* Monthly Quota & Usage Meter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Quota 1: Tailored Resumes */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <span>📄</span> AI Tailored Resumes
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Monthly Quota</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">
                {data.quotaBypass ? '∞' : data.remainingQuotas.tailoredResumes}
              </span>
              <span className="text-xs text-gray-500">
                {data.quotaBypass ? 'Unlimited bypass' : '/ 11 remaining'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#2B4EE6] h-1.5 rounded-full transition-all"
                style={{
                  width: data.quotaBypass ? '100%' : `${Math.min(100, (data.remainingQuotas.tailoredResumes / 11) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-gray-500">
              Resets on the 1st of every month. Customizes your CV for specific job descriptions.
            </p>
          </div>

          {/* Quota 2: HR Cold Email Drafts */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <span>✉️</span> Recruiter Cold Emails
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Monthly Quota</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">
                {data.quotaBypass ? '∞' : data.remainingQuotas.hrEmailDrafts}
              </span>
              <span className="text-xs text-gray-500">
                {data.quotaBypass ? 'Unlimited bypass' : '/ 20 remaining'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{
                  width: data.quotaBypass ? '100%' : `${Math.min(100, (data.remainingQuotas.hrEmailDrafts / 20) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-gray-500">
              High-converting cold outreach messages for LinkedIn & HR inbox outreach.
            </p>
          </div>

          {/* Quota 3: Referral Milestone Progress */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <span>👥</span> Qualified Referrals
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Lifetime Tier</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{data.referralCount}</span>
              <span className="text-xs text-gray-500">friends invited</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (data.referralCount / 100) * 100)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-gray-500">
              10 ➔ Rising • 50 ➔ Trusted • 100 ➔ Lifetime Full Premium!
            </p>
          </div>
        </div>

        {/* Personal Referral Link Station */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🎁</span> Your Personal Referral Link
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Share this link with classmates, colleagues, and job seekers to unlock permanent Premium perks.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-mono font-bold">
              {data.referralCode}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-mono text-gray-700 focus:outline-none"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={copyRefLink}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-2xl transition-colors shadow-xs shrink-0"
              >
                {copiedRef ? '✓ Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-2xl transition-colors shadow-xs shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>💬</span> WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* User Submitted Feedback & Founder Replies Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>💬</span> My Feedback & Founder Responses
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review your suggestions, bug reports, and official answers directly from Harshit Mishra (Founder).
              </p>
            </div>
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="text-xs text-[#2B4EE6] hover:text-[#1E3BBD] font-semibold flex items-center gap-1"
            >
              + Send New Feedback
            </button>
          </div>

          {myFeedbacks.length === 0 ? (
            <div className="text-center py-10 space-y-2 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <span className="text-2xl">📝</span>
              <p className="text-xs text-gray-500 font-medium">You haven't submitted any feedback or bug reports yet.</p>
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="text-xs text-[#2B4EE6] font-semibold underline underline-offset-4"
              >
                Report an issue or suggest a feature
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myFeedbacks.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                        {item.type}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status === 'resolved' ? '✓ Resolved' : '● In Review'}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-gray-800 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-100">
                    {item.message}
                  </p>

                  {/* Founder's Reply Card */}
                  {item.admin_reply ? (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <span>👑</span> Official Reply from Harshit Mishra (Founder & CEO):
                        </span>
                        <span className="text-[10px] text-blue-600 font-normal">
                          {item.replied_at ? new Date(item.replied_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-blue-950 leading-relaxed whitespace-pre-wrap">
                        {item.admin_reply}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic">
                      ⏳ Under review by founder. You will receive an official in-app reply here once reviewed.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        userId={data.userId}
        userEmail={data.email}
      />
    </div>
  );
}
