import type { Metadata } from 'next';

// Prevent search engines from indexing the employer workspace
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: 'Employer Workspace — NicheHire',
  description: 'Post jobs, review candidates, and manage your hiring on NicheHire.',
};

export default function EmployerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
