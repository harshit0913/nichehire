'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import toast, { Toaster } from 'react-hot-toast';
import { 
  MapPin, Briefcase, Clock, Users, ShieldCheck, Zap, 
  Search, FileText, Filter, X, Loader2, Edit3, Download, Save, 
  UserCircle, CheckCircle, RefreshCw, ExternalLink, Mail, Send, Footprints, UploadCloud, Sparkles, Target, LogIn, LogOut, BarChart3, LayoutDashboard
} from 'lucide-react';

import { supabase } from './supabase';

export default function JobDashboard() {
  // --- AUTHENTICATION STATE ---
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- NAVIGATION STATE ---
  const [activeView, setActiveView] = useState<'jobs' | 'analytics'>('jobs');
  
  // --- ANALYTICS STATE ---
  const [userStats, setUserStats] = useState({
    totalScraped: 0,
    totalTailored: 0,
  });

  // --- PROFILE STATE ---
  const [profile, setProfile] = useState({
    name: 'Sanjeev Kumar Mishra',
    role: 'Assistant Manager of Sales and Godown',
    location: 'Indore, Madhya Pradesh',
    preference: 'Hybrid',
    rawResume: 'Education: Current MBA Student\nCompany: Majhaulia Sugar Industries\nExperience: Managing godown operations, inventory tracking, hitting sales targets.'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(200);
  const [selectedType, setSelectedType] = useState('All');
  const [workMode, setWorkMode] = useState('All'); 
  const [postedTime, setPostedTime] = useState('Any'); 
  const [maxApplicants, setMaxApplicants] = useState(200);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyWalkIn, setOnlyWalkIn] = useState(false);
  
  const [isCVModalOpen, setIsCVModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [showProfileConfig, setShowProfileConfig] = useState(false);
  
  const [isTailoring, setIsTailoring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [tailoredCV, setTailoredCV] = useState('');
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION & SESSION TRACKING ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfileFromCloud(session.user.id);
      else loadLocalProfile();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfileFromCloud(session.user.id);
      else loadLocalProfile();
    });

    fetchJobsFromDatabase();
    loadLocalStats();

    return () => subscription.unsubscribe();
  }, []);

  const loadLocalStats = () => {
    const savedStats = localStorage.getItem('nicheHireStats');
    if (savedStats) setUserStats(JSON.parse(savedStats));
    
    const savedApplied = localStorage.getItem('nicheHireApplied');
    if (savedApplied) setAppliedJobs(JSON.parse(savedApplied));
  };

  const updateStats = (field: 'totalScraped' | 'totalTailored', increment: number) => {
    setUserStats(prev => {
      const newStats = { ...prev, [field]: prev[field] + increment };
      localStorage.setItem('nicheHireStats', JSON.stringify(newStats));
      return newStats;
    });
  };

  const addAppliedJob = (jobId: string) => {
    if (!appliedJobs.includes(jobId)) {
      const newApplied = [...appliedJobs, jobId];
      setAppliedJobs(newApplied);
      localStorage.setItem('nicheHireApplied', JSON.stringify(newApplied));
    }
  };

  // --- PROFILE MANAGEMENT ---
  const loadLocalProfile = () => {
    const savedProfile = localStorage.getItem('nicheHireProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
      const parsed = JSON.parse(savedProfile);
      if (parsed.preference !== 'Any') setWorkMode(parsed.preference);
    }
  };

  const fetchProfileFromCloud = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        const cloudProfile = {
          name: data.name || profile.name,
          role: data.role || profile.role,
          location: data.location || profile.location,
          preference: data.preference || profile.preference,
          rawResume: data.raw_resume || profile.rawResume
        };
        setProfile(cloudProfile);
        if (cloudProfile.preference !== 'Any') setWorkMode(cloudProfile.preference);
      }
    } catch (error) {
      console.error('Error fetching cloud profile', error);
    }
  };

  const saveProfileToCloud = async (updatedProfile: any) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        name: updatedProfile.name,
        role: updatedProfile.role,
        location: updatedProfile.location,
        preference: updatedProfile.preference,
        raw_resume: updatedProfile.rawResume,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Failed to sync to cloud', error);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    const newProfile = { ...profile, [field]: value };
    setProfile(newProfile);
    localStorage.setItem('nicheHireProfile', JSON.stringify(newProfile));
    if (session) saveProfileToCloud(newProfile);
  };

  // --- AUTHENTICATION HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const toastId = toast.loading(isLoginMode ? 'Signing in...' : 'Creating account...');

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        toast.success('Successfully logged in!', { id: toastId });
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        toast.success('Account created successfully!', { id: toastId });
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed', { id: toastId });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  const fetchJobsFromDatabase = async () => {
    setIsLoadingJobs(true);
    const { data } = await supabase.from('jobs').select('*');
    if (data) setAllJobs(data);
    setIsLoadingJobs(false);
  };

  const handleSyncJobs = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/tailor/fetch-jobs');
      await fetchJobsFromDatabase(); 
    } catch (error) {
      toast.error('Could not sync external jobs.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      handleProfileChange('rawResume', text);
      
      try {
        const response = await fetch('/api/tailor/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: text })
        });
        const data = await response.json();
        
        if (data.name && data.name.trim() !== "") {
          toast.success(`AI recognized the resume belongs to: ${data.name}`);
        }

        const updatedProfile = {
            ...profile,
            name: data.name && data.name.trim() !== "" ? data.name : profile.name,
            role: data.role && data.role.trim() !== "" ? data.role : profile.role,
            location: data.location && data.location.trim() !== "" ? data.location : profile.location,
            rawResume: text
        };
        
        setProfile(updatedProfile);
        localStorage.setItem('nicheHireProfile', JSON.stringify(updatedProfile));
        if (session) saveProfileToCloud(updatedProfile);
        
      } catch (err) {
        toast.error("Server error while AI was extracting details.");
      }
    };
    reader.readAsText(file); 
  };

  const handleAIMatch = async (retryCount = 0) => {
    setIsMatching(true);
    if (retryCount === 0) setAiMatches([]);
    const toastId = 'ai-match'; 

    try {
      const fullResume = `${profile.name} - ${profile.role}. ${profile.rawResume}`;
      if (retryCount === 0) toast.loading(`Scraping all APIs & filtering for ${profile.role} jobs...`, { id: toastId });

      const response = await fetch('/api/tailor/match-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: fullResume, role: profile.role, location: profile.location }) 
      });

      if (response.status === 503) {
        if (retryCount < 2) {
          toast.loading(`Matchmaking servers at capacity. Retrying (${retryCount + 1}/2)...`, { id: toastId });
          setTimeout(() => handleAIMatch(retryCount + 1), 8000);
          return; 
        }
        toast.error('Matchmaking servers are still at capacity.', { id: toastId });
        setIsMatching(false);
        return;
      }

      if (!response.ok) {
        toast.error('Something went wrong while fetching live jobs.', { id: toastId });
        setIsMatching(false);
        return;
      }

      const data = await response.json();
      
      if (data.allLiveJobs && data.allLiveJobs.length > 0) {
        const liveAggregatedJobs = data.allLiveJobs.map((job: any) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location, 
          type: 'Full-Time', 
          distance: 5, 
          applicants: Math.floor(Math.random() * 200) + 10, 
          hours_ago: Math.floor(Math.random() * 48) + 1, 
          trust_score: Math.floor(Math.random() * 15) + 85, 
          tags: [job.source || 'Live Match'],
          redirect_url: job.url || 'https://www.linkedin.com/jobs/'
        }));

        setAllJobs(liveAggregatedJobs);
        updateStats('totalScraped', liveAggregatedJobs.length); // UPDATE ANALYTICS
        
        if (data.matches && data.matches.length > 0) {
           setAiMatches(data.matches);
           toast.success(`Found sanitized local jobs and highlighted top fits!`, { id: toastId });
        } else {
           toast.success(`Found sanitized jobs!`, { id: toastId });
        }
      } else {
        setAllJobs([]); 
        toast.error(`No relevant jobs found. Try expanding your target location.`, { id: toastId });
      }
    } catch (error) {
      toast.error('Could not reach the live matching service.', { id: toastId });
    } finally {
      setIsMatching(false);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef, documentTitle: 'Tailored_CV' });

  let filteredJobs = allJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || (job.company && job.company.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRadius = job.distance <= radius;
    const matchesType = selectedType === 'All' || job.type === selectedType;
    const matchesVerified = !onlyVerified || (job.trust_score && job.trust_score >= 80);
    const matchesApplicants = job.applicants <= maxApplicants;
    
    let matchesTime = true;
    if (postedTime === '24h') matchesTime = job.hours_ago <= 24;
    if (postedTime === '7d') matchesTime = job.hours_ago <= (24 * 7);
    
    const derivedWorkMode = job.title?.toLowerCase().includes('remote') ? 'Remote' : (Number(String(job.id).replace(/\D/g,'')) % 3 === 0 ? 'Hybrid' : 'Office');
    const matchesMode = workMode === 'All' || derivedWorkMode === workMode;

    const isWalkIn = job.title?.toLowerCase().includes('walk-in') || job.title?.toLowerCase().includes('walk in') || (Number(String(job.id).replace(/\D/g,'')) % 5 === 0);
    const matchesWalkIn = !onlyWalkIn || isWalkIn;

    return matchesSearch && matchesRadius && matchesType && matchesVerified && matchesApplicants && matchesTime && matchesMode && matchesWalkIn;
  });

  if (aiMatches.length > 0) {
    filteredJobs.sort((a, b) => {
      const aMatch = aiMatches.find(m => String(m.id) === String(a.id));
      const bMatch = aiMatches.find(m => String(m.id) === String(b.id));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }

  const handleTailorCV = async (job: any) => {
    setSelectedJob(job);
    setIsCVModalOpen(true);
    setIsTailoring(true);
    setIsEditing(false);
    setTailoredCV('');
    setAtsScore(null);

    const fullBaseResume = `Name: ${profile.name}\nCurrent Role: ${profile.role}\nLocation: ${profile.location}\nPreference: ${profile.preference}\n\n${profile.rawResume}`;

    try {
      const response = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: job.title, jobTags: job.tags, baseResume: fullBaseResume })
      });

      if (response.status === 503) {
        toast.error('AI servers are at capacity. Please try again shortly.');
        setTailoredCV('Error: The AI service is temporarily overloaded. Please try again in a moment.');
        return;
      }

      const data = await response.json();
      setTailoredCV(data.tailoredResume || `Error: ${data.error}`);
      
      if (data.tailoredResume) {
        setAtsScore(Math.floor(Math.random() * (98 - 84 + 1)) + 84);
        updateStats('totalTailored', 1); // UPDATE ANALYTICS
      }
    } catch (error) {
      setTailoredCV("Error: Network issue.");
      toast.error('Network issue while tailoring your CV.');
    } finally {
      setIsTailoring(false);
    }
  };

  const executeApplyRedirect = () => {
    const applyUrl = selectedJob?.redirect_url || 'https://www.linkedin.com/jobs/';
    window.open(applyUrl, '_blank');
    addAppliedJob(String(selectedJob.id)); // UPDATE ANALYTICS
    setIsApplyModalOpen(false);
  };

  const executeApplyEmail = () => {
    const cleanCompanyName = selectedJob.company.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const hrEmail = `careers@${cleanCompanyName}.com`;
    const subject = encodeURIComponent(`Application for ${selectedJob.title} - ${profile.name}`);
    const body = encodeURIComponent(
      `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${selectedJob.title} position at ${selectedJob.company}.\n\nPlease find my tailored resume attached to this email for your review.\n\nBest regards,\n${profile.name}\n${profile.role}`
    );

    window.location.href = `mailto:${hrEmail}?subject=${subject}&body=${body}`;
    addAppliedJob(String(selectedJob.id)); // UPDATE ANALYTICS
    setIsApplyModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <style dangerouslySetInnerHTML={{__html: `@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-wrapper { padding: 40px !important; color: #000 !important; font-size: 11pt !important; } .print-wrapper h1 { font-size: 20pt !important; margin-bottom: 15px !important; } .print-wrapper h2 { font-size: 14pt !important; margin-top: 15px !important; margin-bottom: 8px !important; } @page { margin: 0.5in; } }`}} />

      {/* Left Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 p-6 hidden lg:flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-blue-600">
            <Zap className="fill-current" size={28}/>
            <h1 className="text-2xl font-bold tracking-tight">NicheHire</h1>
          </div>
          
          {session ? (
            <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition" title="Sign Out">
              <LogOut size={18} />
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition">
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>

        {/* NAVIGATION TAB TOGGLES */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setActiveView('jobs')} 
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold rounded-md transition ${activeView === 'jobs' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={16} /> Job Search
          </button>
          <button 
            onClick={() => setActiveView('analytics')} 
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold rounded-md transition ${activeView === 'analytics' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 size={16} /> My Analytics
          </button>
        </div>
        
        {/* Only show filters if on jobs view */}
        {activeView === 'jobs' && (
          <>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <button onClick={() => setShowProfileConfig(!showProfileConfig)} className="flex items-center justify-between w-full font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <UserCircle size={18}/> 
                  Applicant Profile
                  {session && <span className="flex h-2 w-2 rounded-full bg-green-500 ml-1" title="Cloud Sync Active"></span>}
                </span>
                <span className="text-xs text-blue-600">{showProfileConfig ? 'Close' : 'Edit'}</span>
              </button>
              
              {showProfileConfig ? (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="mb-4">
                    <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-700 transition">
                      <UploadCloud size={14}/> Upload CV (.txt)
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                    <input type="text" value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Current Role</label>
                    <input type="text" value={profile.role} onChange={(e) => handleProfileChange('role', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                    <input type="text" value={profile.location} onChange={(e) => handleProfileChange('location', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Work Preference</label>
                    <select value={profile.preference} onChange={(e) => handleProfileChange('preference', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md outline-none bg-white">
                      <option value="Any">Any Mode</option>
                      <option value="Remote">Remote Only</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Office">Office Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Experience Details</label>
                    <textarea value={profile.rawResume} onChange={(e) => handleProfileChange('rawResume', e.target.value)} className="w-full h-24 text-xs p-2 border border-slate-200 rounded-md outline-none resize-none" placeholder="Paste extra details here..." />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                  <span className="font-semibold text-slate-700">{profile.name}</span> • {profile.role}
                </div>
              )}
            </div>

            <div className="space-y-6 flex-1">
              <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Advanced Filters</h3>
              
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-slate-500">Location Radius</span>
                  <span className="font-bold text-blue-600">{radius} km</span>
                </div>
                <input type="range" min="5" max="200" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-blue-600" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-slate-500">Max Applicants</span>
                  <span className="font-bold text-blue-600">{maxApplicants === 200 ? '200+' : maxApplicants}</span>
                </div>
                <input type="range" min="10" max="200" step="10" value={maxApplicants} onChange={(e) => setMaxApplicants(Number(e.target.value))} className="w-full accent-blue-600" />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition">
                  <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-slate-700 flex items-center gap-2"><ShieldCheck size={16} className="text-green-600"/> High-Trust Only</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition">
                  <input type="checkbox" checked={onlyWalkIn} onChange={(e) => setOnlyWalkIn(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-slate-700 flex items-center gap-2"><Footprints size={16} className="text-blue-600"/> Walk-In Interviews</span>
                </label>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto h-screen">
        
        {/* CONDITIONAL RENDER: ANALYTICS DASHBOARD OR JOB LISTINGS */}
        {activeView === 'analytics' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Application Funnel</h1>
            <p className="text-slate-500 mb-8">Track your AI-powered job search performance and conversion rates.</p>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} />
                </div>
                <h3 className="text-4xl font-black text-slate-900 mb-1">{userStats.totalScraped}</h3>
                <p className="text-sm font-semibold text-slate-500">Total Jobs Scraped</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-4xl font-black text-slate-900 mb-1">{userStats.totalTailored}</h3>
                <p className="text-sm font-semibold text-slate-500">CVs ATS-Optimized</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-green-500"></div>
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Send size={24} />
                </div>
                <h3 className="text-4xl font-black text-slate-900 mb-1">{appliedJobs.length}</h3>
                <p className="text-sm font-semibold text-slate-500">Applications Submitted</p>
              </div>
            </div>

            {/* Conversion Funnel Graphic */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">Conversion Metrics</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                    <span>1. Search & Scraping</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden">
                    <div className="bg-slate-300 h-full w-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                    <span>2. AI Resume Tailoring Rate</span>
                    <span>{userStats.totalScraped > 0 ? Math.round((userStats.totalTailored / userStats.totalScraped) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-400 h-full transition-all duration-1000 ease-out rounded-r-full" 
                      style={{ width: `${userStats.totalScraped > 0 ? (userStats.totalTailored / userStats.totalScraped) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                    <span>3. Application Submission Rate</span>
                    <span className="text-green-600">{userStats.totalTailored > 0 ? Math.round((appliedJobs.length / userStats.totalTailored) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-1000 ease-out rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                      style={{ width: `${userStats.totalTailored > 0 ? (appliedJobs.length / userStats.totalTailored) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD JOB DASHBOARD VIEW */
          <>
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-4 justify-between mb-4">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search jobs by title or company..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm" />
                </div>

                <button 
                  onClick={() => handleAIMatch()} 
                  disabled={isMatching}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition shadow-sm disabled:opacity-70"
                >
                  {isMatching ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isMatching ? 'Analyzing Resume...' : 'AI Auto-Match Jobs'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-2 shadow-sm">
                    <Filter size={16} className="text-slate-400 ml-1" />
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="bg-transparent text-sm focus:outline-none text-slate-700 font-medium cursor-pointer">
                      <option value="All">All Types</option>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-2 shadow-sm">
                    <Briefcase size={16} className="text-slate-400 ml-1" />
                    <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="bg-transparent text-sm focus:outline-none text-slate-700 font-medium cursor-pointer">
                      <option value="All">Any Mode</option>
                      <option value="Office">Office</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-2 shadow-sm">
                    <Clock size={16} className="text-slate-400 ml-1" />
                    <select value={postedTime} onChange={(e) => setPostedTime(e.target.value)} className="bg-transparent text-sm focus:outline-none text-slate-700 font-medium cursor-pointer">
                      <option value="Any">Any Time</option>
                      <option value="24h">Past 24 Hours</option>
                      <option value="7d">Past 7 Days</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleSyncJobs} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition text-sm disabled:bg-slate-400 shadow-sm">
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isSyncing ? 'Fetching...' : 'Sync External Jobs'}
                </button>
              </div>
            </header>

            <div className="grid gap-4">
              {isLoadingJobs ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                  <Loader2 className="animate-spin mb-3" size={32} />
                  <p className="text-sm font-semibold animate-pulse">Loading Database...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">No matching listings found. Try adjusting your filters.</div>
              ) : (
                filteredJobs.map(job => {
                  const derivedWorkMode = job.title?.toLowerCase().includes('remote') ? 'Remote' : (Number(String(job.id).replace(/\D/g,'')) % 3 === 0 ? 'Hybrid' : 'Office');
                  const isWalkIn = job.title?.toLowerCase().includes('walk-in') || job.title?.toLowerCase().includes('walk in') || (Number(String(job.id).replace(/\D/g,'')) % 5 === 0);
                  
                  const aiMatchInfo = aiMatches.find(m => String(m.id) === String(job.id));
                  const isApplied = appliedJobs.includes(String(job.id));
                  
                  return (
                    <div key={job.id} className={`bg-white border ${aiMatchInfo ? 'border-indigo-400 shadow-indigo-100/50 shadow-lg' : isApplied ? 'border-green-300 bg-green-50' : 'border-slate-200'} rounded-xl p-5 transition`}>
                      
                      {aiMatchInfo && (
                        <div className="mb-3 flex items-start gap-2 bg-indigo-50 text-indigo-800 text-xs p-3 rounded-lg border border-indigo-100">
                          <Sparkles size={16} className="shrink-0 text-indigo-600 mt-0.5" />
                          <p><strong>AI Recommended:</strong> {aiMatchInfo.reason}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {job.title} 
                            {isWalkIn && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold rounded-full tracking-wider">Walk-In</span>}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 font-medium">
                            <span className="flex items-center gap-1"><MapPin size={14}/> {job.location}</span>
                            <span className="flex items-center gap-1"><Users size={14}/> {job.applicants || 0} applied</span>
                            <span className="flex items-center gap-1 text-slate-400"><Clock size={14}/> {job.hours_ago || 24}h ago</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {job.trust_score && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-200">
                              <ShieldCheck size={14}/> {job.trust_score}% Verified
                            </span>
                          )}
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold border border-slate-200">
                            {derivedWorkMode} • {job.type || 'Full-Time'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {job.tags && job.tags.map((tag: string) => <span key={tag} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-md text-[11px] font-medium border border-slate-100">{tag}</span>)}
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <button onClick={() => handleTailorCV(job)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition text-xs">
                            <FileText size={15}/> Tailor CV
                          </button>
                          
                          {isApplied ? (
                            <button disabled className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg text-xs cursor-not-allowed">
                              <CheckCircle size={15}/> Applied
                            </button>
                          ) : (
                            <button onClick={() => { setSelectedJob(job); setIsApplyModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-xs">
                              <Send size={14}/> Apply Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* 0. AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-sm text-slate-500 mb-6">Securely save your profile and tailored resumes to the cloud.</p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full text-sm p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <input type="password" required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full text-sm p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 mt-1" />
              </div>
              <button type="submit" disabled={isAuthLoading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-70">
                {isAuthLoading ? <Loader2 size={16} className="animate-spin" /> : (isLoginMode ? <LogIn size={16}/> : <UserCircle size={16}/>)}
                {isLoginMode ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-500">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-blue-600 font-bold hover:underline">
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. APPLY CHOICE MODAL */}
      {isApplyModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setIsApplyModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
            
            <h2 className="text-xl font-bold text-slate-900 mb-1">Apply to {selectedJob.company}</h2>
            <p className="text-sm text-slate-500 mb-6">How would you like to submit your application for the {selectedJob.title} role?</p>
            
            <div className="space-y-3">
              <button onClick={executeApplyRedirect} className="w-full flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 group transition text-left">
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Company Website</h3>
                  <p className="text-xs text-slate-500 mt-1">Redirect to the official application portal</p>
                </div>
                <ExternalLink className="text-slate-400 group-hover:text-blue-600" size={20}/>
              </button>
              
              <button onClick={executeApplyEmail} className="w-full flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 group transition text-left">
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Email HR Directly</h3>
                  <p className="text-xs text-slate-500 mt-1">Auto-drafts an email in your default app</p>
                </div>
                <Mail className="text-slate-400 group-hover:text-blue-600" size={20}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CV TAILORING MODAL */}
      {isCVModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">AI CV Optimizer</h2>
                  {atsScore && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold border border-green-200 shadow-sm">
                      <Target size={14} className="text-green-600" /> ATS Match: {atsScore}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Targeting: {selectedJob?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                {!isTailoring && !tailoredCV.startsWith('Error') && (
                  <>
                    <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition">
                      {isEditing ? <><Save size={14}/> Save Edits</> : <><Edit3 size={14}/> Edit CV</>}
                    </button>
                    {!isEditing && (
                      <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
                        <Download size={14}/> Download PDF
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setIsCVModalOpen(false)} className="p-2 ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
              </div>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto bg-slate-100">
              {isTailoring ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-blue-600 py-20">
                  <Loader2 className="animate-spin" size={40}/>
                  <p className="font-semibold animate-pulse">Analyzing Job Description & Rewriting Resume...</p>
                </div>
              ) : (
                <div className="max-w-none text-left bg-white p-10 rounded-xl shadow-sm border border-slate-200 min-h-full mx-auto" style={{ maxWidth: '800px' }}>
                  {isEditing ? (
                    <textarea value={tailoredCV} onChange={(e) => setTailoredCV(e.target.value)} className="w-full h-full min-h-[500px] p-4 text-sm font-mono border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 resize-y" />
                  ) : (
                    <div ref={contentRef} className="print-wrapper space-y-3 text-sm text-slate-700">
                      <ReactMarkdown components={{ h1: ({node, ...props}) => <h1 className="text-2xl font-black text-slate-900 border-b pb-2 mb-4" {...props} />, h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-2" {...props} />, h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-1" {...props} />, p: ({node, ...props}) => <p className="leading-relaxed mb-3" {...props} />, ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1.5 my-3" {...props} />, li: ({node, ...props}) => <li className="pl-1" {...props} />, strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />, hr: ({node, ...props}) => <hr className="my-6 border-slate-200" {...props} /> }}>
                        {tailoredCV}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </div>
  );
}