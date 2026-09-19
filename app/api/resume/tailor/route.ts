import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash'
];

export async function POST(req: Request) {
  try {
    const { resumeText, jobTitle, company, jobDescription } = await req.json();

    if (!resumeText?.trim()) {
      return NextResponse.json({ error: 'Paste or upload your resume first.' }, { status: 400 });
    }
    if (!jobTitle) {
      return NextResponse.json({ error: 'Missing job title.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resume tailoring is not configured. Add GOOGLE_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are an expert executive resume writer and ATS optimization specialist.
Tailor the candidate's RESUME for the TARGET JOB below, staying 100% truthful to their actual experience.

Rules:
1. You may rephrase and reorder existing bullet points to highlight experience relevant to this role.
2. Incorporate ATS-friendly keywords from the job description naturally — only where the candidate genuinely has that experience.
3. Never invent employers, job titles, dates, metrics, tools, certifications, or skills that are not present in the original resume.
4. Write a 2–3 sentence Professional Summary at the top tailored to this specific role.
5. Keep the resume roughly the same overall length.
6. Output clean Markdown only (use ## for section headers, - for bullets). No preamble, no "Here is your resume" text.

TARGET JOB
Title: ${jobTitle}
Company: ${company || 'Not specified'}
Description: ${(jobDescription || 'Not provided').slice(0, 800)}

CANDIDATE RESUME
${resumeText}`;

    let tailored = '';
    let lastError: any = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.4 },
        });
        const result = await model.generateContent(prompt);
        tailored = result.response.text().trim();
        if (tailored) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed during tailor:`, err.message?.slice(0, 100));
        lastError = err;
      }
    }

    if (!tailored) {
      throw lastError || new Error('All AI models failed to generate tailored resume.');
    }

    return NextResponse.json({ tailoredResume: tailored });
  } catch (error: any) {
    console.error('Resume tailoring failed:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to tailor resume. Please try again.' }, { status: 500 });
  }
}
