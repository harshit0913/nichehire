import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
