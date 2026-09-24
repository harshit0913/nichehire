import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Employer Pricing & Plans — Post Verified Job Openings',
  description:
    'Reach high-intent candidates with zero ghost jobs. Post verified tech jobs with direct career portal links, candidate fit matching, and Google for Jobs indexing.',
};

export default function PricingPage() {
  return <PricingContent />;
}
