import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Employer Pricing & Launch Plans — Post Verified Job Openings',
  description:
    'Post verified tech roles with zero subscription lock-in. Lead with our ₹4,999 single-post tier or test our free launch pilot. Direct career portal links, AI fit screening, and Google for Jobs indexing.',
};

export default function PricingPage() {
  return <PricingContent />;
}
