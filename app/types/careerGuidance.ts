export interface CareerReportCredit {
  userId: string;
  creditsRemaining: number;
  purchasedAt: string;
  bundleType: 'single' | 'report_and_human' | 'bundle_2' | 'bundle_5';
}

export interface CareerReport {
  id: string;
  userId: string;
  generatedAt: string;
  intake: {
    goals: string;
    targetSector: 'govt' | 'private' | 'undecided';
    freeText?: string;
    resumeText?: string;
  };
  reportContent: string; // Structured markdown/JSON
  humanFollowUpBooked: boolean;
}

export interface CounselorBooking {
  id: string;
  userId: string;
  counselorId: string;
  reportId: string; // Links to the AI report reviewed pre-call
  scheduledAt: string;
  meetingLink: string;
  status: 'scheduled' | 'completed' | 'no_show_user' | 'no_show_counselor' | 'cancelled';
  consentToShareReport: boolean;
}

export const CAREER_GUIDANCE_PRICING = {
  single_report: {
    id: 'single_report',
    price: 199,
    credits: 1,
    perUnit: 199,
    humanCall: false,
    label: '1 AI Career Report',
    description: 'Personalized gap analysis, govt vs private trajectory, and 90-day action roadmap.',
  },
  report_and_human: {
    id: 'report_and_human',
    price: 499,
    credits: 1,
    perUnit: 499,
    humanCall: true,
    label: '1 AI Report + 1 Human Call',
    description: 'Detailed AI report + 1-on-1 video strategy session with a career counselor (Cal.com).',
  },
  bundle_2: {
    id: 'bundle_2',
    price: 349,
    credits: 2,
    perUnit: 174.5,
    humanCall: false,
    label: '2 AI Career Reports',
    description: 'Compare 2 distinct target paths (e.g. UPSC vs Software Engineer). Save 12%.',
  },
  bundle_5: {
    id: 'bundle_5',
    price: 699,
    credits: 5,
    perUnit: 139.8,
    humanCall: false,
    label: '5 AI Career Reports',
    description: 'Comprehensive annual trajectory pack for competitive aspirants. Save 30%.',
  },
} as const;

export type PricingTierKey = keyof typeof CAREER_GUIDANCE_PRICING;
