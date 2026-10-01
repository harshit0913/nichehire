'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useAuth } from '@clerk/nextjs';
import { supabase } from '../supabase';
import { getCandidateSession } from '../lib/authSession';
import { isFounderEmail } from '../lib/authResolver';

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CreditCard,
  Crown,
  Eye,
  FileText,
  Globe,
  Landmark,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from '../components/icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';
import { VERIFIED_GOVT_EXAMS } from '../data/govtExamsData';
import { NAGAR_NIGAM_DIRECTORY, STATE_MUNICIPAL_OVERVIEWS } from '../data/nagarNigamDirectory';
import { ALL_INDIA_DISTRICT_DIRECTORY } from '../data/allIndiaDistrictsData';

interface AnalyticsData {
  users: {
    total: number;
    candidates: number;
    employers: number;
    team: number;
    tiers: { member: number; rising: number; trusted: number; premium: number };
    newSignupsThisWeek: number;
  };
  traffic: {
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
    todayUnique: number;
    weekVisits: number;
    dailyTrends: Array<{ date: string; visits: number; uniqueVisitors: number }>;
    topRoutes: Array<{ path: string; visits: number; percentage: number }>;
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
      desktopPct: number;
      mobilePct: number;
      tabletPct: number;
    };
    referrerSources: Array<{ source: string; count: number; percentage: number }>;
  };
  operations: {
    totalJobs: number;
    totalApplications: number;
    activeWalkins: number;
    referrals: {
      total: number;
      qualified: number;
      provisional: number;
      conversionRatePct: number;
    };
    monetization: {
      approvedRevenueInr: number;
      approvedTransactions: number;
      pendingRevenueInr: number;
      pendingTransactions: number;
    };
    feedbacks: {
      total: number;
      openBugs: number;
      resolved: number;
    };
  };
}

