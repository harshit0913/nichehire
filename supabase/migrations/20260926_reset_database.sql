-- ==============================================================================
-- NicheHire Database Reset Script
-- Deletes all existing login accounts and user-uploaded resumes/profiles
-- ==============================================================================

-- 1. Truncate user-generated feature tables (cascading)
TRUNCATE TABLE IF EXISTS user_resumes CASCADE;
TRUNCATE TABLE IF EXISTS career_reports CASCADE;
TRUNCATE TABLE IF EXISTS career_report_credits CASCADE;
TRUNCATE TABLE IF EXISTS counselor_bookings CASCADE;
TRUNCATE TABLE IF EXISTS founder_overrides CASCADE;
TRUNCATE TABLE IF EXISTS referrals CASCADE;
TRUNCATE TABLE IF EXISTS premium_usage CASCADE;
TRUNCATE TABLE IF EXISTS user_profiles CASCADE;

-- 2. Delete all authentication users (Permanently clears login accounts)
DELETE FROM auth.users;

-- Verification query
SELECT COUNT(*) AS remaining_users FROM auth.users;
