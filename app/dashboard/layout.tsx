import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: 'Candidate Dashboard — NicheHire',
  description: 'Manage your verified job applications, tier status, and AI credits on NicheHire.',
};

export default function CandidateDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
