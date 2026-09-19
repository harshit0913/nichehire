import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();

    if (!resumeText?.trim()) {
      return NextResponse.json({ error: 'Resume text is required.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Gemini API key is missing.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Extract the most important profile details from this resume text.
      Return ONLY a valid raw JSON object — no markdown fences, no backticks, no explanation.
      Use EXACTLY these keys:

      {
        "name": "Full Name (usually the first line)",
        "role": "Current or most recent job title — this will be used to auto-search matching jobs",
        "skills": ["Up to 8 key technical or professional skills"],
        "experienceLevel": "Entry | Mid | Senior | Lead | Executive",
        "location": "City, Country or 'Remote' if not specified"
      }

      If any field cannot be determined, use an empty string or empty array.

      Resume text:
      ${resumeText.slice(0, 5000)}
    `;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Resume parse error:', error.message || error);
    return NextResponse.json({ error: 'Failed to parse resume. Please try again.' }, { status: 500 });
  }
}
