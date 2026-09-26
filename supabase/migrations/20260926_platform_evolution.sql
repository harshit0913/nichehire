-- ==============================================================================
-- NicheHire Platform Evolution Migration: Premium Tiers, Founder Controls,
-- Career Guidance, Resume Builder & Secured Feedback Logging
-- ==============================================================================

-- 1. Extend user_profiles with Tier, Referral, and Founder Flags
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'member' CHECK (tier IN ('member', 'rising', 'trusted', 'premium')),
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS qualifying_referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_source VARCHAR(20) CHECK (premium_source IN ('referral', 'subscription', NULL)),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'past_due', NULL)),
  ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS highest_tier_achieved VARCHAR(20) DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE; -- Set strictly by direct DB SQL

-- Create index on referral code and founder flag
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);

-- 2. Founder Overrides Table (Explicit, Mutable Overrides for Founder-Referred Users)
CREATE TABLE IF NOT EXISTS founder_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('unlimited', 'premium', 'basic', 'revoked')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- RLS: Founder Overrides is strictly Admin/Founder only
ALTER TABLE founder_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Founder can view all overrides"
  ON founder_overrides FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_founder = TRUE)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Admin/Founder can modify overrides"
  ON founder_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_founder = TRUE)
    OR auth.role() = 'service_role'
  );

-- 3. Immutable Founder Override Audit Logs (Database-Level Immutability)
CREATE TABLE IF NOT EXISTS founder_override_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  previous_access_level VARCHAR(20),
  new_access_level VARCHAR(20) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enforce Immutability via PostgreSQL Trigger (Prevent any UPDATE or DELETE)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'founder_override_audit_logs is an immutable audit ledger; UPDATE, DELETE, and TRUNCATE are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_or_delete_audit_logs ON founder_override_audit_logs;
CREATE TRIGGER no_update_or_delete_audit_logs
BEFORE UPDATE OR DELETE OR TRUNCATE ON founder_override_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_modification();

REVOKE UPDATE, DELETE, TRUNCATE ON founder_override_audit_logs FROM PUBLIC, authenticated, anon;

-- 4. Referrals Ledger Table (With Anti-Fraud & 7-Day Qualification Tracking)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional', 'qualified', 'flagged_fraud')),
  device_fingerprint_hash VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral earnings"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR auth.role() = 'service_role');

-- 5. Premium Monthly Usage Metering
CREATE TABLE IF NOT EXISTS premium_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  tailored_resume_count INT DEFAULT 0,
  hr_email_draft_count INT DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);

ALTER TABLE premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON premium_usage FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- 6. Career Guidance Credits & Reports
CREATE TABLE IF NOT EXISTS career_report_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INT NOT NULL DEFAULT 1 CHECK (credits_remaining >= 0),
  bundle_type VARCHAR(32) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE career_report_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
  ON career_report_credits FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS career_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_goals TEXT NOT NULL,
  target_sector VARCHAR(20) NOT NULL,
  intake_text TEXT,
  report_content TEXT NOT NULL,
  human_follow_up_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE career_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved career reports"
  ON career_reports FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS counselor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counselor_id VARCHAR(64) NOT NULL,
  report_id UUID REFERENCES career_reports(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_link TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show_user', 'no_show_counselor', 'cancelled')),
  consent_to_share_report BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE counselor_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON counselor_bookings FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- 7. Structured User Resumes Table (Canonical ResumeData)
CREATE TABLE IF NOT EXISTS user_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(128) DEFAULT 'My Resume',
  resume_data JSONB NOT NULL,
  template_id VARCHAR(32) DEFAULT 'minimal',
  source_of_truth VARCHAR(20) DEFAULT 'user_authored',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own resumes"
  ON user_resumes FOR ALL
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- 8. Secured Feedback & Complaints Table
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(32) NOT NULL CHECK (type IN ('feature', 'bug', 'general', 'complaint')),
  message TEXT NOT NULL,
  email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  url_context TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_feedbacks: Anyone can insert, ONLY Admin/Founder can read or alter!
ALTER TABLE user_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON user_feedbacks FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admin/Founder can read and manage feedbacks"
  ON user_feedbacks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_founder = TRUE)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Admin/Founder can update feedback status"
  ON user_feedbacks FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_founder = TRUE)
    OR auth.role() = 'service_role'
  );
