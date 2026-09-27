-- ==============================================================================
-- Migration: Flexible User Profiles & Unique Referral Codes
-- Allows accounts registered via Email/Mobile OTP to store profiles directly
-- ==============================================================================

-- 1. Drop foreign key constraint on auth.users(id) so custom OTP accounts can register
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- 2. Ensure referral_code has a unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_referral_code_key'
  ) THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- 3. Ensure indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);

-- 4. Permissive policies for reading and updating profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.user_profiles;
CREATE POLICY "Public profiles read" ON public.user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
CREATE POLICY "Users can manage own profile" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
