import { NextResponse } from 'next/server';

// Save this file as: app/api/resume/tailor/route.ts

const GEMINI_TIMEOUT_MS = 25000;
// Change this if your API key doesn't have access to this model — e.g. "gemini-2.5-flash"
const GEMINI_MODEL = 'gemini-2.5-flash';

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

    if (!resumeText || !resumeText.trim()) {
      return NextResponse.json({ error: 'Paste your resume text first.' }, { status: 400 });
    }
    if (!jobTitle) {
      return NextResponse.json({ error: 'Missing job title.' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Resume tailoring is not configured. Add GEMINI_API_KEY in your Vercel environment variables.' },
        { status: 500 }
      );
    }

    // Guardrail: instructed to reorganize/rephrase only, never invent experience.
    // This matters — a "tailored" resume that fabricates skills gets candidates disqualified,
    // or gets them into interviews they can't actually pass.
    const prompt = `You are a professional resume editor. Rewrite the RESUME below so it is tailored to the JOB TARGET, while staying 100% truthful to the candidate's real experience.

Rules:
- You may reorder and rephrase existing bullet points to foreground experience relevant to this job.
- You may mirror language and keywords from the job description, but only where the candidate genuinely already has that experience in the original resume.
- Never invent employers, job titles, dates, metrics, tools, or skills that are not already present in the original resume.
- Keep the resume roughly the same overall length as the original.
- Output ONLY the rewritten resume text. No preamble, no explanation, no markdown headers like "Tailored Resume:".

JOB TARGET
Title: ${jobTitle}
Company: ${company || 'Not specified'}
Description: ${jobDescription || 'Not provided'}

RESUME
${resumeText}`;

    const geminiRes = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return NextResponse.json(
        { error: `Resume tailoring failed (Gemini returned ${geminiRes.status}). Check your GEMINI_API_KEY and model name.` },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const tailored =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';

    if (!tailored.trim()) {
      return NextResponse.json({ error: 'The AI returned an empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ tailoredResume: tailored.trim() });
  } catch (error) {
    console.error('Resume tailoring failed:', error);
    return NextResponse.json({ error: 'Failed to tailor resume. Please try again.' }, { status: 500 });
  }
}