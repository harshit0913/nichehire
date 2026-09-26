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
    default: "NicheHire — Verified job listings under 7 days old, direct from company career portals",
    template: "%s | NicheHire",
  },
  description:
    "NicheHire — Verified job listings under 7 days old, direct from company career portals. Zero ghost jobs, 100% genuine postings with AI candidate fit scoring and direct recruiter outreach.",
  keywords: [
    "verified jobs",
    "genuine job board",
    "jobs under 7 days old",
    "no ghost jobs",
    "direct company career portals",
    "software engineer jobs",
    "data analyst jobs",
    "remote jobs",
    "greenhouse lever jobs",
    "indore tech jobs",
    "bangalore jobs",
    "govt exams calendar",
    "sarkari naukri verified",
    "upsc ssc rrb exams 2026",
    "mppsc state service exam",
    "bhel ongc isro psu jobs",
  ],
  authors: [{ name: "NicheHire Team" }],
  creator: "NicheHire",
  metadataBase: new URL("https://nichehire-psi.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nichehire-psi.vercel.app",
    siteName: "NicheHire",
    title: "NicheHire — Verified job listings under 7 days old, direct from company career portals",
    description:
      "Zero ghost jobs. 100% verified opportunities sourced straight from official employer career portals and tier-1 ATS feeds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NicheHire — Verified job listings under 7 days old, direct from company career portals",
    description:
      "Zero ghost jobs. 100% verified opportunities sourced straight from official employer career portals and tier-1 ATS feeds.",
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
