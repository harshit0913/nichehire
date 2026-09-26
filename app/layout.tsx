import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2B4EE6",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "NicheHire — Your Job Buddy!!",
    template: "%s | NicheHire — Your Job Buddy!!",
  },
  description:
    "NicheHire — Your Job Buddy!! Verified job listings under 7 days old, direct from company career portals. Zero ghost jobs, 100% genuine postings with AI candidate fit scoring, recruiter drafts, and public sector exams.",
  keywords: [
    "nichehire",
    "your job buddy",
    "verified jobs",
    "genuine job board",
    "jobs under 7 days old",
    "no ghost jobs",
    "direct company career portals",
    "software engineer jobs",
    "product manager jobs",
    "data analyst jobs",
    "financial analyst jobs",
    "operations jobs",
    "remote jobs india",
    "greenhouse lever jobs",
    "bangalore jobs",
    "delhi ncr jobs",
    "mumbai jobs",
    "hyderabad jobs",
    "pune jobs",
    "govt exams calendar",
    "sarkari naukri verified",
    "upsc ssc rrb exams 2026",
    "bhel ongc isro psu jobs",
  ],
  authors: [{ name: "NicheHire Team" }],
  creator: "NicheHire",
  metadataBase: new URL("https://nichehire-psi.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nichehire-psi.vercel.app",
    siteName: "NicheHire — Your Job Buddy!!",
    title: "NicheHire — Your Job Buddy!!",
    description:
      "Your Job Buddy for verified careers, zero ghost jobs, fresh listings under 7 days old, and genuine opportunities direct from official company career portals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NicheHire — Your Job Buddy!!",
    description:
      "Your Job Buddy for verified careers, zero ghost jobs, fresh listings under 7 days old, and genuine opportunities direct from official company career portals.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F8FA] text-[#12172B] font-sans selection:bg-[#2B4EE6]/15 selection:text-[#12172B]">
        {children}
      </body>
    </html>
  );
}
