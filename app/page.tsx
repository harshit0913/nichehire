'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// ─── Types ───────────────────────────────────────────────────────────────────

type ParsedProfile = {
  name: string;
  role: string;
  skills: string[];
  experienceLevel: string;
  location: string;
};

type TailorState = {
  loading: boolean;
  text?: string;
  error?: string;
  open: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobDashboard() {
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allLiveJobs, setAllLiveJobs] = useState<any[]>([]);

  // Resume & profile state
  const [resumeText, setResumeText] = useState('');
  const [resumeOpen, setResumeOpen] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);
  const [parseError, setParseError] = useState('');

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [workMode, setWorkMode] = useState('Any Mode');

  // Per-job tailoring state keyed by job.id
  const [tailorMap, setTailorMap] = useState<Record<string, TailorState>>({});

  // ─── Job Fetch ─────────────────────────────────────────────────────────────

  const fetchJobs = async (overrideQuery?: string, overrideLoc?: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    const roleToUse = overrideQuery ?? searchQuery;
    const locToUse = overrideLoc ?? locationQuery;

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleToUse, location: locToUse }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');
      setAllLiveJobs(data.jobs || []);

      if (data.meta?.failedSources?.length) {
        setErrorMsg(
          `Some sources didn't respond (${data.meta.failedSources.join(', ')}) — showing results from the rest.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resume Parse → Auto-Match ─────────────────────────────────────────────

  const handleAnalyzeResume = async () => {
    if (!resumeText.trim()) {
      setParseError('Please paste your resume text first.');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setParsedProfile(null);

    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse resume');

      setParsedProfile(data);
      setResumeOpen(false);

      // Auto-fill search query from parsed role and trigger job search
      const autoRole = data.role || '';
      const autoLoc = data.location?.toLowerCase().includes('remote') ? '' : (data.location || '');
      setSearchQuery(autoRole);
      setLocationQuery(autoLoc);
      await fetchJobs(autoRole, autoLoc);
    } catch (err: any) {
      setParseError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Resume Tailor ─────────────────────────────────────────────────────────

  const handleTailorResume = async (job: any) => {
    if (!resumeText.trim()) {
      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, error: 'Paste your resume in the sidebar first.' },
      }));
      setResumeOpen(true);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to tailor resume');

      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, text: data.tailoredResume },
      }));
    } catch (err: any) {
      setTailorMap((prev) => ({
        ...prev,
        [job.id]: { loading: false, open: true, error: err.message || 'Something went wrong.' },
      }));
    }
  };

  const closeTailor = (jobId: string) => {
    setTailorMap((prev) => ({ ...prev, [jobId]: { ...prev[jobId], open: false } }));
  };

  const copyTailored = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fail silently — text is visible for manual copy
    }
  };

  // ─── Active Filters ────────────────────────────────────────────────────────

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

  // Auto-load default jobs on first visit
  useEffect(() => {
    fetchJobs('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-80 p-6 border-r border-gray-100 flex flex-col gap-6 shrink-0">
        {/* Logo */}
        <div>
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <span className="text-3xl">⚡</span> NicheHire
          </h1>
          <p className="text-xs text-gray-400 mt-1">AI-powered job matching</p>
        </div>

        {/* Parsed Profile Card — shown once resume is analyzed */}
        {parsedProfile && (
          <div className="border border-blue-100 bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Resume Analyzed
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">{parsedProfile.name || 'Your Profile'}</p>
            <p className="text-xs text-gray-500 mb-3">
              {parsedProfile.role}
              {parsedProfile.experienceLevel ? ` · ${parsedProfile.experienceLevel}` : ''}
            </p>
            <div className="flex flex-wrap gap-1">
              {(parsedProfile.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-white text-blue-700 border border-blue-200 rounded text-[11px] font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resume Input Panel */}
        <div className="border border-gray-100 rounded-xl p-4 shadow-sm">
          <button
            onClick={() => setResumeOpen((v) => !v)}
            className="w-full flex justify-between items-center mb-2 text-left"
          >
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${resumeText.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              Your Resume
            </h2>
            <span className="text-xs text-blue-600">{resumeOpen ? 'Collapse' : 'Edit'}</span>
          </button>

          {resumeOpen && (
            <>
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setParsedProfile(null); // Reset profile card when resume is edited
                }}
                placeholder="Paste your resume text here. Click 'Analyze & Match Jobs' to auto-search jobs tailored to your profile."
                rows={10}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              {parseError && (
                <p className="mt-1 text-xs text-red-600">{parseError}</p>
              )}

              <button
                onClick={handleAnalyzeResume}
                disabled={isParsing || !resumeText.trim()}
                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isParsing ? '⏳ Analyzing resume...' : '🔍 Analyze & Match Jobs'}
              </button>

              <p className="mt-2 text-xs text-gray-400">
                Your resume stays in your browser session and is only sent to the server when you click above or tailor to a specific job.
              </p>
            </>
          )}

          {!resumeOpen && (
            <p className="text-xs text-gray-500">
              {resumeText.trim()
                ? `${resumeText.trim().split(/\s+/).length} words saved`
                : 'No resume pasted yet'}
            </p>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 min-w-[140px]"
          >
            {isLoading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>

        {/* Filter Bar */}
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
          {(searchQuery || locationQuery || workMode !== 'Any Mode' || selectedType !== 'All Types') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setLocationQuery('');
                setWorkMode('Any Mode');
                setSelectedType('All Types');
                fetchJobs('', '');
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            <span className="font-bold text-red-500">⊗</span> {errorMsg}
          </div>
        )}

        {/* Job List */}
        <div className="space-y-4">
          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 border rounded-lg shadow-sm animate-pulse border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-5 bg-gray-100 rounded w-16"></div>
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded w-32"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
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
                  fetchJobs('', '');
                }}
                className="mt-6 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Job Cards */}
          {!isLoading &&
            filteredJobs.map((job, idx) => {
              const tailor = tailorMap[job.id];
              return (
                <div
                  key={job.id || idx}
                  className="border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white"
                >
                  <div className="p-6 flex flex-col md:flex-row justify-between gap-4">
                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 mb-1 truncate">{job.title}</h3>
                      <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                        <span className="font-medium text-gray-700 truncate">{job.company}</span>
                        <span>•</span>
                        <span className="truncate">{job.location}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
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

                    {/* Actions */}
                    <div className="flex flex-row md:flex-col items-start md:items-end justify-start md:justify-between gap-2 shrink-0">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleTailorResume(job)}
                          disabled={tailor?.loading}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          {tailor?.loading ? '✦ Tailoring...' : '✦ Tailor Resume'}
                        </button>
                        <a
                          href={job.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                        >
                          Apply Now
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Tailored Resume Drawer (inline under the job card) */}
                  {tailor?.open && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50 rounded-b-xl">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">
                          ✦ Tailored Resume — <span className="font-normal text-gray-500">{job.title} at {job.company}</span>
                        </h4>
                        <button
                          onClick={() => closeTailor(job.id)}
                          className="text-xs text-gray-500 hover:text-gray-800 hover:underline"
                        >
                          Close
                        </button>
                      </div>

                      {tailor.loading && (
                        <div className="py-8 text-center text-sm text-gray-500 animate-pulse">
                          AI is tailoring your resume to match this job description…
                        </div>
                      )}

                      {tailor.error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                          {tailor.error}
                        </p>
                      )}

                      {tailor.text && (
                        <>
                          {/* Render Gemini's Markdown output as formatted HTML */}
                          <div className="prose prose-sm max-w-none bg-white border border-gray-200 rounded-lg p-5 max-h-[500px] overflow-y-auto text-gray-800">
                            <ReactMarkdown>{tailor.text}</ReactMarkdown>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => copyTailored(tailor.text!)}
                              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Copy to clipboard
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </main>
    </div>
  );
}