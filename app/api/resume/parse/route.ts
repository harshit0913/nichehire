import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { resumeText, fileBase64, mimeType, fileName } = await req.json();

    if (!resumeText?.trim() && !fileBase64) {
      return NextResponse.json({ error: 'Please provide resume text or upload a file.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Gemini API key is missing.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let contentParts: any[] = [];
    let extractedText = resumeText || '';

    // Handle DOCX files using mammoth
    if (fileBase64 && (mimeType?.includes('word') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc'))) {
      try {
        const buffer = Buffer.from(fileBase64, 'base64');
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value || '';
        contentParts = [
          {
            text: `Extract candidate profile details from this resume text:
${extractedText.slice(0, 10000)}`
          }
        ];
      } catch (docxErr: any) {
        console.error('Docx extraction error:', docxErr);
        return NextResponse.json({ error: 'Could not extract text from the Word document.' }, { status: 400 });
      }
    } else if (fileBase64 && (mimeType === 'application/pdf' || fileName?.endsWith('.pdf'))) {
      // Gemini 1.5 Flash natively understands PDF files via inlineData
      contentParts = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileBase64,
          },
        },
        {
          text: `Extract candidate profile details from this resume document. Also provide a clean, complete plain text representation of the resume content in the "rawText" field.`
        }
      ];
    } else {
      // Plain text or fallback
      contentParts = [
        {
          text: `Extract candidate profile details from this resume text:
${extractedText.slice(0, 10000)}`
        }
      ];
    }

    const prompt = `
      Analyze the candidate resume and extract the key profile details.
      Return ONLY a valid raw JSON object — no markdown fences, no backticks, no preamble.
      Use EXACTLY this schema:

      {
        "name": "Candidate Full Name (e.g. Sanskriti Sharma)",
        "role": "Most relevant / target Job Title (e.g. Senior Frontend Engineer, Financial Analyst, Marketing Manager)",
        "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6", "Skill 7", "Skill 8"],
        "experienceLevel": "Entry | Mid | Senior | Lead | Executive",
        "location": "City, Country (e.g. Bangalore, India or New York, US) or 'Remote'",
        "summary": "Compelling 2-sentence executive summary of the candidate's background.",
        "rawText": "Complete plain text of the resume"
      }
    `;

    contentParts.push({ text: prompt });

    const result = await model.generateContent(contentParts);
    const raw = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(raw);

    // If mammoth already extracted text, ensure rawText is populated
    if (!parsed.rawText && extractedText) {
      parsed.rawText = extractedText;
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Resume parse error:', error.message || error);
    return NextResponse.json({ error: 'Failed to parse resume. Please try again.' }, { status: 500 });
  }
}
