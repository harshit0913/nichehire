-- ==============================================================================
-- Migration: Site Analytics & Team Permissions for Website Changes
-- Adds site visits tracking and granular team access approval controls
-- ==============================================================================

-- 1. Site Visits & Traffic Tracking Table
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path VARCHAR(255) NOT NULL,
  visitor_id VARCHAR(128),
  referrer TEXT,
  device_type VARCHAR(32) DEFAULT 'desktop',
  browser VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_path ON public.site_visits(path);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON public.site_visits(visitor_id);

-- Enable RLS for site_visits
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert site visits" ON public.site_visits;
CREATE POLICY "Public can insert site visits" ON public.site_visits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can select site visits" ON public.site_visits;
CREATE POLICY "Public can select site visits" ON public.site_visits FOR SELECT USING (true);

-- 2. Team Website Editing & Approvals Table
CREATE TABLE IF NOT EXISTS public.team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(64) DEFAULT 'Website Editor',
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'revoked')),
  can_edit_jobs BOOLEAN DEFAULT TRUE,
  can_manage_walkins BOOLEAN DEFAULT TRUE,
  can_verify_payments BOOLEAN DEFAULT FALSE,
  can_reply_feedbacks BOOLEAN DEFAULT TRUE,
  can_edit_website BOOLEAN DEFAULT TRUE,
  can_view_analytics BOOLEAN DEFAULT TRUE,
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_team_permissions_email ON public.team_permissions(email);
CREATE INDEX IF NOT EXISTS idx_team_permissions_user_id ON public.team_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_permissions_status ON public.team_permissions(status);

-- Enable RLS for team_permissions
ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team permissions full access" ON public.team_permissions;
CREATE POLICY "Team permissions full access" ON public.team_permissions FOR ALL USING (true);
