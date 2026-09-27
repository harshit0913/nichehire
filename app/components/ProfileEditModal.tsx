'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Check,
  User,
  GraduationCap,
  Briefcase,
  LocateFixed,
  IndianRupee,
  FileText,
  Plus,
} from './icons';
import { ICON_STROKE_WIDTH, ICON_SIZES } from '../lib/iconRules';

export interface CandidateProfileData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  degree: string;
  institution: string;
  gradYear: string;
  experienceLevel: string;
  currentCompany: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriod: string;
  skills: string[];
  preferredLocations: string[];
  bio: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  userEmail?: string | null;
  onSaved?: (profile: CandidateProfileData) => void;
}

const DEFAULT_PROFILE: CandidateProfileData = {
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  pincode: '',
  degree: 'B.Com (Commerce & Finance)',
  institution: '',
  gradYear: '2025',
  experienceLevel: 'Fresher (0-1 yr)',
  currentCompany: '',
  currentCtc: '',
  expectedCtc: '',
  noticePeriod: 'Immediate Joiner',
  skills: [],
  preferredLocations: [],
  bio: '',
};

const SUGGESTED_SKILLS = [
  'Financial Modeling',
  'GST & TDS Filing',
  'Tally Prime & ERP',
  'Supply Chain & Logistics',
  'Contract Drafting & Legal Review',
  'Commercial Litigation',
  'Statutory Audit & Tax',
  'Business Analysis (BBA/MBA)',
  'Operations Management',
  'Data Structures & SQL (BCA)',
  'Python / Data Analytics',
  'Content Strategy & Editing (BA)',
  'Clinical Medicine / Patient Care (MBBS)',
  'Hospitality & Admin',
  'Digital Marketing & SEO',
];

const DEGREE_OPTIONS = [
  'B.Com (Commerce & Finance)',
  'BBA / BMS (Business Administration)',
  'B.A (Humanities & Social Sciences)',
  'BCA (Computer Applications)',
  'MBA (Management / Supply Chain / Finance)',
  'CA Final / Articleship (ICAI)',
  'CMA (Cost & Management Accounting)',
  'CS (Company Secretary)',
  'LLB / BA LLB (Legal Studies)',
  'MBBS / Healthcare Administration',
  'B.Tech / B.E (Engineering)',
  'M.Com (Accounting & Commerce)',
  'M.A (Economics / English / Arts)',
  'Other Professional Degree',
];

