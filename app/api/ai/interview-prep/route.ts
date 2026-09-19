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

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title is required.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      You are an executive interview coach.
      Prepare the candidate for an upcoming interview for this position.

      TARGET ROLE:
      Title: ${jobTitle}
      Company: ${company || 'Target Employer'}
      Description: ${(jobDescription || 'Standard requirements for this position.').slice(0, 800)}

      CANDIDATE RESUME:
      ${resumeText ? resumeText.slice(0, 3000) : 'Experienced applicant.'}

      GENERATE A STRUCTURED INTERVIEW PREPARATION KIT:
      Return ONLY a raw JSON object (no markdown fences, no backticks, no preamble):
      {
        "technicalQuestions": [
          {
            "question": "Realistic technical or role-specific question",
            "modelAnswer": "Clear, impressive model answer referencing candidate skills and industry best practices."
          },
          {
            "question": "Second technical question",
            "modelAnswer": "Model answer."
          },
          {
            "question": "Third technical question",
            "modelAnswer": "Model answer."
          }
        ],
        "behavioralQuestions": [
          {
            "question": "Situational or behavioral question (e.g. Tell me about a time you solved a critical challenge)",
            "starAnswer": "Situation, Task, Action, Result structured answer highlighting measurable impact."
          },
          {
            "question": "Second behavioral question",
            "starAnswer": "STAR model answer."
          }
        ],
        "reverseInterviewQuestions": [
          "Thoughtful, strategic question 1 for the candidate to ask the interviewer",
          "Thoughtful, strategic question 2 for the candidate to ask the interviewer",
          "Thoughtful, strategic question 3 for the candidate to ask the interviewer"
        ]
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
      throw lastError || new Error('Failed to generate interview prep.');
    }

    const firstBrace = rawResponse.indexOf('{');
    const lastBrace = rawResponse.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Invalid response format from AI.');
    }

    const parsed = JSON.parse(rawResponse.substring(firstBrace, lastBrace + 1));
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Interview prep generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate interview prep.' }, { status: 500 });
  }
}
