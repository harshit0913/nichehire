export type EmployerPlanId = 'free' | 'growth' | 'pro' | 'enterprise';

export interface EmployerMembershipPlan {
  id: EmployerPlanId;
  name: string;
  price: number;
  jobCount: number;
  durationDays: number;
  description: string;
  features: string[];
  badge?: string;
  recommended?: boolean;
}

export interface EmployerActiveMembership {
  planId: EmployerPlanId;
  planName: string;
  price: number;
  totalJobs: number;
  usedJobs: number;
  durationDays?: number;
  activatedAt: number; // timestamp
  expiresAt: number; // timestamp
  status: 'active' | 'expired' | 'exhausted';
  utrNumber?: string;
}

export const EMPLOYER_MEMBERSHIP_PLANS: EmployerMembershipPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    price: 0,
    jobCount: 1,
    durationDays: 10,
    badge: '1st Post Free',
    description: 'First job listing free for 10 days for verified corporate employers',
    features: [
      '1 Active Job Listing',
      '10 Days Listing Validity',
      'Direct candidate applications & parsed resumes',
      'Standard AI fit calculation',
      'Google for Jobs schema indexing',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    price: 299,
    jobCount: 2,
    durationDays: 14,
    badge: 'Popular',
    description: '2 job listings active for 14 days with verified company badge',
    features: [
      '2 Active Job Listings',
      '14 Days Listing Validity',
      'Direct candidate applications & parsed resumes',
      'Verified corporate employer badge',
      'Candidate contact details unlocked',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Recruiter',
    price: 599,
    jobCount: 5,
    durationDays: 21,
    badge: 'Best Value',
    recommended: true,
    description: '5 job listings active for 21 days with priority AI candidate match',
    features: [
      '5 Active Job Listings',
      '21 Days Listing Validity',
      'Priority AI candidate screening & fit scoring',
      'Walk-in drive posting enabled',
      'Direct HR outreach & email notifications',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Volume',
    price: 999,
    jobCount: 20,
    durationDays: 30,
    badge: 'Maximum Reach',
    description: '20 job listings active for 30 days for high-volume enterprise hiring',
    features: [
      '20 Active Job Listings',
      '30 Days Listing Validity',
      'All hiring hubs & regional drive access',
      'Maximum visibility & featured tags',
      'Dedicated support & applicant export',
    ],
  },
];
