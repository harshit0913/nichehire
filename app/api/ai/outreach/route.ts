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
    const { resumeText, jobTitle, company, recipientName } = await req.json();

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      You are an expert executive recruiter and career strategist.
      Write a compelling, high-converting cold outreach email / LinkedIn message from the candidate to the hiring manager or recruiter.

      CANDIDATE RESUME SUMMARY:
      ${resumeText ? resumeText.slice(0, 3000) : 'Experienced applicant with relevant skills.'}

      TARGET POSITION:
      Title: ${jobTitle}
      Company: ${company || 'Target Company'}
      Recipient: ${recipientName || 'Hiring Manager'}

      OUTPUT REQUIREMENTS:
      Return ONLY a raw JSON object (no markdown fences, no backticks, no preamble):
      {
        "subject": "Clear, compelling subject line (e.g. Application: [Job Title] - [Candidate Name] / Why my background fits [Company])",
        "body": "A polished 3-paragraph outreach pitch: \nParagraph 1: Enthusiastic hook connecting the candidate's background to this specific role.\nParagraph 2: 2-3 specific achievements or skills from their resume that directly solve the company's needs.\nParagraph 3: Confident, polite call-to-action requesting a brief 15-minute introductory conversation.",
        "inMailVersion": "A punchier, 150-word version optimized specifically for a direct LinkedIn message."
      }
    `;

    let rawResponse = '';
    let lastError = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        rawResponse = result.response.text();
        if (rawResponse) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!rawResponse) {
      throw lastError || new Error('Failed to generate outreach email.');
    }

    const firstBrace = rawResponse.indexOf('{');
    const lastBrace = rawResponse.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Invalid response format from AI.');
    }

    const parsed = JSON.parse(rawResponse.substring(firstBrace, lastBrace + 1));
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Outreach generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to draft outreach email.' }, { status: 500 });
  }
}
