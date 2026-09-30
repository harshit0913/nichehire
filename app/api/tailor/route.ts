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
    // Humanized, anti-AI-detector prompt to avoid generic robotic tropes
    const prompt = `You are an elite human resume consultant and career coach.
Your job is to rewrite and tailor the candidate's RESUME for the TARGET JOB below in a natural, 100% humanized voice that completely avoids AI-generated cadence, AI cliches, and robotic boilerplate.

CRITICAL OBJECTIVE: The output MUST read as if written by an articulate, experienced human engineer/professional. It must pass all AI detectors (ZeroGPT, Turnitin, GPTZero, CopyLeaks) with 0% AI detection probability.

HUMANIZATION & ANTI-DETECTION RULES:
1. STRICT BLACKLIST OF AI TRIGGER WORDS (NEVER USE ANY OF THESE):
   - DO NOT USE: "spearheaded", "orchestrated", "synergized", "leveraged", "pivotal", "delved", "testament", "tapestry", "seamlessly", "cutting-edge", "game-changing", "fostered a culture", "proven track record", "results-driven", "seasoned professional", "adept at", "harnessed", "utilized", "instrumental in", "navigated the complexities", "dynamic landscape".
2. NATURAL HUMAN VOCABULARY:
   - Use straightforward, grounded action verbs: "Built", "Shipped", "Designed", "Wrote", "Led", "Automated", "Fixed", "Debugged", "Reduced", "Cut", "Scaled", "Managed", "Collaborated with", "Maintained", "Refactored", "Deployed".
3. HIGH BURSTINESS & VARIED SENTENCE CADENCE:
   - Vary bullet lengths naturally. Mix punchy 8-word impact statements with 20-word contextual technical explanations. Real humans do not write identical 14-word bullet templates.
4. 100% FACTUAL HONESTY & PLAGIARISM RESISTANCE:
   - Never fabricate employers, degrees, dates, tools, certifications, or metrics not already in the candidate's resume.
   - Weave target keywords into existing achievements ONLY where the candidate genuinely performed that work.
   - Do not copy-paste chunks of the job description verbatim. Rephrase naturally into the candidate's real context.
5. GROUNDED PROFESSIONAL SUMMARY:
   - Write a 2-3 sentence grounded summary. Speak plainly about actual technical strengths and target alignment. Zero marketing fluff.
6. FORMAT:
   - Output clean Markdown only (## for sections, - for bullets).
   - No conversational preamble, no "Here is your tailored resume:", no explanatory notes.

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