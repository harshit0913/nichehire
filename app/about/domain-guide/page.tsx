import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free & Affordable Domain Setup Guide — NicheHire',
  description:
    'Comprehensive step-by-step instructions on acquiring free domains (GitHub Student Pack, eu.org) and affordable .in domains, with free Cloudflare DNS and Vercel SSL.',
};

export default function DomainGuidePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#12172B] flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#12172B] flex items-center justify-center text-white font-bold text-xs">
              NH
            </div>
            <span className="font-bold text-base text-[#12172B] tracking-tight">NicheHire</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/employer/dashboard" className="text-[#5B6478] hover:text-[#12172B] font-medium">
              Employer Dashboard
            </Link>
            <Link href="/" className="px-3.5 py-1.5 text-white bg-[#2B4EE6] hover:bg-[#1E3BBD] rounded-xl font-semibold">
              Return to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800">
            <span>🌐</span> Founder & Operational Guide
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            How to Get a Free or Ultra-Affordable Domain for NicheHire
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            A comprehensive guide covering 100% free domain options, high-credibility budget extensions (like <code>.in</code>), and zero-cost DNS and SSL hosting.
          </p>
        </div>

        {/* 4 Methods Grid */}
        <div className="space-y-6">
          {/* Method 1: GitHub Student Developer Pack */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Best Free Option for Students
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  1. GitHub Student Developer Pack (1 Year 100% Free)
                </h2>
              </div>
              <span className="text-2xl">🎓</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              If you or anyone on your founding team has access to a college/university email address (e.g. <code>@college.ac.in</code> or <code>@edu</code>) or a student ID card, you can claim the <strong>GitHub Student Developer Pack</strong>.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl text-xs space-y-2">
              <strong className="text-gray-900 block font-semibold">What is included for free:</strong>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Namecheap:</strong> 1 free year of a <code>.me</code> domain registration with free WhoisGuard privacy protection.</li>
                <li><strong>Name.com:</strong> 1 free year of a <code>.tech</code>, <code>.live</code>, or <code>.site</code> domain.</li>
                <li><strong>DigitalOcean / Microsoft Azure:</strong> Up to $100–$200 in free cloud credits.</li>
              </ul>
            </div>
            <a
              href="https://education.github.com/pack"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Apply at education.github.com/pack →
            </a>
          </div>

          {/* Method 2: eu.org */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Free Forever with No Expiry
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  2. eu.org (100% Free Public Suffix Domain)
                </h2>
              </div>
              <span className="text-2xl">🆓</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Founded in 1996 to facilitate non-profit internet access, <strong>eu.org</strong> provides free sub-domains (e.g. <code>nichehire.eu.org</code>) to anyone in the world. Crucially, ICANN and Google recognize <code>eu.org</code> on the Public Suffix List, which means it receives standard SEO indexing.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl text-xs space-y-2">
              <strong className="text-gray-900 block font-semibold">How to register:</strong>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Create an account at <a href="https://nic.eu.org" target="_blank" rel="noreferrer" className="text-blue-600 underline">nic.eu.org</a>.</li>
                <li>Create a free account at <strong>Cloudflare.com</strong>.</li>
                <li>Request your domain (e.g. <code>nichehire.eu.org</code>) and enter your Cloudflare nameservers.</li>
                <li>Approval typically takes 24 to 72 hours. Once approved, it is free forever with zero renewal fees.</li>
              </ol>
            </div>
          </div>

          {/* Method 3: Budget Indian TLD (.in / .site) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Recommended for Commercial Credibility
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  3. Low-Cost Indian Domain: .in or .co.in (₹299–₹399 / year)
                </h2>
              </div>
              <span className="text-2xl">🇮🇳</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              For recruiting Indian candidates and corporate HR teams, having a genuine <code>.in</code> domain (e.g. <code>nichehire.in</code>) yields significantly higher conversion and trust than free foreign subdomains.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl text-xs space-y-2">
              <strong className="text-gray-900 block font-semibold">Best low-cost registrars without hidden price hikes:</strong>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Spaceship.com:</strong> <code>.in</code> often available for ₹399/yr, or <code>.site</code> / <code>.online</code> for ₹79 - ₹120 for year 1.</li>
                <li><strong>Dynadot:</strong> High reputation, free WHOIS privacy, and low renewal costs.</li>
                <li><strong>Hostinger / Namecheap:</strong> Competitive initial coupons for first-time buyers.</li>
              </ul>
            </div>
            <a
              href="https://www.spaceship.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2B4EE6] hover:bg-[#1E3BBD] text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Search .in Domains on Spaceship →
            </a>
          </div>

          {/* Setup Guide: Connecting to Vercel */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-xl font-bold">How to Link Any Custom Domain to Your Vercel Website</h2>
            <p className="text-xs text-blue-200 leading-relaxed">
              Vercel provides free automatic SSL certificates (HTTPS) and global edge CDN caching for any custom domain.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs text-blue-100/90 leading-relaxed">
              <li>Open your <strong>Vercel Dashboard</strong> ➔ Select your <code>commerce-job-board</code> (or NicheHire) project.</li>
              <li>Navigate to <strong>Settings</strong> ➔ <strong>Domains</strong>.</li>
              <li>Type your custom domain (e.g. <code>nichehire.in</code> or <code>www.nichehire.in</code>) and click <strong>Add</strong>.</li>
              <li>Vercel will show the required DNS record:
                <div className="bg-black/40 p-3 rounded-xl font-mono text-[11px] text-amber-300 my-2">
                  Type: CNAME &nbsp;|&nbsp; Name: www &nbsp;|&nbsp; Value: cname.vercel-dns.com<br/>
                  Type: A &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp; Name: @ &nbsp;&nbsp;|&nbsp; Value: 76.76.21.21
                </div>
              </li>
              <li>Log in to your domain registrar (Spaceship, Namecheap, or Cloudflare) and add those two records.</li>
              <li>Within 1–5 minutes, Vercel will verify the domain and issue a green "Valid Configuration" checkmark!</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
