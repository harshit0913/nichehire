'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Lock,
  Mail,
  MessageSquare,
  Search,
  Users,
  X,
  XCircle,
} from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'general' | 'complaint';
  message: string;
  email: string | null;
  user_id: string | null;
  url_context: string | null;
  status: 'new' | 'in_progress' | 'resolved';
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface TeamMemberItem {
  userId: string;
  tier: string;
  assignedRole: string;
  accessLevel: 'unlimited' | 'premium' | 'basic' | 'revoked';
  note: string;
  joinedAt: string | null;
  displayLabel: string;
}

interface PaymentItem {
  id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  plan_amount: number;
  plan_name: string;
  utr_number: string;
  screenshot_data: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  verified_at?: string;
  admin_notes?: string;
}

export default function FounderAdminPage() {
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'team' | 'payments'>('feedbacks');
  const [loading, setLoading] = useState(true);
  const [isFounderUser, setIsFounderUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Team & Permissions State
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editAccessLevel, setEditAccessLevel] = useState<'unlimited' | 'premium' | 'basic' | 'revoked'>('unlimited');
  const [editNote, setEditNote] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  // Payments & Verification State
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  // Founder Referral Link
  const [copiedLink, setCopiedLink] = useState(false);
  const founderReferralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=FOUNDER` : 'https://nichehire.in/?ref=FOUNDER';

  useEffect(() => {
    async function initAdmin() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setSessionToken(session.access_token);
      setUserEmail(session.user.email || '');

      // Verify access status
      try {
        const res = await fetch('/api/user/access-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.isFounder) {
          setIsFounderUser(true);
          await loadFeedbacks(session.access_token);
          await loadTeam(session.access_token);
          await loadPayments(session.access_token);
        }
      } catch (err) {
        console.error('Failed to authenticate founder status:', err);
      } finally {
        setLoading(false);
      }
    }

    initAdmin();
  }, []);

  async function loadFeedbacks(token: string) {
    try {
      const res = await fetch('/api/admin/feedbacks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.feedbacks) {
        setFeedbacks(data.feedbacks);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    }
  }

  async function loadTeam(token: string) {
    try {
      const res = await fetch('/api/admin/team', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.members) {
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  async function loadPayments(token: string) {
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  }

  async function handleSendReply(feedbackId: string, email: string | null) {
    const text = replyTextMap[feedbackId]?.trim();
    if (!text) return;

    setSubmittingReplyId(feedbackId);
    try {
      const res = await fetch('/api/admin/feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          feedbackId,
          replyMessage: text,
          markResolved: true,
          sendEmail: Boolean(email),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

      setActionSuccessMsg('Official reply published to user dashboard and recorded.');
      setTimeout(() => setActionSuccessMsg(''), 3000);

      await loadFeedbacks(sessionToken);
      setReplyTextMap((prev) => ({ ...prev, [feedbackId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Could not send reply.');
    } finally {
      setSubmittingReplyId(null);
    }
  }

  async function handleSaveTeamMember(targetUserId: string) {
    setSavingMember(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          targetUserId,
          accessLevel: editAccessLevel,
          assignedRole: editRole.trim() || 'Member',
          note: editNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      setActionSuccessMsg(`Updated ${data.assignedRole} permissions to ${data.accessLevel}!`);
      setTimeout(() => setActionSuccessMsg(''), 3000);

      setEditingMemberId(null);
      await loadTeam(sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not update team member.');
    } finally {
      setSavingMember(false);
    }
  }

  async function handleUpdatePaymentStatus(paymentId: string, newStatus: 'approved' | 'rejected') {
    setVerifyingPaymentId(paymentId);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          paymentId,
          newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment status');

      setActionSuccessMsg(
        newStatus === 'approved'
          ? 'Payment verified & approved! Featured placement activated for employer.'
          : 'Payment marked as rejected.'
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);

      await loadPayments(sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not update payment.');
    } finally {
      setVerifyingPaymentId(null);
    }
  }

  const copyReferralLink = () => {
    navigator.clipboard.writeText(founderReferralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredFeedbacks = feedbacks.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchMsg = item.message.toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      if (!matchMsg && !matchEmail) return false;
    }
    return true;
  });

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E131F] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-400">Authenticating Founder Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isFounderUser) {
    return (
      <div className="min-h-screen bg-[#0E131F] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#181F33] p-8 rounded-2xl border border-gray-800 text-center shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <Lock size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
          </div>
          <h1 className="text-xl font-bold mb-2">Restricted Access</h1>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            This command center is reserved exclusively for the Founder of NicheHire.
            Signed in as: <span className="text-gray-200 font-mono font-medium">{userEmail || 'Anonymous'}</span>
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-blue-500/20">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      {/* Top Navigation */}
      <header className="border-b border-gray-800 bg-[#0E1424]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-md">
                NH
              </span>
              <span className="font-bold text-white tracking-tight text-base">NicheHire</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1.5">
              <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Founder Portal
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Candidate View
            </Link>
            <Link
              href="/employer/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Employer Dashboard
            </Link>
            <div className="border-l border-gray-800 pl-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-gray-400 text-[11px] font-mono">{userEmail}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert Toast */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
            <span>{actionSuccessMsg}</span>
            <button onClick={() => setActionSuccessMsg('')} className="text-emerald-400 hover:text-white p-1" aria-label="Close notification">
              <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
          </div>
        )}

        {/* Founder Referral Card */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white">Your Founder Referral &amp; Team Onboarding Link</h2>
            </div>
            <p className="text-xs text-gray-400">
              Users signing up via this link automatically link to your founder profile. You can assign them custom roles (Co-Founder, Intern, Core Team) and grant unlimited/premium access below.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              readOnly
              value={founderReferralLink}
              className="bg-black/40 border border-gray-700 px-3 py-2 rounded-xl text-xs font-mono text-gray-300 w-full md:w-64 focus:outline-none"
            />
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-sm"
            >
              {copiedLink ? (
                <span className="inline-flex items-center gap-1"><Check size={12} strokeWidth={ICON_STROKE_WIDTH} /> Copied!</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Copy size={12} strokeWidth={ICON_STROKE_WIDTH} /> Copy Link</span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4">
            <span className="text-xs text-gray-400 block mb-1 font-medium">Total Feedbacks</span>
            <div className="text-2xl font-black text-white">{feedbacks.length}</div>
          </div>
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4">
            <span className="text-xs text-rose-400 block mb-1 font-medium">Open Bug Reports</span>
            <div className="text-2xl font-black text-rose-400">
              {feedbacks.filter((f) => f.type === 'bug' && f.status !== 'resolved').length}
            </div>
          </div>
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4">
            <span className="text-xs text-amber-400 block mb-1 font-medium">Pending Payments</span>
            <div className="text-2xl font-black text-amber-400">{pendingPaymentsCount}</div>
          </div>
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4">
            <span className="text-xs text-purple-400 block mb-1 font-medium">Referred Team Members</span>
            <div className="text-2xl font-black text-purple-400">{teamMembers.length}</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-gray-800 flex flex-wrap gap-4 sm:gap-6">
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'feedbacks'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Feedback, Bugs &amp; Suggestions
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-300">
              {feedbacks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Referred Team &amp; Role Permissions
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-300">
              {teamMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Employer Payments &amp; UTRs
            {pendingPaymentsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                {pendingPaymentsCount} pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-400">
                {payments.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FEEDBACKS & BUGS */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12192B] p-3 rounded-2xl border border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mr-1">Filter:</span>
                {(['all', 'bug', 'feature', 'complaint', 'general'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      filterType === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t === 'bug' ? 'Bugs' : t === 'feature' ? 'Suggestions' : t === 'complaint' ? 'Complaints' : 'General'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New / Unanswered</option>
                  <option value="resolved">Resolved</option>
                </select>
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none w-full sm:w-48"
                />
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
                No feedback submissions found matching this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedbacks.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-5 space-y-3.5 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            item.type === 'bug'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.type === 'feature'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : item.type === 'complaint'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {item.type === 'bug' ? 'Bug Report' : item.type === 'feature' ? 'Feature Idea' : item.type === 'complaint' ? 'Complaint' : 'General'}
                        </span>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                            item.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                          }`}
                        >
                          {item.status === 'resolved' ? (
                            <>
                              <BadgeCheck size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                              <span>Resolved</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                              <span>Needs Reply</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-3">
                        {item.email && (
                          <span className="text-gray-300 font-medium">From: {item.email}</span>
                        )}
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap bg-black/20 p-3.5 rounded-xl border border-gray-800/50">
                      {item.message}
                    </p>

                    {item.admin_reply && (
                      <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-blue-300">
                          <span className="inline-flex items-center gap-1.5">
                            <MessageSquare size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Your Official Reply:
                          </span>
                          <span className="text-gray-400 font-normal">
                            {item.replied_at ? new Date(item.replied_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{item.admin_reply}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-800/60 flex flex-col gap-2.5">
                      <label className="text-[11px] font-semibold text-gray-400">
                        {item.admin_reply ? 'Update Official Reply:' : 'Post Official Reply to User Dashboard:'}
                      </label>
                      <textarea
                        rows={2}
                        value={replyTextMap[item.id] !== undefined ? replyTextMap[item.id] : (item.admin_reply || '')}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [item.id]: e.target.value })}
                        placeholder="Write a clear response or resolution notice. This will appear instantly on the user's dashboard..."
                        className="bg-black/30 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.email && (
                            <a
                              href={`mailto:${item.email}?subject=NicheHire Support: Regarding your ${item.type}&body=Hi,%0A%0AThank you for contacting NicheHire support.`}
                              className="text-[11px] text-gray-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                            >
                              <Mail size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                              <span>Reply via Personal Email</span>
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleSendReply(item.id, item.email)}
                          disabled={submittingReplyId === item.id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{submittingReplyId === item.id ? 'Sending...' : 'Publish Reply to Dashboard'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REFERRED TEAM & ROLE PERMISSIONS */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">Direct Founder Referrals &amp; Role Assignments</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Candidates who joined NicheHire using your founder referral link (<code className="text-blue-400">?ref=FOUNDER</code>).
                You can designate specific team titles (e.g. <strong>Co-Founder, Intern, Core Team, Advisor</strong>) and change their access override to <strong>Unlimited</strong> or <strong>Full Premium</strong>.
              </p>
            </div>

            {teamMembers.length === 0 ? (
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs space-y-3">
                <p>No candidates have signed up through your founder link yet.</p>
                <button
                  onClick={copyReferralLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors inline-block"
                >
                  Share Founder Link: ?ref=FOUNDER
                </button>
              </div>
            ) : (
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0E1424] text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Candidate</th>
                        <th className="py-3.5 px-4 font-semibold">Assigned Team Role</th>
                        <th className="py-3.5 px-4 font-semibold">Access Level</th>
                        <th className="py-3.5 px-4 font-semibold">Tier Status</th>
                        <th className="py-3.5 px-4 font-semibold">Joined</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {teamMembers.map((m) => {
                        const isEditing = editingMemberId === m.userId;
                        return (
                           <tr key={m.userId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-4 font-mono font-medium text-gray-200">
                              {m.displayLabel}
                            </td>

                            <td className="py-4 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    placeholder="e.g. Co-Founder, Intern..."
                                    className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-lg text-xs text-white focus:outline-none w-44"
                                  />
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg font-bold text-xs inline-block bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  {m.assignedRole}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              {isEditing ? (
                                <select
                                  value={editAccessLevel}
                                  onChange={(e: any) => setEditAccessLevel(e.target.value)}
                                  className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-lg text-xs text-white focus:outline-none"
                                >
                                  <option value="unlimited">Unlimited Bypass</option>
                                  <option value="premium">Full Premium</option>
                                  <option value="basic">Standard Member</option>
                                  <option value="revoked">Revoked</option>
                                </select>
                              ) : (
                                <span className={`font-semibold ${
                                  m.accessLevel === 'unlimited' ? 'text-amber-400' : m.accessLevel === 'premium' ? 'text-blue-400' : 'text-gray-400'
                                }`}>
                                  {m.accessLevel.toUpperCase()}
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 capitalize text-gray-300">{m.tier}</td>
                            <td className="py-4 px-4 text-gray-400">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Recent'}</td>

                            <td className="py-4 px-4 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleSaveTeamMember(m.userId)}
                                    disabled={savingMember}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingMemberId(null)}
                                    className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingMemberId(m.userId);
                                    setEditRole(m.assignedRole);
                                    setEditAccessLevel(m.accessLevel);
                                    setEditNote(m.note);
                                  }}
                                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Edit Role &amp; Access
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EMPLOYER PAYMENTS & MANUAL UTR VERIFICATION */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} /> Employer Payment Proof &amp; Manual Verification Center
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                When an employer pays via your UPI ID (<code className="text-emerald-400">harshit0913@slc</code>), their 12-digit UTR and payment screenshot appear here.
                Inspect the screenshot against your bank account statement, then click <strong>"Approve"</strong> to activate their featured job placement or <strong>"Reject"</strong> if unverified.
              </p>
            </div>

            {payments.length === 0 ? (
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
                No employer payments have been submitted yet.
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-5 space-y-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                      <div>
                        <span className="text-sm font-black text-white">{p.company_name}</span>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {p.contact_email} {p.contact_phone ? `• ${p.contact_phone}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-emerald-400">
                          ₹{p.plan_amount}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                            p.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.status === 'approved' ? (
                            <>
                              <BadgeCheck size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
                              <span>Verified &amp; Active</span>
                            </>
                          ) : p.status === 'rejected' ? (
                            <>
                              <XCircle size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D9534F]" />
                              <span>Rejected</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-[#D97B0A]" />
                              <span>Pending Review</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px] block">Selected Plan:</span>
                          <strong className="text-gray-200">{p.plan_name}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">12-Digit Transaction UTR:</span>
                          <span className="font-mono text-amber-300 font-bold text-sm bg-black/40 px-2 py-0.5 rounded border border-gray-800">
                            {p.utr_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Submitted Date:</span>
                          <span className="text-gray-400">{new Date(p.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Screenshot Thumbnail */}
                      <div>
                        <span className="text-gray-500 text-[11px] block mb-1.5">Payment Screenshot Proof:</span>
                        {p.screenshot_data ? (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.screenshot_data}
                              alt="Payment Proof"
                              className="w-20 h-20 object-cover rounded-xl border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setViewingScreenshot(p.screenshot_data)}
                            />
                            <button
                              onClick={() => setViewingScreenshot(p.screenshot_data)}
                              className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              <Search size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                              <span>Click to inspect screenshot in full size</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs italic">No image attached</span>
                        )}
                      </div>
                    </div>

                    {/* Verification Action Buttons */}
                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {p.verified_at ? `Audited on ${new Date(p.verified_at).toLocaleDateString()}` : 'Awaiting founder audit'}
                      </span>
                      <div className="flex items-center gap-2">
                        {p.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, 'approved')}
                            disabled={verifyingPaymentId === p.id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Check size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                            <span>Approve Payment &amp; Activate</span>
                          </button>
                        )}
                        {p.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, 'rejected')}
                            disabled={verifyingPaymentId === p.id}
                            className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1"
                          >
                            <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Screenshot Full-Size Modal */}
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#12192B] rounded-3xl max-w-2xl w-full p-6 relative border border-gray-800 space-y-4">
            <button
              onClick={() => setViewingScreenshot(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
              aria-label="Close modal"
            >
              <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
            </button>
            <h3 className="text-sm font-bold text-white">Payment Screenshot Proof</h3>
            <div className="bg-black/60 rounded-2xl p-2 border border-gray-800 flex items-center justify-center max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingScreenshot}
                alt="Payment Proof Full View"
                className="max-h-[70vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
