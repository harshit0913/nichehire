import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Reads from GOOGLE_API_KEY (set in .env.local) or the optional GEMINI_API_KEY alias
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

const GEMINI_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = GEMINI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const { resumeText, jobTitle, company, jobDescription } = await req.json();

    if (!resumeText?.trim()) {
      return NextResponse.json({ error: 'Paste your resume text first.' }, { status: 400 });
    }
    if (!jobTitle) {
      return NextResponse.json({ error: 'Missing job title.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resume tailoring is not configured. Add GOOGLE_API_KEY in your Vercel environment variables.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.4 },
    });

    // Guardrail: only rephrase/reorder, never fabricate experience
    const prompt = `You are an expert executive resume writer and ATS optimization specialist.
Tailor the candidate's RESUME for the TARGET JOB below, staying 100% truthful to their actual experience.

Rules:
1. You may rephrase and reorder existing bullet points to highlight experience relevant to this role.
2. Incorporate ATS-friendly keywords from the job description naturally — only where the candidate genuinely has that experience.
3. Never invent employers, job titles, dates, metrics, tools, certifications, or skills that are not present in the original resume.
4. Write a 2–3 sentence Professional Summary at the top tailored to this specific role.
5. Keep the resume roughly the same overall length.
6. Output clean Markdown only (use ##  for section headers, - for bullets). No preamble, no "Here is your resume" text.

TARGET JOB
Title: ${jobTitle}
Company: ${company || 'Not specified'}
Description: ${(jobDescription || 'Not provided').slice(0, 800)}

CANDIDATE RESUME
${resumeText}`;

    const result = await model.generateContent(prompt);
    const tailored = result.response.text().trim();

    if (!tailored) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ tailoredResume: tailored });
  } catch (error: any) {
    console.error('Resume tailoring failed:', error.message || error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out — please try again.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to tailor resume. Please try again.' }, { status: 500 });
  }
}
