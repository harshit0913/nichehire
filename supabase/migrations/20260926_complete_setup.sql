-- ==============================================================================
-- NicheHire Master Database Setup & Reset
-- Run this ONCE in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create Core Tables
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) DEFAULT 'member' CHECK (tier IN ('member', 'rising', 'trusted', 'premium')),
  referral_code VARCHAR(32) UNIQUE,
  referred_by VARCHAR(64),
  qualifying_referral_count INT DEFAULT 0,
  premium_source VARCHAR(20) CHECK (premium_source IN ('referral', 'subscription', 'bug_bounty', NULL)),
  subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'past_due', NULL)),
  subscription_renews_at TIMESTAMPTZ,
  highest_tier_achieved VARCHAR(20) DEFAULT 'member',
  is_founder BOOLEAN DEFAULT FALSE,
  assigned_role VARCHAR(64) DEFAULT 'Member',
  assigned_role_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tier_achieved_at JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);

-- 2. Founder Overrides
CREATE TABLE IF NOT EXISTS public.founder_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('unlimited', 'premium', 'basic', 'revoked')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS public.founder_override_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  previous_access_level VARCHAR(20),
  new_access_level VARCHAR(20) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Referrals Ledger
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional', 'qualified', 'flagged_fraud')),
  device_fingerprint_hash VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ
);

-- 5. Premium Usage Metering
CREATE TABLE IF NOT EXISTS public.premium_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  tailored_resume_count INT DEFAULT 0,
  hr_email_draft_count INT DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);

-- 6. Career Guidance Credits & Reports
CREATE TABLE IF NOT EXISTS public.career_report_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INT NOT NULL DEFAULT 1 CHECK (credits_remaining >= 0),
  bundle_type VARCHAR(32) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.career_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_goals TEXT NOT NULL,
  target_sector VARCHAR(20) NOT NULL,
  intake_text TEXT,
  report_content TEXT NOT NULL,
  human_follow_up_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.counselor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counselor_id VARCHAR(64) NOT NULL,
  report_id UUID REFERENCES public.career_reports(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_link TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show_user', 'no_show_counselor', 'cancelled')),
  consent_to_share_report BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Resumes
CREATE TABLE IF NOT EXISTS public.user_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(128) DEFAULT 'My Resume',
  resume_data JSONB NOT NULL,
  template_id VARCHAR(32) DEFAULT 'minimal',
  source_of_truth VARCHAR(20) DEFAULT 'user_authored',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Feedbacks & Complaints
CREATE TABLE IF NOT EXISTS public.user_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(32) NOT NULL CHECK (type IN ('feature', 'bug', 'general', 'complaint')),
  message TEXT NOT NULL,
  email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  url_context TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  admin_notes TEXT,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Employer Applications & Postings
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(128) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  employer_id UUID REFERENCES auth.users(id),
  applicant_id UUID REFERENCES auth.users(id),
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(64),
  resume_text TEXT NOT NULL,
  fit_percentage INT DEFAULT 85,
  fit_analysis JSONB,
  status VARCHAR(32) DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employer_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  work_email VARCHAR(255) NOT NULL,
  portal_url TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  work_mode VARCHAR(32) NOT NULL DEFAULT 'Remote',
  job_type VARCHAR(32) NOT NULL DEFAULT 'Full-Time',
  salary VARCHAR(128),
  experience VARCHAR(64),
  description TEXT NOT NULL,
  plan_selected VARCHAR(32) DEFAULT 'free',
  status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Permissive Policies for Web App Access
DO $$
BEGIN
  -- User Profiles
  DROP POLICY IF EXISTS "Public profiles read" ON public.user_profiles;
  CREATE POLICY "Public profiles read" ON public.user_profiles FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
  CREATE POLICY "Users can manage own profile" ON public.user_profiles FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

  -- User Feedbacks
  DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.user_feedbacks;
  CREATE POLICY "Anyone can insert feedback" ON public.user_feedbacks FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can view feedbacks" ON public.user_feedbacks;
  CREATE POLICY "Users can view feedbacks" ON public.user_feedbacks FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Founder can update feedbacks" ON public.user_feedbacks;
  CREATE POLICY "Founder can update feedbacks" ON public.user_feedbacks FOR UPDATE USING (true);

  -- Resumes
  DROP POLICY IF EXISTS "Users can manage own resumes" ON public.user_resumes;
  CREATE POLICY "Users can manage own resumes" ON public.user_resumes FOR ALL USING (auth.uid() = user_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

  -- Applications
  DROP POLICY IF EXISTS "Applications access" ON public.job_applications;
  CREATE POLICY "Applications access" ON public.job_applications FOR ALL USING (true);

  -- Postings
  DROP POLICY IF EXISTS "Postings access" ON public.employer_postings;
  CREATE POLICY "Postings access" ON public.employer_postings FOR ALL USING (true);

  -- Referrals
  DROP POLICY IF EXISTS "Referrals access" ON public.referrals;
  CREATE POLICY "Referrals access" ON public.referrals FOR ALL USING (true);

  -- Usage
  DROP POLICY IF EXISTS "Usage access" ON public.premium_usage;
  CREATE POLICY "Usage access" ON public.premium_usage FOR ALL USING (true);
END $$;

-- ==============================================================================
-- OPTIONAL: Clean old test accounts & resumes (if you want a 100% fresh start)
-- ==============================================================================
-- TRUNCATE TABLE public.user_resumes CASCADE;
-- TRUNCATE TABLE public.job_applications CASCADE;
-- TRUNCATE TABLE public.user_feedbacks CASCADE;
-- DELETE FROM auth.users WHERE email NOT IN ('harshitmishra7073@gmail.com');