export default function ProfileEditModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  onSaved,
}: ProfileEditModalProps) {
  const [profile, setProfile] = useState<CandidateProfileData>(DEFAULT_PROFILE);
  const [skillInput, setSkillInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const storageKey = `nichehire_candidate_profile_${userId || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        setProfile((prev) => ({
          ...prev,
          email: userEmail || '',
        }));
      }
    } catch {
      // Ignore
    }
  }, [isOpen, userId, userEmail]);

  if (!isOpen) return null;

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed || profile.skills.includes(trimmed)) return;
    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddLocation = (locToAdd: string) => {
    const trimmed = locToAdd.trim();
    if (!trimmed || profile.preferredLocations.includes(trimmed)) return;
    setProfile((prev) => ({
      ...prev,
      preferredLocations: [...prev.preferredLocations, trimmed],
    }));
    setLocationInput('');
  };

  const handleRemoveLocation = (locToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((l) => l !== locToRemove),
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      const storageKey = `nichehire_candidate_profile_${userId || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(profile));
      setSaveSuccess(true);
      if (onSaved) onSaved(profile);

      setTimeout(() => {
        setSaveSuccess(false);
        setIsSaving(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save candidate profile', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-[#E4E7EC] my-8 animate-in fade-in duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5B6478] hover:text-[#12172B] p-1.5 rounded-full hover:bg-[#F7F8FA] transition-colors"
        >
          <X size={ICON_SIZES.action} strokeWidth={ICON_STROKE_WIDTH} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E4E7EC]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2B4EE6] flex items-center justify-center font-bold">
            <User size={ICON_SIZES.section} strokeWidth={ICON_STROKE_WIDTH} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#12172B]">Edit Candidate Profile</h2>
            <p className="text-xs text-[#5B6478]">
              Keep your profile up to date for direct corporate recruiter visibility and automated fit scoring.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-5"
        >
          {/* Basic Personal Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#12172B] uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-[#2B4EE6]" />
              <span>Personal Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Headline / Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. B.Com Graduate | CA Aspirant | Supply Chain Specialist"
                  value={profile.headline}
                  onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Official Email</label>
                <input
                  type="email"
                  disabled
                  value={profile.email || userEmail || ''}
                  className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded-lg text-xs text-[#5B6478] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Current City</label>
                <input
                  type="text"
                  placeholder="e.g. Jaipur, Nainital, Gangtok"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g. Rajasthan, Uttarakhand"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Pin Code</label>
                <input
                  type="text"
                  placeholder="e.g. 302001"
                  value={profile.pincode}
                  onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>
            </div>
          </div>

          {/* Education & Academic Discipline */}
          <div className="space-y-3 pt-3 border-t border-[#E4E7EC]">
            <h3 className="text-xs font-semibold text-[#12172B] uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-[#0E9F6E]" />
              <span>Academic Degree &amp; Education</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Highest Qualification</label>
                <select
                  value={profile.degree}
                  onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  {DEGREE_OPTIONS.map((deg) => (
                    <option key={deg} value={deg}>
                      {deg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">College / University / Institute</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi University, Kumaun University, ICAI"
                  value={profile.institution}
                  onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Graduation / Pass-out Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2024 or 2025"
                  value={profile.gradYear}
                  onChange={(e) => setProfile({ ...profile, gradYear: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Experience Level</label>
                <select
                  value={profile.experienceLevel}
                  onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="Fresher (0-1 yr)">Fresher (0-1 yr)</option>
                  <option value="1-3 Years Experience">1-3 Years Experience</option>
                  <option value="3-5 Years Experience">3-5 Years Experience</option>
                  <option value="5-8 Years Experience">5-8 Years Experience</option>
                  <option value="8+ Years Senior">8+ Years Senior</option>
                </select>
              </div>
            </div>
          </div>

          {/* Professional Preferences & CTC */}
          <div className="space-y-3 pt-3 border-t border-[#E4E7EC]">
            <h3 className="text-xs font-semibold text-[#12172B] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-purple-600" />
              <span>Career &amp; CTC Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Expected CTC</label>
                <input
                  type="text"
                  placeholder="e.g. 6-8 LPA or ₹45,000/mo"
                  value={profile.expectedCtc}
                  onChange={(e) => setProfile({ ...profile, expectedCtc: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Current CTC / Stipend</label>
                <input
                  type="text"
                  placeholder="e.g. Fresher / 3.5 LPA"
                  value={profile.currentCtc}
                  onChange={(e) => setProfile({ ...profile, currentCtc: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5B6478] mb-1">Notice Period</label>
                <select
                  value={profile.noticePeriod}
                  onChange={(e) => setProfile({ ...profile, noticePeriod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
                >
                  <option value="Immediate Joiner">Immediate Joiner</option>
                  <option value="15 Days Notice">15 Days Notice</option>
                  <option value="30 Days Notice">30 Days Notice</option>
                  <option value="60 Days Notice">60 Days Notice</option>
                  <option value="Currently Serving Notice">Currently Serving Notice</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Skills Tags */}
          <div className="space-y-3 pt-3 border-t border-[#E4E7EC]">
            <h3 className="text-xs font-semibold text-[#12172B] uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-600" />
              <span>Skills &amp; Competencies</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a skill (e.g. GST, Financial Modeling, Supply Chain, Python)..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                className="flex-1 px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="px-3.5 py-2 bg-[#F7F8FA] hover:bg-[#E4E7EC] text-[#12172B] border border-[#E4E7EC] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus size={13} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Add</span>
              </button>
            </div>

            {/* Selected Skills Chips */}
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 bg-blue-50 text-[#2B4EE6] border border-blue-100 rounded-md text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-600"
                  >
                    <X size={11} strokeWidth={ICON_STROKE_WIDTH} />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="text-[11px] text-[#5B6478] mr-2">Suggestions:</span>
              <div className="inline-flex flex-wrap gap-1 mt-1">
                {SUGGESTED_SKILLS.filter((s) => !profile.skills.includes(s)).slice(0, 6).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#F7F8FA] border border-[#E4E7EC] text-[#5B6478] hover:border-[#2B4EE6] hover:text-[#2B4EE6] transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Bio */}
          <div className="space-y-1.5 pt-3 border-t border-[#E4E7EC]">
            <label className="block text-xs font-semibold text-[#12172B]">About / Professional Summary</label>
            <textarea
              rows={3}
              placeholder="Brief summary of your professional background, key achievements, and career aspirations..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs text-[#12172B] focus:outline-none focus:border-[#2B4EE6]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E4E7EC]">
            {saveSuccess ? (
              <span className="text-xs text-[#0E9F6E] font-semibold flex items-center gap-1">
                <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
                <span>Profile saved successfully!</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#5B6478]">
                Changes are saved securely to your personal dashboard.
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#5B6478] hover:text-[#12172B] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