interface TeamMemberItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  roleTitle: string;
  status: 'approved' | 'pending' | 'revoked';
  canEditJobs: boolean;
  canManageWalkins: boolean;
  canVerifyPayments: boolean;
  canReplyFeedbacks: boolean;
  canEditWebsite: boolean;
  canViewAnalytics: boolean;
  approvedBy?: string;
  approvedAt: string;
  joinedAt?: string;
  notes?: string;
}

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
  const [activeTab, setActiveTab] = useState<'analytics' | 'team' | 'payments' | 'feedbacks' | 'govt_sync'>('analytics');
  const [loading, setLoading] = useState(true);
  const [isFounderUser, setIsFounderUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [activeUserId, setActiveUserId] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const { getToken: getClerkToken } = useAuth();

  // 10-Minute Daily Server Update & Govt Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('');
  const [syncManifest, setSyncManifest] = useState<any>(null);
  const [syncStateFilter, setSyncStateFilter] = useState('All');
  const [syncSearchQuery, setSyncSearchQuery] = useState('');

  // Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Team & Website Permissions State
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'revoked'>('approved');
  const [editPermissions, setEditPermissions] = useState({
    canEditJobs: true,
    canManageWalkins: true,
    canVerifyPayments: false,
    canReplyFeedbacks: true,
    canEditWebsite: true,
    canViewAnalytics: true,
  });
  const [savingMember, setSavingMember] = useState(false);

  // Add / Approve New Member Modal State
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Website Editor');
  const [newMemberNotes, setNewMemberNotes] = useState('');
  const [newMemberPermissions, setNewMemberPermissions] = useState({
    canEditJobs: true,
    canManageWalkins: true,
    canVerifyPayments: false,
    canReplyFeedbacks: true,
    canEditWebsite: true,
    canViewAnalytics: true,
  });
  const [isSubmittingNewMember, setIsSubmittingNewMember] = useState(false);

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Payments State
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  // Founder Referral Link
  const [copiedLink, setCopiedLink] = useState(false);
  const founderReferralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=FOUNDER` : 'https://www.nichehire.tech/?ref=FOUNDER';

  const getHeaders = (token?: string, extraHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = { ...extraHeaders };
    const t = token || sessionToken;
    if (t) headers['Authorization'] = `Bearer ${t}`;
    if (userEmail) headers['x-user-email'] = userEmail;
    if (activeUserId) headers['x-user-id'] = activeUserId;
    return headers;
  };

  useEffect(() => {
    async function initAdmin() {
      if (!isClerkLoaded) return;

      setLoading(true);
      let activeToken = '';
      let activeEmail = '';
      let uid = '';

      // 1. Clerk session
      if (isClerkSignedIn && clerkUser) {
        activeEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
        uid = clerkUser.id;
        try {
          activeToken = (await getClerkToken()) || '';
        } catch {}
      }

      // 2. Supabase session
      if (!activeToken) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          activeToken = session.access_token;
          activeEmail = session.user?.email || activeEmail;
          uid = session.user?.id || uid;
        }
      }

      // 3. Candidate session (OTP)
      if (!activeToken) {
        const candidateSession = getCandidateSession();
        if (candidateSession) {
          activeToken = candidateSession.sessionToken || '';
          activeEmail = candidateSession.user?.email || (candidateSession.user?.phone ? candidateSession.user.phone : '') || activeEmail;
          uid = candidateSession.user?.id || uid;
        }
      }

      setSessionToken(activeToken);
      setUserEmail(activeEmail);
      setActiveUserId(uid);

      const isFounder = isFounderEmail(activeEmail);
      if (isFounder) {
        setIsFounderUser(true);
      }

      if (!activeToken && !activeEmail) {
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;
        if (activeEmail) headers['x-user-email'] = activeEmail;
        if (uid) headers['x-user-id'] = uid;

        const res = await fetch('/api/user/access-status', { headers });
        const data = await res.json();
        if (data.isFounder || isFounder) {
          setIsFounderUser(true);
          await Promise.all([
            loadAnalytics(activeToken, activeEmail, uid),
            loadTeam(activeToken, activeEmail, uid),
            loadPayments(activeToken, activeEmail, uid),
            loadFeedbacks(activeToken, activeEmail, uid),
            loadGovtSync(),
          ]);
        }
      } catch (err) {
        console.error('Failed to authenticate founder status:', err);
      } finally {
        setLoading(false);
      }
    }

    initAdmin();
  }, [isClerkLoaded, isClerkSignedIn, clerkUser]);

  async function loadAnalytics(token?: string, email?: string, uid?: string) {
    setLoadingAnalytics(true);
    try {
      const headers: Record<string, string> = {};
      const t = token || sessionToken;
      const em = email || userEmail;
      const u = uid || activeUserId;
      if (t) headers['Authorization'] = `Bearer ${t}`;
      if (em) headers['x-user-email'] = em;
      if (u) headers['x-user-id'] = u;

      const res = await fetch('/api/admin/analytics', { headers });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function loadTeam(token?: string, email?: string, uid?: string) {
    try {
      const headers: Record<string, string> = {};
      const t = token || sessionToken;
      const em = email || userEmail;
      const u = uid || activeUserId;
      if (t) headers['Authorization'] = `Bearer ${t}`;
      if (em) headers['x-user-email'] = em;
      if (u) headers['x-user-id'] = u;

      const res = await fetch('/api/admin/team', { headers });
      const data = await res.json();
      if (data.members) {
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  async function loadPayments(token?: string, email?: string, uid?: string) {
    try {
      const headers: Record<string, string> = {};
      const t = token || sessionToken;
      const em = email || userEmail;
      const u = uid || activeUserId;
      if (t) headers['Authorization'] = `Bearer ${t}`;
      if (em) headers['x-user-email'] = em;
      if (u) headers['x-user-id'] = u;

      const res = await fetch('/api/admin/payments', { headers });
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  }

  async function loadFeedbacks(token?: string, email?: string, uid?: string) {
    try {
      const headers: Record<string, string> = {};
      const t = token || sessionToken;
      const em = email || userEmail;
      const u = uid || activeUserId;
      if (t) headers['Authorization'] = `Bearer ${t}`;
      if (em) headers['x-user-email'] = em;
      if (u) headers['x-user-id'] = u;

      const res = await fetch('/api/admin/feedbacks', { headers });
      const data = await res.json();
      if (data.feedbacks) {
        setFeedbacks(data.feedbacks);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    }
  }

  async function loadGovtSync() {
    try {
      const res = await fetch('/api/admin/govt-sync');
      const data = await res.json();
      if (data.success && data.data) {
        setSyncManifest(data.data);
      }
    } catch (err) {
      console.error('Error fetching govt sync manifest:', err);
    }
  }

  async function handleRunDailyGovtSync() {
    setSyncLoading(true);
    setSyncProgressMsg('⚡ Initiating Daily Server Update: Auditing all 36 States & UTs...');
    try {
      const res = await fetch('/api/admin/govt-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncManifest(data.data);
        setSyncProgressMsg('✓ 10-Minute Daily Server Update Complete! All deadlines and ULBs synchronized.');
        setActionSuccessMsg('Daily Server Update & Govt Sync completed successfully!');
        setTimeout(() => setActionSuccessMsg(''), 5000);
      } else {
        setSyncProgressMsg('❌ Sync issue: ' + (data.error || 'Failed'));
      }
    } catch (err: any) {
      setSyncProgressMsg('❌ Sync failed: ' + err.message);
    } finally {
      setSyncLoading(false);
    }
  }

  // Handle Adding / Approving New Team Member
  async function handleAddTeamMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      alert('Please provide member full name and email/phone.');
      return;
    }

    setIsSubmittingNewMember(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: getHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          fullName: newMemberName.trim(),
          roleTitle: newMemberRole,
          permissions: newMemberPermissions,
          notes: newMemberNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve member');

      setActionSuccessMsg(data.message || 'Team member approved successfully!');
      setTimeout(() => setActionSuccessMsg(''), 4000);

      setAddMemberModalOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberNotes('');
      await loadTeam(sessionToken);
      if (analytics) {
        setAnalytics({
          ...analytics,
          users: {
            ...analytics.users,
            team: analytics.users.team + 1,
          },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Could not approve team member');
    } finally {
      setIsSubmittingNewMember(false);
    }
  }

  // Handle Updating Existing Team Member Permissions
  async function handleSaveTeamMember(targetUserId: string) {
    setSavingMember(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: getHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetUserId,
          roleTitle: editRoleTitle.trim(),
          status: editStatus,
          permissions: editPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member permissions');

      setActionSuccessMsg(`Permissions updated for ${data.member?.fullName || 'member'}!`);
      setTimeout(() => setActionSuccessMsg(''), 3000);

      setEditingMemberId(null);
      await loadTeam(sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not update member');
    } finally {
      setSavingMember(false);
    }
  }

  // Handle Quick Status Toggle (Approve or Revoke)
  async function handleQuickStatusToggle(member: TeamMemberItem, newStatus: 'approved' | 'revoked') {
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: getHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetUserId: member.userId,
          status: newStatus,
          roleTitle: member.roleTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setActionSuccessMsg(
        newStatus === 'approved'
          ? `Access approved for ${member.fullName}! They can now make approved changes.`
          : `Access revoked for ${member.fullName}.`
      );
      setTimeout(() => setActionSuccessMsg(''), 3000);

      await loadTeam(sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    }
  }

  // Handle Delete Team Member
  async function handleDeleteTeamMember(userId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) return;

    try {
      const res = await fetch(`/api/admin/team?userId=${userId}`, {
        method: 'DELETE',
        headers: getHeaders(sessionToken),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');

      setActionSuccessMsg(`Removed ${name} from team permissions.`);
      setTimeout(() => setActionSuccessMsg(''), 3000);

      await loadTeam(sessionToken);
    } catch (err: any) {
      alert(err.message || 'Could not remove member');
    }
  }

  // Role Preset Selector
  function applyRolePreset(preset: 'editor' | 'operations' | 'moderator' | 'admin') {
    if (preset === 'editor') {
      setNewMemberRole('Website Editor');
      setNewMemberPermissions({
        canEditJobs: true,
        canManageWalkins: true,
        canVerifyPayments: false,
        canReplyFeedbacks: true,
        canEditWebsite: true,
        canViewAnalytics: true,
      });
    } else if (preset === 'operations') {
      setNewMemberRole('Operations Manager');
      setNewMemberPermissions({
        canEditJobs: true,
        canManageWalkins: true,
        canVerifyPayments: true,
        canReplyFeedbacks: true,
        canEditWebsite: false,
        canViewAnalytics: true,
      });
    } else if (preset === 'moderator') {
      setNewMemberRole('Content Moderator');
      setNewMemberPermissions({
        canEditJobs: false,
        canManageWalkins: true,
        canVerifyPayments: false,
        canReplyFeedbacks: true,
        canEditWebsite: false,
        canViewAnalytics: false,
      });
    } else if (preset === 'admin') {
      setNewMemberRole('Co-Admin');
      setNewMemberPermissions({
        canEditJobs: true,
        canManageWalkins: true,
        canVerifyPayments: true,
        canReplyFeedbacks: true,
        canEditWebsite: true,
        canViewAnalytics: true,
      });
    }
  }

  async function handleSendReply(feedbackId: string, email: string | null) {
    const text = replyTextMap[feedbackId]?.trim();
    if (!text) return;

    setSubmittingReplyId(feedbackId);
    try {
      const res = await fetch('/api/admin/feedbacks', {
        method: 'POST',
        headers: getHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          feedbackId,
          replyMessage: text,
          markResolved: true,
          sendEmail: Boolean(email),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

      setActionSuccessMsg('Official reply published to candidate dashboard.');
      setTimeout(() => setActionSuccessMsg(''), 3000);

      await loadFeedbacks(sessionToken);
      setReplyTextMap((prev) => ({ ...prev, [feedbackId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Could not send reply.');
    } finally {
      setSubmittingReplyId(null);
    }
  }

  async function handleUpdatePaymentStatus(paymentId: string, newStatus: 'approved' | 'rejected') {
    setVerifyingPaymentId(paymentId);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: getHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          paymentId,
          newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment status');

      setActionSuccessMsg(
        newStatus === 'approved'
          ? 'Payment verified & approved! Featured placement activated.'
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
          <p className="text-sm font-medium text-gray-400">Authenticating Founder Credentials &amp; Analytics...</p>
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
          <h1 className="text-xl font-bold mb-2">Founder Command Center Restricted</h1>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            This portal is reserved exclusively for the Founder of NicheHire.
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
              <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Founder &amp; Team Center
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Candidate Hub
            </Link>
            <Link
              href="/employer/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Employer Portal
            </Link>
            <div className="border-l border-gray-800 pl-3 flex items-center gap-2">
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

        {/* Founder Referral & Fast Invite Card */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white">Founder Onboarding &amp; VIP Referral Link</h2>
            </div>
            <p className="text-xs text-gray-400">
              Share with prospective team members or VIP candidates. Their accounts automatically link to your founder tree so you can assign website editing access below.
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

        {/* 4 High-Level Top Insight Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 1: Total Registered Users */}
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <Users size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-blue-400" /> Total Users
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                +{analytics?.users.newSignupsThisWeek ?? 0} this week
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {analytics?.users.total ?? (teamMembers.length > 0 ? teamMembers.length : 1)}
              </span>
              <span className="text-xs text-gray-400 font-medium">registered accounts</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1 border-t border-gray-800/60">
              <span>{analytics?.users.candidates ?? 0} Candidates</span>
              <span>&bull;</span>
              <span>{analytics?.users.employers ?? 0} Employers</span>
              <span>&bull;</span>
              <span className="text-purple-300 font-semibold">{analytics?.users.team ?? teamMembers.length} Team</span>
            </div>
          </div>

          {/* Card 2: Total Site Traffic & Page Views */}
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <Eye size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400" /> Total Site Visits
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                Live Traffic
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {(analytics?.traffic.totalVisits ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 font-medium">views</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1 border-t border-gray-800/60">
              <span className="text-emerald-400 font-bold">{analytics?.traffic.todayVisits ?? 0} today</span>
              <span>&bull;</span>
              <span>{(analytics?.traffic.uniqueVisitors ?? 0).toLocaleString()} Unique</span>
            </div>
          </div>

          {/* Card 3: Active Jobs & Platform Ops */}
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <Briefcase size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-indigo-400" /> Jobs &amp; Applicants
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {analytics?.operations.totalJobs ?? 0}
              </span>
              <span className="text-xs text-gray-400 font-medium">active postings</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1 border-t border-gray-800/60">
              <span>{analytics?.operations.totalApplications ?? 0} applications</span>
              <span>&bull;</span>
              <span>{analytics?.operations.activeWalkins ?? 0} walk-ins</span>
            </div>
          </div>

          {/* Card 4: Employer Revenue & Payments */}
          <div className="bg-[#12192B] border border-gray-800/80 rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <CreditCard size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400" /> Revenue &amp; UTRs
              </span>
              {pendingPaymentsCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold animate-pulse">
                  {pendingPaymentsCount} Pending
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  Up to date
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{(analytics?.operations.monetization.approvedRevenueInr ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 font-medium">verified</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1 border-t border-gray-800/60">
              <span>₹{analytics?.operations.monetization.pendingRevenueInr ?? 0} pending audit</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-gray-800 flex flex-wrap gap-4 sm:gap-6">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Site Analytics &amp; Insights
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
              Live
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
            <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> Team &amp; Website Access Approvals
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">
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
            onClick={() => setActiveTab('govt_sync')}
            className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'govt_sync'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400" />
            ⚡ 10-Minute Daily Server Update &amp; Govt Sync Hub
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-[10px] text-emerald-400 border border-emerald-800/80 font-medium">
              36 States/UTs Live
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SITE ANALYTICS & INSIGHTS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 14-Day Traffic Trend Bar Chart */}
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400" />
                    <span>Daily Traffic &amp; Visitor Trends (Last 14 Days)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time aggregated page views and unique candidate/employer visitors across all pages.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#2B4EE6]"></span>
                    <span className="text-gray-300">Total Visits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
                    <span className="text-gray-300">Unique Visitors</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="pt-2">
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-48 sm:h-52 pt-6">
                  {(analytics?.traffic.dailyTrends || []).map((day, idx) => {
                    const maxVal = Math.max(...(analytics?.traffic.dailyTrends || []).map((d) => d.visits), 280);
                    const visitHeight = Math.max(12, Math.round((day.visits / maxVal) * 100));
                    const uniqueHeight = Math.max(8, Math.round((day.uniqueVisitors / maxVal) * 100));
                    const shortDate = new Date(day.date).toLocaleDateString('en-IN', {
                      month: 'numeric',
                      day: 'numeric',
                    });

                    return (
                      <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg p-2 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                          <div className="font-bold text-gray-200">{day.date}</div>
                          <div className="text-blue-400 font-semibold">{day.visits} Total Visits</div>
                          <div className="text-emerald-400 font-semibold">{day.uniqueVisitors} Unique Visitors</div>
                        </div>

                        {/* Bars container */}
                        <div className="w-full flex items-end justify-center gap-1 h-36">
                          <div
                            className="w-2.5 sm:w-3.5 bg-[#2B4EE6] hover:bg-blue-400 rounded-t-sm transition-all"
                            style={{ height: `${visitHeight}%` }}
                          ></div>
                          <div
                            className="w-2.5 sm:w-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                            style={{ height: `${uniqueHeight}%` }}
                          ></div>
                        </div>

                        <span className="text-[10px] text-gray-500 mt-2 font-mono">{shortDate}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Two-Column Analytics Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Top Visited Pages */}
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-blue-400" />
                    <span>Top Visited Website Routes</span>
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">Page Traffic Share</span>
                </div>

                <div className="space-y-2.5">
                  {(analytics?.traffic.topRoutes || []).map((route, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-black/30 p-2.5 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-gray-800 text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <Link
                          href={route.path}
                          target="_blank"
                          className="font-mono text-gray-200 hover:text-blue-400 truncate hover:underline"
                        >
                          {route.path}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-white">{route.visits.toLocaleString()} visits</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-bold">
                          {route.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Audience, Devices & Tiers */}
              <div className="space-y-6">
                {/* Device Breakdown */}
                <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400" />
                    <span>Device &amp; Platform Distribution</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                        <span>Desktop Computers</span>
                        <span>{analytics?.traffic.deviceBreakdown.desktopPct ?? 0}% ({analytics?.traffic.deviceBreakdown.desktop ?? 0})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${analytics?.traffic.deviceBreakdown.desktopPct ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                        <span>Mobile Phones</span>
                        <span>{analytics?.traffic.deviceBreakdown.mobilePct ?? 0}% ({analytics?.traffic.deviceBreakdown.mobile ?? 0})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${analytics?.traffic.deviceBreakdown.mobilePct ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                        <span>Tablets &amp; iPads</span>
                        <span>{analytics?.traffic.deviceBreakdown.tabletPct ?? 0}% ({analytics?.traffic.deviceBreakdown.tablet ?? 0})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${analytics?.traffic.deviceBreakdown.tabletPct ?? 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Tier Ladder Stats */}
                <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-purple-400" />
                    <span>Candidate Tier Distribution</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-black/30 p-2.5 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-semibold">Standard</span>
                      <span className="text-base font-black text-gray-200">{analytics?.users.tiers.member ?? 0}</span>
                    </div>
                    <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 block font-semibold">Rising (10+)</span>
                      <span className="text-base font-black text-emerald-300">{analytics?.users.tiers.rising ?? 0}</span>
                    </div>
                    <div className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20">
                      <span className="text-[10px] text-amber-400 block font-semibold">Trusted (25+)</span>
                      <span className="text-base font-black text-amber-300">{analytics?.users.tiers.trusted ?? 0}</span>
                    </div>
                    <div className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/20">
                      <span className="text-[10px] text-purple-400 block font-semibold">Premium (50+)</span>
                      <span className="text-base font-black text-purple-300">{analytics?.users.tiers.premium ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TEAM & WEBSITE ACCESS APPROVALS                                   */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className="text-purple-400" />
                  <span>Team Website Access &amp; Modification Permissions</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-2xl">
                  Approve and grant specific access rights to your core team, interns, and co-founders. Authorized team members can edit jobs, add walk-in drives, verify employer payments, and update website content according to the permissions granted below.
                </p>
              </div>

              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
              >
                <Plus size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>+ Approve / Add Team Member</span>
              </button>
            </div>

            {/* Team Members List */}
            {teamMembers.length === 0 ? (
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs space-y-3">
                <p>No team members approved yet.</p>
                <button
                  onClick={() => setAddMemberModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Approve First Team Member
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((m) => {
                  const isEditing = editingMemberId === m.userId;

                  return (
                    <div
                      key={m.userId}
                      className="bg-[#12192B] border border-gray-800/90 rounded-2xl p-5 space-y-4 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 font-bold text-sm flex items-center justify-center border border-purple-500/20">
                            {m.fullName ? m.fullName.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{m.fullName}</h4>
                              <span className="text-[11px] font-mono text-gray-400">({m.email})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {m.roleTitle}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  m.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : m.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {m.status === 'approved' ? 'Approved ✓' : m.status === 'pending' ? 'Pending Approval ⏳' : 'Revoked ✕'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2">
                          {m.status !== 'approved' ? (
                            <button
                              onClick={() => handleQuickStatusToggle(m, 'approved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <Check size={12} strokeWidth={ICON_STROKE_WIDTH} /> Approve Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatusToggle(m, 'revoked')}
                              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-medium transition-colors"
                            >
                              Revoke Access
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingMemberId(null);
                              } else {
                                setEditingMemberId(m.userId);
                                setEditRoleTitle(m.roleTitle);
                                setEditStatus(m.status);
                                setEditPermissions({
                                  canEditJobs: m.canEditJobs,
                                  canManageWalkins: m.canManageWalkins,
                                  canVerifyPayments: m.canVerifyPayments,
                                  canReplyFeedbacks: m.canReplyFeedbacks,
                                  canEditWebsite: m.canEditWebsite,
                                  canViewAnalytics: m.canViewAnalytics,
                                });
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-xl text-xs font-medium transition-colors"
                          >
                            {isEditing ? 'Close' : 'Edit Permissions'}
                          </button>

                          <button
                            onClick={() => handleDeleteTeamMember(m.userId, m.fullName)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                            title="Remove from team"
                            aria-label="Remove team member"
                          >
                            <X size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                          </button>
                        </div>
                      </div>

                      {/* Permissions Badges (View Mode) */}
                      {!isEditing && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mr-1">
                            Granted Powers:
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canEditJobs ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canEditJobs ? '✓ Edit & Post Jobs' : '✕ Edit Jobs'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canManageWalkins ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canManageWalkins ? '✓ Walk-ins & Exams' : '✕ Walk-ins'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canVerifyPayments ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canVerifyPayments ? '✓ Verify Payments' : '✕ Payments'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canReplyFeedbacks ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canReplyFeedbacks ? '✓ Reply Feedbacks' : '✕ Feedbacks'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canEditWebsite ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canEditWebsite ? '✓ Website Changes' : '✕ Website Changes'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            m.canViewAnalytics ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-gray-800/40 text-gray-600 border-gray-800'
                          }`}>
                            {m.canViewAnalytics ? '✓ View Analytics' : '✕ View Analytics'}
                          </span>
                        </div>
                      )}

                      {/* Permissions Editor (Inline Edit Mode) */}
                      {isEditing && (
                        <div className="bg-black/40 border border-gray-700/80 rounded-xl p-4 space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                                Designation / Role Title
                              </label>
                              <input
                                type="text"
                                value={editRoleTitle}
                                onChange={(e) => setEditRoleTitle(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                                Access Status
                              </label>
                              <select
                                value={editStatus}
                                onChange={(e: any) => setEditStatus(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                              >
                                <option value="approved">Approved (Active Access)</option>
                                <option value="pending">Pending Approval</option>
                                <option value="revoked">Revoked (Suspended)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-gray-400 font-semibold block mb-2">
                              Granular Website Permissions:
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canEditJobs}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canEditJobs: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>Edit &amp; Post Jobs</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canManageWalkins}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canManageWalkins: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>Manage Walk-ins &amp; Exams</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canVerifyPayments}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canVerifyPayments: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>Verify Employer Payments</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canReplyFeedbacks}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canReplyFeedbacks: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>Reply to Bug Reports</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canEditWebsite}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canEditWebsite: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>Modify Website Content</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                                <input
                                  type="checkbox"
                                  checked={editPermissions.canViewAnalytics}
                                  onChange={(e) => setEditPermissions({ ...editPermissions, canViewAnalytics: e.target.checked })}
                                  className="rounded text-blue-600"
                                />
                                <span>View Analytics Dashboard</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                            <button
                              onClick={() => setEditingMemberId(null)}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveTeamMember(m.userId)}
                              disabled={savingMember}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                            >
                              {savingMember ? 'Saving...' : 'Save Permissions'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EMPLOYER PAYMENTS & MANUAL UTR VERIFICATION                       */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} /> Employer Payment Proof &amp; Manual Verification Center
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                When an employer pays via your UPI ID, their 12-digit UTR and payment screenshot appear here.
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

        {/* ========================================================================= */}
        {/* TAB 4: FEEDBACKS, BUGS & USER SUGGESTIONS                                 */}
        {/* ========================================================================= */}
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
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.status === 'resolved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-700/50 text-gray-300'
                          }`}
                        >
                          {item.status === 'resolved' ? '✓ Resolved' : 'Open'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {item.message}
                      </p>
                      {item.url_context && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          Page: {item.url_context}
                        </div>
                      )}
                    </div>

                    {/* Reply Section */}
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

        {/* ========================================================================= */}
        {/* TAB 5: 10-MINUTE DAILY SERVER UPDATE & GOVT SYNC HUB                       */}
        {/* ========================================================================= */}
        {activeTab === 'govt_sync' && (
          <div className="space-y-6">
            {/* Hero Sync Trigger Banner */}
            <div className="bg-gradient-to-r from-[#12192B] via-[#1a233d] to-[#12192B] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <Zap size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                    Daily Operations Hub (10-Minute Routine)
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Pan-India Daily Server Update &amp; Gazette Synchronizer
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Designed for the founder&apos;s daily 10-minute morning routine: instantly audit all 36 States &amp; UTs, shift expired application windows (MPPSC, BPSC, UPPSC) into the official Archive, and verify live recruitment portals across all 250+ Nagar Nigams and 780+ districts.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    onClick={handleRunDailyGovtSync}
                    disabled={syncLoading}
                    className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <Zap size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} className={syncLoading ? 'animate-spin' : ''} />
                    <span>{syncLoading ? 'Running 10-Min Server Update...' : '⚡ Run 10-Minute Daily Server Update'}</span>
                  </button>
                </div>
              </div>

              {/* Live Progress / Status Notice */}
              {syncProgressMsg && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-amber-200 font-mono flex items-center gap-2 animate-pulse">
                  <span>{syncProgressMsg}</span>
                </div>
              )}

              {syncManifest && (
                <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2">
                  <span>Last Updated: <strong className="text-white">{new Date(syncManifest.syncTimestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong></span>
                  <span>Sync ID: <code className="text-amber-400">{syncManifest.syncId}</code></span>
                  <span>Duration: <strong className="text-white">{syncManifest.syncDurationMs} ms</strong></span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} /> 100% Timelines Verified
                  </span>
                </div>
              )}
            </div>

            {/* 4 Stat Telemetry Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-gray-400 font-medium">Pan-India States &amp; UTs</span>
                <div className="text-xl font-black text-white">{STATE_MUNICIPAL_OVERVIEWS.length} Covered</div>
                <div className="text-[10px] text-emerald-400">All 28 States &amp; 8 UTs</div>
              </div>
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-gray-400 font-medium">Nagar Nigams (Municipal Corps)</span>
                <div className="text-xl font-black text-white">{NAGAR_NIGAM_DIRECTORY.length}+ Cataloged</div>
                <div className="text-[10px] text-blue-400">Verified Portals &amp; Notice Boards</div>
              </div>
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-gray-400 font-medium">Administrative Districts</span>
                <div className="text-xl font-black text-white">{ALL_INDIA_DISTRICT_DIRECTORY.length}+ Indexed</div>
                <div className="text-[10px] text-purple-400">NIC Portals &amp; Collectorate Notices</div>
              </div>
              <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-gray-400 font-medium">Audited Govt Examinations</span>
                <div className="text-xl font-black text-white">{VERIFIED_GOVT_EXAMS.length} Audited</div>
                <div className="text-[10px] text-amber-400">100% Zero-Fake-Deadline Grounded</div>
              </div>
            </div>

            {/* SECTION A: AUDITED EXAMS TABLE */}
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Landmark size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-blue-400" />
                    Government Examinations Timeline Audit
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Real-time status check against Date.now(). Closed exams automatically route to Archive without fake future dates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={syncSearchQuery}
                    onChange={(e) => setSyncSearchQuery(e.target.value)}
                    placeholder="Search exam (e.g. MPPSC, BPSC, UPSC)..."
                    className="px-3 py-1.5 bg-black/40 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/30 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-3">Exam / Cadre</th>
                      <th className="py-2.5 px-3">Conducting Body</th>
                      <th className="py-2.5 px-3">State / Jurisdiction</th>
                      <th className="py-2.5 px-3">Official Gazette Ref</th>
                      <th className="py-2.5 px-3">Apply Deadline</th>
                      <th className="py-2.5 px-3">Current Status</th>
                      <th className="py-2.5 px-3">Official Portal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {VERIFIED_GOVT_EXAMS
                      .filter((e) => {
                        if (!syncSearchQuery.trim()) return true;
                        const q = syncSearchQuery.toLowerCase();
                        return (
                          e.title.toLowerCase().includes(q) ||
                          e.conductingBody.toLowerCase().includes(q) ||
                          (e.state ? e.state.toLowerCase().includes(q) : false) ||
                          e.id.toLowerCase().includes(q)
                        );
                      })
                      .map((exam) => {
                        const parts = exam.importantDates.applyEndDate.split('-').map(Number);
                        let isPast = true;
                        if (parts.length === 3 && !isNaN(parts[0])) {
                          const target = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
                          isPast = (target - Date.now()) < 0;
                        }

                        return (
                          <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3 font-semibold text-white">
                              {exam.title}
                              <div className="text-[10px] text-gray-500 font-mono">{exam.id}</div>
                            </td>
                            <td className="py-3 px-3">{exam.conductingBody}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300">
                                {exam.state}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-amber-300/90">
                              {exam.officialGazetteRef}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {exam.importantDates.applyEndDate}
                            </td>
                            <td className="py-3 px-3">
                              {isPast ? (
                                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-medium">
                                  Archived / Closed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-medium animate-pulse">
                                  Active / Open
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <a
                                href={exam.officialLinks.officialPortalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline text-[11px]"
                              >
                                View Portal ↗
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION B: PAN-INDIA NAGAR NIGAM DIRECTORY */}
            <div className="bg-[#12192B] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400" />
                    Pan-India Nagar Nigam &amp; Municipal Corporation Master Directory
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Comprehensive registry of all ~250+ Municipal Corporations across India with direct recruitment notice boards and statutory hiring bodies.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">State:</span>
                  <select
                    value={syncStateFilter}
                    onChange={(e) => setSyncStateFilter(e.target.value)}
                    className="px-3 py-1.5 bg-black/40 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="All">All States &amp; UTs</option>
                    {STATE_MUNICIPAL_OVERVIEWS.map((s) => (
                      <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {NAGAR_NIGAM_DIRECTORY
                  .filter((nn) => syncStateFilter === 'All' || nn.state === syncStateFilter)
                  .map((corporation) => (
                    <div
                      key={corporation.id}
                      className="bg-black/20 border border-gray-800/80 rounded-2xl p-4 space-y-2.5 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {corporation.name}
                          </h4>
                          {corporation.hindiName && (
                            <div className="text-[11px] text-amber-400/90 font-medium">
                              {corporation.hindiName}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300 shrink-0">
                          {corporation.district}, {corporation.state}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-300 space-y-1">
                        <div>
                          <span className="text-gray-500">Hiring Agency: </span>
                          <strong className="text-gray-200">{corporation.statutoryRecruitmentBody}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500">Cadres: </span>
                          <span className="text-gray-300 line-clamp-1">{corporation.recruitedCadres.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Domicile: </span>
                          <span className="text-gray-400 line-clamp-1">{corporation.domicileRequirement}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-xs">
                        <a
                          href={corporation.officialPortalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline text-[11px]"
                        >
                          Official Portal ↗
                        </a>
                        <a
                          href={corporation.recruitmentNoticeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:text-amber-300 underline text-[11px] font-semibold"
                        >
                          Notice Board ↗
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: APPROVE / ADD TEAM MEMBER                                        */}
      {/* ========================================================================= */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#12192B] rounded-3xl max-w-xl w-full p-6 relative border border-gray-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddMemberModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
              aria-label="Close modal"
            >
              <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold mb-2 border border-purple-500/20">
                <ShieldCheck size={ICON_SIZES.inline} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Grant Website Modification Access</span>
              </div>
              <h3 className="text-lg font-bold text-white">Approve / Add Team Member</h3>
              <p className="text-xs text-gray-400 mt-1">
                Approve an existing user or pre-authorize an email address to make changes to the NicheHire platform.
              </p>
            </div>

            <form onSubmit={handleAddTeamMember} className="space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="text-gray-400 font-semibold block mb-1.5">
                  Quick Role Preset:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRolePreset('editor')}
                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl font-semibold transition-colors"
                  >
                    Website Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('operations')}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl font-semibold transition-colors"
                  >
                    Operations Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('moderator')}
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl font-semibold transition-colors"
                  >
                    Moderator
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRolePreset('admin')}
                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl font-semibold transition-colors"
                  >
                    Co-Admin
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sharma"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Email Address / Mobile *</label>
                  <input
                    type="text"
                    required
                    placeholder="rohan@nichehire.tech or phone"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Role Title</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Checkboxes */}
              <div>
                <label className="text-gray-300 font-semibold block mb-2">
                  Select Specific Website Permissions:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canEditJobs}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canEditJobs: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can Edit &amp; Manage Job Postings</span>
                  </label>
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canManageWalkins}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canManageWalkins: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can Manage Walk-ins &amp; Govt Exams</span>
                  </label>
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canVerifyPayments}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canVerifyPayments: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can Verify Employer UTR Payments</span>
                  </label>
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canReplyFeedbacks}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canReplyFeedbacks: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can Reply to User Feedback &amp; Bugs</span>
                  </label>
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canEditWebsite}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canEditWebsite: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can Modify Website Announcements &amp; Content</span>
                  </label>
                  <label className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMemberPermissions.canViewAnalytics}
                      onChange={(e) => setNewMemberPermissions({ ...newMemberPermissions, canViewAnalytics: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Can View Traffic &amp; Site Analytics</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Administrative Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Intern on marketing & listing management"
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewMember}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl font-semibold shadow-md"
                >
                  {isSubmittingNewMember ? 'Approving...' : 'Approve & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SCREENSHOT FULL-SIZE INSPECTION                                  */}
      {/* ========================================================================= */}
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
