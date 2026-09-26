export interface PaymentRecord {
  id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  plan_amount: number;
  plan_name: string;
  utr_number: string;
  screenshot_data: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  verified_by?: string;
  verified_at?: string;
  admin_notes?: string;
}

// In-memory fallback buffer (persists across API routes in Node runtime)
export const inMemoryPayments: PaymentRecord[] = [];
