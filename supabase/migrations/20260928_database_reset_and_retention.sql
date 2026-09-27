-- Supabase Database Reset & Cleanup Script
-- Executed to wipe non-founder test records and clear mock data across all tables.

-- 1. Wipe non-founder user profiles (Preserves founder: de0602eb-e65f-40c8-b0bf-d5efff04114b)
DELETE FROM public.user_profiles 
WHERE user_id != 'de0602eb-e65f-40c8-b0bf-d5efff04114b';

-- 2. Clear job applications and postings test data
DELETE FROM public.job_applications;
DELETE FROM public.employer_postings;
DELETE FROM public.employer_payments;

-- 3. Clear candidate resumes and profiles (if any exist)
DELETE FROM public.user_resumes;
DELETE FROM public.profiles;

-- 4. Truncate site_visits analytics table to reset visit counters
TRUNCATE TABLE public.site_visits;

-- 5. Add DELETE policy for site_visits so administrators can purge telemetry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_visits' AND policyname = 'Admins can delete site visits'
  ) THEN
    CREATE POLICY "Admins can delete site visits" ON public.site_visits FOR DELETE USING (true);
  END IF;
END $$;
