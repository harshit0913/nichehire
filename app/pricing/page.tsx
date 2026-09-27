import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Employer Pricing & Launch Plans — Post Verified Job Openings',
  description:
    'Post verified roles with zero subscription lock-in. Free 10-day pilot for 1 job, ₹299 Growth (14 days), ₹599 Pro (21 days), and ₹999 Enterprise (30 days). Direct career portal links, AI fit screening, and Google for Jobs indexing.',
};

export default function PricingPage() {
  return <PricingContent />;
}
