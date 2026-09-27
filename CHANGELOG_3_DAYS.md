# NicheHire — 3-Day Platform Evolution & Detailed Changelog
**Reporting Period:** September 24, 2026 – September 27, 2026  
**Platform URL:** [https://nichehire-psi.vercel.app](https://nichehire-psi.vercel.app)  
**Author:** NicheHire Core Product & Engineering Team  

---

## Executive Summary: Then vs. Now

| Capability | 3 Days Ago (Sept 24 Baseline) | Today (Sept 27 Current State) |
| :--- | :--- | :--- |
| **Target Audience & Fields** | Strictly Tech / Software roles only | **Multi-Disciplinary**: Commerce (CA/CMA), Law, Arts, MBA Ops, Tech & Govt Jobs |
| **Candidate Privacy & Layout** | Cluttered main page with exposed bookmarks | **Private Sliding Drawer** (`Hi, [Name]` toggle with Saved, Applied & Resume) |
| **Employer Control & Override** | Read-only job cards; no edit or cancel option | **Full Override & Cancel**: Edit title/salary/URL or cancel listing instantly |
| **Job Posting Gates** | Unauthenticated posting; mock submissions | **Strict Gates**: Corporate login + Active Membership quota required |
| **Employer Pricing Model** | Unused ₹15,000+ retainers or placeholder prices | **Transparent 4-Tier**: Free (10d), ₹299 (14d), ₹599 (21d), ₹999 (30d) |
| **Membership & Expiry Alerts** | No expiry tracking; postings had no timer | **Color-Coded Alert System** with real-time countdowns for recruiters & candidates |
| **Mobile Security** | No phone verification (plain unvalidated text) | **Real 6-Digit OTP Verification** via `/api/auth/otp/send` & `/api/auth/otp/verify` |
| **Resume Handling** | Raw markdown editor; no file upload | **PDF/DOCX Resume Auto-Fill** (`/api/resume/parse`) + 1-Click ATS PDF Builder |
| **Government Sector** | Zero public sector or exam listings | **Revamped Govt Jobs Portal** with Banking, UPSC, SSC, Railways & State PSCs |
| **Walk-In Drives** | None | **Walk-In Section** in search bar + community walk-in posting modal |
| **Regional Search Breadth** | < 10 jobs in tier 2/3 cities; 0 state jobs | **5-Tier Proximity Engine** with state-level expansion (10x–20x job volume) |
| **Platform Integrity** | Mock applicant numbers & fake review avatars | **Zero Fake Data Guarantee**: Real applicants only + Founder UTR Verification |
| **Icon & Visual System** | Inconsistent mix of emojis and mismatched icons | **Standardized Lucide Icon Barrel** (uniform size & 1.75 stroke width) |

---

## Part 1: Baseline State (3 Days Ago — Prior to Sept 25, 2026)

Three days ago, NicheHire was an early-stage job board prototype with several structural limitations:

1. **Tech-Only Focus**: The application exclusively scraped and searched tech roles (Software Engineer, Frontend, Backend). Students with Arts, Commerce, Law, or MBA degrees received zero relevant recommendations.
2. **Aggregator & Ghost Job Pollution**: Job search returned links pointing to middleman aggregator sites (Naukri, Indeed) with dead URLs, expired postings, and opaque applicant forms.
3. **Cluttered Homepage**: Saved jobs and applications were displayed on the main landing page, creating visual clutter and privacy issues for candidates on shared devices.
4. **No Recruiter Governance**: The employer section was a mock prototype. Recruiters had no ability to edit or cancel job postings once submitted, and anyone could click "+ Post a Job" without logging in.
5. **No Mobile Verification**: Phone numbers were captured as unvalidated strings with no OTP security, leaving the platform vulnerable to spam.
6. **Complex Resume Builder**: The resume builder was overly complex with multi-column markdown fields that failed to generate clean printable PDFs.
7. **Severe Regional Thinness**: Searching in non-metro locations (e.g. Nainital, Gangtok, Kozhikode) returned fewer than 10 jobs, with 0 state-level or district-level jobs.

---

## Part 2: Day 1 Changes (September 25, 2026)
*Key Commit Range: `18edc0e` → `7505e82`*

### 1. Direct Portal Linking & Anti-Aggregator Architecture
* **Direct ATS & Portal Scrapers**: Integrated direct scrapers for Greenhouse, Lever, Yash Technologies, and official corporate career sites (Google, Microsoft, Amazon, Stripe).
* **Strict 7-Day Cutoff**: Implemented automated filtering to purge ghost listings older than 7 days, guaranteeing fresh openings.
* **On-Demand Job Details Enrichment**: Built `/api/jobs/details` to fetch clean, full job descriptions dynamically without third-party aggregator redirects.

### 2. Recruiter Cold Email & HR Outreach
* **Automated HR Contact Discovery**: Added recruiter email discovery and prefill in the outreach modal.
* **AI Outreach Pitch Generator**: Integrated AI draft generation matching candidate skills to specific job requirements.

### 3. "Signal-vs-Noise" Editorial Design System
* **Typography**: Paired Inter (clean sans-serif UI) with Newsreader (editorial serif headlines).
* **Hairstyled Cards**: Replaced clunky drop-shadow cards with clean hairline borders (`border-[#E4E7EC]`).
* **SEO Foundation**: Added server-side rendered Schema.org `JobPosting` JSON-LD microdata for Google for Jobs indexing, and launched `/about` and `/pricing`.

---

## Part 3: Day 2 Changes (September 26, 2026)
*Key Commit Range: `89c8685` → `b49780c`*

### 1. Government Jobs & Exams Engine (`/govt-exams`)
* **Interactive Exam Calendar**: Built an exam discovery portal tracking notifications, application deadlines, and salary pay scales.
* **Stream-Specific Categorization**: Added dedicated tracks for Commerce (ICAI CA/CMA), Management (BBA/MBA), UPSC, SSC, Railways, and State PSCs.
* **Offline Geolocation**: Added local proximity matching to highlight state-specific public sector jobs.

### 2. Founder Admin Command Center & Direct UPI Payments
* **Admin Workspace (`/admin`)**: Built a secure panel for the platform founder to review employer payment proofs, verify 12-digit UTR codes, and audit recruiter listings.
* **Direct Bank UPI (`harshit0913@slc`)**: Bypassed expensive gateway fees (Razorpay/Stripe) by offering 0% platform surcharge bank UPI payments with instant QR code generation.

### 3. Total Purge of Fake Data
* **Zero Fake Data Mandate**: Completely removed mock applicant counters, fake candidate profiles, and simulated recruiter reviews.
* **Payment Screenshot Upload**: Added file attachment for UPI payment receipts with real-time preview and client-side 5MB compression checks.

### 4. Candidate Referral Ladder & AI Career Guidance
* **Referral Progression**: Implemented 4 tiers: Free Member, Rising Tier (10 referrals), Trusted Tier (50 referrals), and Premium Tier (100 referrals or ₹199/month).
* **AI Career Strategy Report**: Built `CareerGuidanceModal.tsx` to generate multi-page career roadmaps and role recommendations.

---

## Part 4: Day 3 Changes (September 27, 2026)
*Key Commit Range: `add61e1` → `2e00fe7`*

### 1. Multi-Disciplinary Taxonomy & Geographic Expansion
* **Multi-Disciplinary Engine**: Expanded search coverage to non-tech fields:
  * **Commerce**: CA/CMA Articleship, B.Com Accounts Executive, Financial Analyst.
  * **Law**: High Court Clerkships, Legal Internships (Nainital/Uttarakhand and Pan-India).
  * **Management**: BBA/MBA Supply Chain, Logistics, Operations Manager (Sikkim & Pan-India).
  * **Arts & Media**: BA Content Writing, Digital Marketing, Journalism.
  * **Healthcare**: Medical Officers, Clinical Associates.
* **5-Tier Proximity Hierarchy**: Local Area (\(\le 10\text{ km}\)) \(\rightarrow\) District (\(\le 25\text{ km}\)) \(\rightarrow\) State (\(\le 100\text{ km}\)) \(\rightarrow\) Pan-India \(\rightarrow\) Remote.
* **State-Level Expansion**: Implemented parallel query expansion and adaptive freshness fallback to increase regional search volume by 10x–20x.

### 2. Candidate Private Side Drawer & Profile Auto-Fill
* **Sliding Drawer (`CandidateSideDrawer.tsx`)**: Removed all saved and applied job lists from the public home screen. Users access their private dashboard via a clean `Hi, [Name]` header toggle.
* **Resume Upload & AI Parsing**: Added PDF/DOCX file upload to automatically extract and populate candidate profile fields (Name, Headline, Location, Degree, Skills, Summary) via `/api/resume/parse`.
* **Simple ATS Resume Builder (`ResumeBuilderModal.tsx`)**: Replaced the previous complex editor with a 1-click ATS resume creator that produces formatted, printable PDFs.
* **Interactive Website Tour (`WebsiteTour.tsx`)**: Guided walkthrough for new candidates explaining search, resume tools, and private drawer features.

### 3. Employer Workspace Overhaul
* **Job Override & Cancel**:
  * Added **"Edit / Override"** modal to modify title, company, description, salary, location, work mode, and application link.
  * Added **"Cancel Listing"** action to close jobs immediately while retaining applicant records.
  * Real-time status badges: `ACTIVE`, `PAUSED`, `CLOSED / CANCELLED`.
* **Strict Auth & Membership Gate**: Blocked unauthenticated posting. Employers must log in and have available membership slots.
* **Transparent 4-Tier Pricing**:
  * **Free Starter**: 1st listing free for **10 days** (₹0).
  * **Growth Plan**: 2 jobs for **14 days** at **₹299**.
  * **Pro Recruiter**: 5 jobs for **21 days** at **₹599** (Recommended).
  * **Enterprise Tier**: 20 jobs for **30 days** at **₹999**.
* **Countdown Alert System**:
  * Employer dashboard banner showing active plan, days left, and used slots (`X / Y Jobs Used`).
  * Job card badges showing remaining listing validity (`⏱️ X Days Left` or `Expired`).
  * Candidate drawer banner showing days left in the monthly quota cycle.
* **Domain Guide Removal**: Removed domain setup guides and buttons from the Employer Workspace.

### 4. Mobile Phone OTP Verification System
* **OTP Store (`otpStore.ts`)**: Built in-memory store with phone normalization, rate limiting, and 5-minute expiry.
* **API Endpoints**: `POST /api/auth/otp/send` and `POST /api/auth/otp/verify`.
* **Phone OTP Component (`PhoneOtpVerification.tsx`)**: Country code selector, 6-digit input, 30s resend cooldown, and `✓ Mobile Verified` shield badge.
* **Integrated**: Added to Candidate Profile, Candidate Side Drawer, and Employer Profile.

### 5. Icon System Standardization
* **Unified Lucide Barrel (`app/components/icons/index.ts`)**: Replaced all emojis and inconsistent icons across the entire site with standardized Lucide React icons using uniform sizes and stroke widths (\(1.75\)).

---

## Summary of All Direct Page Links

1. **Home / Job Search**: [https://nichehire-psi.vercel.app/](https://nichehire-psi.vercel.app/)
2. **Employer Workspace**: [https://nichehire-psi.vercel.app/employer/dashboard](https://nichehire-psi.vercel.app/employer/dashboard)
3. **Employer Pricing**: [https://nichehire-psi.vercel.app/pricing](https://nichehire-psi.vercel.app/pricing)
4. **Candidate Dashboard**: [https://nichehire-psi.vercel.app/dashboard](https://nichehire-psi.vercel.app/dashboard)
5. **Government Jobs**: [https://nichehire-psi.vercel.app/govt-exams](https://nichehire-psi.vercel.app/govt-exams)
6. **Founder Admin**: [https://nichehire-psi.vercel.app/admin](https://nichehire-psi.vercel.app/admin)
7. **About & Trust**: [https://nichehire-psi.vercel.app/about](https://nichehire-psi.vercel.app/about)
8. **Privacy Policy**: [https://nichehire-psi.vercel.app/privacy](https://nichehire-psi.vercel.app/privacy)
9. **Terms of Service**: [https://nichehire-psi.vercel.app/terms](https://nichehire-psi.vercel.app/terms)
