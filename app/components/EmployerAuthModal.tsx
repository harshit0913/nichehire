'use client';

import { useState } from 'react';
import { supabase } from '../supabase';

interface EmployerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, companyInfo?: { companyName?: string; email?: string }) => void;
}

export default function EmployerAuthModal({ isOpen, onClose, onSuccess }: EmployerAuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'register') {
        if (!companyName.trim()) {
          throw new Error('Please enter your Company / Organization Name.');
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please enter an official corporate work email.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              account_type: 'employer',
              company_name: companyName.trim(),
              contact_name: recruiterName.trim(),
              company_website: website.trim(),
            },
          },
        });

        if (error) throw error;
        if (data.user) {
          // Initialize user_profile with employer role
          try {
            await supabase
              .from('user_profiles')
              .upsert({
                user_id: data.user.id,
                assigned_role: 'Employer',
                tier: 'member',
              }, { onConflict: 'user_id' });
          } catch (profileErr) {
            console.warn('Could not record employer profile row:', profileErr);
          }

          // Save company info to localStorage for instant hydration
          localStorage.setItem('nichehire_employer_company', companyName.trim());
          localStorage.setItem('nichehire_employer_email', email.trim());

          setSuccessMsg('🎉 Employer account created successfully! Signing you in...');
          onSuccess(data.user, { companyName: companyName.trim(), email: email.trim() });
          setTimeout(() => onClose(), 1200);
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        if (data.user) {
          const comp = data.user.user_metadata?.company_name || '';
          if (comp) {
            localStorage.setItem('nichehire_employer_company', comp);
          }
          localStorage.setItem('nichehire_employer_email', data.user.email || email.trim());

          setSuccessMsg('✓ Welcome back! Employer session authenticated.');
          onSuccess(data.user, { companyName: comp, email: data.user.email });
          setTimeout(() => onClose(), 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative border border-gray-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 text-2xl border border-indigo-100">
            🏢
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {mode === 'register' ? 'Register Your Company' : 'Employer & Recruiter Sign In'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'register'
              ? 'Create a verified hiring account to post openings and review genuine candidate CVs.'
              : 'Sign in to access your active job listings and inspect applicant fit scores.'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-semibold mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white shadow-xs text-gray-900 font-bold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-white shadow-xs text-gray-900 font-bold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register Company
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Company / Organization Name: *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Infosys, TCS, Razorpay, Zepto"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Recruiter / HR Name:
                  </label>
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Website / Careers URL:
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Official Corporate Work Email: *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recruiter@company.com"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Password: *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2B4EE6]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2B4EE6] hover:bg-[#1E3BBD] disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : mode === 'register' ? 'Register Company & Start Hiring' : 'Sign In to Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
