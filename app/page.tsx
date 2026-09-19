'use client';

import { useState } from 'react';

export default function JobDashboard() {
  // --- UI STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'jobs' | 'analytics'>('jobs');
  const [errorMsg, setErrorMsg] = useState('');

  // --- DATA STATE ---
  const [allLiveJobs, setAllLiveJobs] = useState<any[]>([]);

  // --- PROFILE STATE (Blank by default) ---
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    location: '',
    preference: 'Hybrid',
    rawResume: ''
  });

  // --- FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(200);
  const [selectedType, setSelectedType] = useState('All Types');
  const [workMode, setWorkMode] = useState('Any Mode');
  const [postedTime, setPostedTime] = useState('Any Time');
  const [maxApplicants, setMaxApplicants] = useState(200);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // --- ACTIONS ---
  const fetchJobs = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // Pointing to our new, fast search route
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: searchQuery || 'marketing'
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');
      
      setAllLiveJobs(data.jobs || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailHR = (hrEmail: string, jobTitle: string) => {
    const safeSubject = encodeURIComponent(`Application for ${jobTitle}`);
    const safeBody = encodeURIComponent(`Hello,\n\nI am writing to express my interest in the ${jobTitle} position.\n\nBest regards,\n${profile.name || 'Applicant'}`);
    window.location.href = `mailto:${hrEmail}?subject=${safeSubject}&body=${safeBody}`;
  };

  // --- FILTER LOGIC ---
  const filteredJobs = allLiveJobs.filter(job => {
    const matchesSearch = 
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      job.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 p-6 border-r border-gray-100 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <span className="text-3xl">⚡</span> NicheHire
          </h1>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-lg">
          <button 
            onClick={() => setActiveView('jobs')}
            className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${activeView === 'jobs' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            Job Search
          </button>
          <button 
            onClick={() => setActiveView('analytics')}
            className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${activeView === 'analytics' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            My Analytics
          </button>
        </div>

        {/* Applicant Profile Card */}
        <div className="border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Applicant Profile
            </h2>
            <button className="text-xs text-blue-600 hover:underline">Edit</button>
          </div>
          <p className="text-xs font-medium text-gray-800 uppercase tracking-wide">
            {profile.name || 'GUEST USER'} • {profile.role || 'New Applicant'}
          </p>
        </div>

        {/* Advanced Filters */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Advanced Filters</h3>
          
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Location Radius</span>
              <span className="font-medium text-blue-600">{radius} km</span>
            </div>
            <input type="range" min="0" max="500" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Max Applicants</span>
              <span className="font-medium text-blue-600">{maxApplicants}+</span>
            </div>
            <input type="range" min="0" max="500" value={maxApplicants} onChange={(e) => setMaxApplicants(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
            <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
            High-Trust Only
          </label>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl">
        
        {/* Search & Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Search jobs by title or company..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            onClick={fetchJobs}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[160px]"
          >
            {isLoading ? 'Syncing...' : 'Sync External Jobs'}
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
            <option>All Types</option>
            <option>Full-Time</option>
            <option>Contract</option>
          </select>
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
            <option>Any Mode</option>
            <option>Hybrid</option>
            <option>Remote</option>
            <option>On-site</option>
          </select>
          <select value={postedTime} onChange={(e) => setPostedTime(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
            <option>Any Time</option>
            <option>Past 24 Hours</option>
            <option>Past Week</option>
          </select>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <span className="font-bold text-red-500">⊗</span> {errorMsg}
          </div>
        )}

        {/* FEED SECTION */}
        <div className="space-y-4">
          
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 border rounded-lg shadow-sm animate-pulse border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-6 bg-green-50 rounded w-24"></div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-8 bg-gray-100 rounded w-24"></div>
                    <div className="h-8 bg-blue-100 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && allLiveJobs.length > 0 && filteredJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 mt-6 text-center border-2 border-dashed rounded-lg bg-gray-50 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">No jobs match your filters</h3>
              <p className="mt-2 text-sm text-gray-500">Try broadening your search terms or clearing your filters to see more results.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('All Types');
                  setWorkMode('Any Mode');
                }}
                className="mt-6 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Job List */}
          {!isLoading && filteredJobs.map((job, idx) => (
            <div key={job.id || idx} className="p-6 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white flex flex-col md:flex-row justify-between gap-4">
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                  <span>{job.location}</span> • <span className="font-medium text-gray-700">{job.company}</span>
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4 md:mb-0">
                  <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">{job.source || 'External'}</span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end justify-between min-w-[140px]">
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded border border-green-100 mb-4 md:mb-0 flex items-center gap-1">
                  ✓ Verified
                </span>
                
                <div className="flex gap-2 w-full md:w-auto mt-auto">
                  <button onClick={() => handleEmailHR('hr@example.com', job.title)} className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Email HR
                  </button>
                  <a href={job.url || '#'} target="_blank" rel="noreferrer" className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center">
                    Apply Now
                  </a>
                </div>
              </div>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
}