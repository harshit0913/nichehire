-- ==============================================================================
-- Employer Payments & UTR Verification Schema
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.employer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(64),
  plan_amount INT NOT NULL,
  plan_name VARCHAR(64) NOT NULL,
  utr_number VARCHAR(64) NOT NULL,
  screenshot_data TEXT, -- Base64 data URL or storage URL
  status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_payments_status ON public.employer_payments(status);
CREATE INDEX IF NOT EXISTS idx_employer_payments_utr ON public.employer_payments(utr_number);

ALTER TABLE public.employer_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can insert payment proof" ON public.employer_payments;
  CREATE POLICY "Anyone can insert payment proof" ON public.employer_payments FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Anyone can read payment proof status" ON public.employer_payments;
  CREATE POLICY "Anyone can read payment proof status" ON public.employer_payments FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Founder can update payment status" ON public.employer_payments;
  CREATE POLICY "Founder can update payment status" ON public.employer_payments FOR UPDATE USING (true);
END $$;
