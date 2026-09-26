-- ==============================================================================
-- NicheHire Migration: Founder Admin, Role Assignments, Feedback Replies,
-- Job Applications & Dedicated Employer Dashboard
-- ==============================================================================

-- 1. Extend user_profiles with Founder Role Assignment Fields
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(64) DEFAULT 'Member',
  ADD COLUMN IF NOT EXISTS assigned_role_by UUID REFERENCES auth.users(id);

-- Create index on assigned_role
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_role ON user_profiles(assigned_role);

-- 2. Extend user_feedbacks with Admin Reply & Resolution Fields
ALTER TABLE IF EXISTS user_feedbacks
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id);

-- Allow authenticated users to view their own submitted feedbacks and admin replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedbacks' AND policyname = 'Users can view their own feedback'
  ) THEN
    CREATE POLICY "Users can view their own feedback"
      ON user_feedbacks FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Dedicated Job Applications Table for Employer Dashboard
CREATE TABLE IF NOT EXISTS job_applications (
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

CREATE INDEX IF NOT EXISTS idx_job_applications_employer ON job_applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Applicants can view their own applications') THEN
    CREATE POLICY "Applicants can view their own applications"
      ON job_applications FOR SELECT
      USING (applicant_id = auth.uid() OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Applicants can submit applications') THEN
    CREATE POLICY "Applicants can submit applications"
      ON job_applications FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Employers can manage applications for their jobs') THEN
    CREATE POLICY "Employers can manage applications for their jobs"
      ON job_applications FOR ALL
      USING (employer_id = auth.uid() OR auth.role() = 'service_role');
  END IF;
END $$;

-- 4. Employer Job Postings Table
CREATE TABLE IF NOT EXISTS employer_postings (
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

CREATE INDEX IF NOT EXISTS idx_employer_postings_employer ON employer_postings(employer_id);

ALTER TABLE employer_postings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employer_postings' AND policyname = 'Anyone can view active employer postings') THEN
    CREATE POLICY "Anyone can view active employer postings"
      ON employer_postings FOR SELECT
      USING (status = 'active' OR employer_id = auth.uid() OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employer_postings' AND policyname = 'Employers can manage their own postings') THEN
    CREATE POLICY "Employers can manage their own postings"
      ON employer_postings FOR ALL
      USING (employer_id = auth.uid() OR auth.role() = 'service_role');
  END IF;
END $$;

-- ==============================================================================
-- 5. Founder Account Provisioning / Setup Query (Harshit Mishra)
-- Run this in Supabase SQL Editor if user account is already created:
-- ==============================================================================
-- UPDATE user_profiles 
-- SET 
--   is_founder = TRUE,
--   tier = 'premium',
--   referral_code = 'FOUNDER',
--   assigned_role = 'Founder & CEO'
-- WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email IN ('harshitmishra7073@gmail.com', 'founder@nichehire.in')
-- );
