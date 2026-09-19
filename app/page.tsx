'use client';

import { useEffect, useState } from 'react';

export default function JobDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [allLiveJobs, setAllLiveJobs] = useState<any[]>([]);
  const [profile] = useState({ name: '', role: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [workMode, setWorkMode] = useState('Any Mode');

  const fetchJobs = async (overrideQuery?: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: overrideQuery ?? searchQuery,
          location: locationQuery,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');
      setAllLiveJobs(data.jobs || []);

      if (data.meta?.failedSources?.length) {
        setErrorMsg(
          `Some sources didn't respond (${data.meta.failedSources.join(
            ', '
          )}) — showing results from the rest.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load a default set of jobs on first visit instead of showing a blank page
  useEffect(() => {
    fetchJobs('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ACTIVE FRONTEND FILTERS — every filter shown in the UI actually applies here
  const filteredJobs = allLiveJobs.filter((job) => {
    const jobLoc = (job.location || '').toLowerCase();

    let matchesMode = true;
    if (workMode === 'Remote') {
      matchesMode = jobLoc.includes('remote') || jobLoc.includes('worldwide') || jobLoc.includes('anywhere');
    } else if (workMode === 'On-site') {
      matchesMode = !jobLoc.includes('remote') && !jobLoc.includes('worldwide');
    } else if (workMode === 'Hybrid') {
      matchesMode = jobLoc.includes('hybrid');
    }

    let matchesType = true;
    if (selectedType !== 'All Types') {
      matchesType = job.type === selectedType;
    }

    return matchesMode && matchesType;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 p-6 border-r border-gray-100 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <span className="text-3xl">⚡</span> NicheHire
          </h1>
        </div>

        <div className="border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Applicant Profile
            </h2>
          </div>
          <p className="text-xs font-medium text-gray-800 uppercase tracking-wide">
            {profile.name || 'GUEST USER'} • {profile.role || 'New Applicant'}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-5xl">
        {/* Dual Search Bars */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Job title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City, state, or country..."
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fetchJobs()}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 min-w-[160px]"
          >
            {isLoading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none"
          >
            <option>All Types</option>
            <option>Full-Time</option>
            <option>Contract</option>
          </select>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none"
          >
            <option>Any Mode</option>
            <option>Hybrid</option>
            <option>Remote</option>
            <option>On-site</option>
          </select>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            <span className="font-bold text-red-500">⊗</span> {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 border rounded-lg shadow-sm animate-pulse border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded w-24"></div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && filteredJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 mt-6 text-center border-2 border-dashed rounded-lg bg-gray-50 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">No jobs match your filters</h3>
              <p className="mt-2 text-sm text-gray-500">Try broadening your search terms or clearing your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationQuery('');
                  setWorkMode('Any Mode');
                  setSelectedType('All Types');
                  fetchJobs('');
                }}
                className="mt-6 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
              >
                Clear all filters
              </button>
            </div>
          )}

          {!isLoading &&
            filteredJobs.map((job, idx) => (
              <div
                key={job.id || idx}
                className="p-6 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white flex flex-col md:flex-row justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                    <span>{job.location}</span> • <span className="font-medium text-gray-700">{job.company}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4 md:mb-0">
                    <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
                      {job.source}
                    </span>
                    {job.type && job.type !== 'Other' && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">
                        {job.type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end justify-between min-w-[140px]">
                  <div className="flex gap-2 w-full md:w-auto mt-auto">
                    <a
                      href={job.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
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