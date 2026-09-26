import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash'
];

// Fallback regex/rule-based extractor if LLM is unavailable (e.g. 503 temporary overload)
function fallbackExtract(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const name = lines[0] || 'Applicant';
  const role = lines[1] || 'Professional';

  const commonSkills = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'SQL',
    'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'Audit', 'Tax', 'GST',
    'Tally', 'Financial Modeling', 'Accounting', 'IFRS', 'Excel', 'Corporate Finance',
    'Marketing', 'SEO', 'Sales', 'Management', 'Project Management'
  ];

  const lower = text.toLowerCase();
  const foundSkills = commonSkills.filter(s => lower.includes(s.toLowerCase()));

  // Common education keywords
  let education = 'Bachelor\'s Degree';
  if (lower.includes('b.tech') || lower.includes('btech') || lower.includes('bachelor of technology') || lower.includes('computer science')) {
    education = 'B.Tech in Computer Science / Engineering';
  } else if (lower.includes('mba') || lower.includes('master of business')) {
    education = 'MBA';
  } else if (lower.includes('b.com') || lower.includes('bcom') || lower.includes('chartered accountant') || lower.includes('ca')) {
    education = 'B.Com / Accounting & Finance';
  } else if (lower.includes('master') || lower.includes('m.tech') || lower.includes('ms')) {
    education = 'Master\'s Degree';
  }

  // Experience estimate
  let yearsOfExperience = 2;
  const expMatch = lower.match(/(\d+)\+?\s*years?/);
  if (expMatch) {
    yearsOfExperience = parseInt(expMatch[1], 10) || 2;
  } else if (lower.includes('senior')) {
    yearsOfExperience = 5;
  } else if (lower.includes('lead')) {
    yearsOfExperience = 7;
  }

  const extracurricular: string[] = [];
  if (lower.includes('hackathon')) extracurricular.push('Hackathon Competitor');
  if (lower.includes('open source') || lower.includes('github')) extracurricular.push('Open Source Contributor');
  if (lower.includes('lead') || lower.includes('captain') || lower.includes('president') || lower.includes('founder')) extracurricular.push('Leadership & Community');
  if (lower.includes('certif')) extracurricular.push('Certified Professional');

  return {
    name,
    role,
    skills: foundSkills.length > 0 ? foundSkills.slice(0, 10) : ['Communication', 'Problem Solving', 'Management'],
    experienceLevel: lower.includes('senior') ? 'Senior' : lower.includes('lead') ? 'Lead' : 'Mid',
    yearsOfExperience,
    education,
    extracurricular: extracurricular.length > 0 ? extracurricular : ['Personal Portfolio & Projects'],
    location: lower.includes('india') ? 'India' : lower.includes('remote') ? 'Remote' : '',
    summary: `${name} is an experienced ${role} with expertise in ${foundSkills.slice(0, 3).join(', ') || 'their field'}.`,
    rawText: text
  };
}

export async function POST(req: Request) {
  let fallbackText = '';
  try {
    const { resumeText, fileBase64, mimeType, fileName } = await req.json();
    fallbackText = resumeText || '';

    // Enforce 5MB payload guard
    if (fileBase64 && fileBase64.length > 7_000_000) {
      return NextResponse.json({ error: 'File size exceeds maximum 5MB limit.' }, { status: 413 });
    }
    if (resumeText && resumeText.length > 500_000) {
      return NextResponse.json({ error: 'Resume text exceeds maximum limit.' }, { status: 413 });
    }

    if (!resumeText?.trim() && !fileBase64) {
      return NextResponse.json({ error: 'Please provide resume text or upload a file.' }, { status: 400 });
    }

    let extractedText = resumeText || '';

    // Handle DOCX files using mammoth
    if (fileBase64 && (mimeType?.includes('word') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc'))) {
      try {
        const buffer = Buffer.from(fileBase64, 'base64');
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value || '';
      } catch (docxErr: any) {
        console.error('Docx extraction error:', docxErr);
        return NextResponse.json({ error: 'Could not extract text from the Word document.' }, { status: 400 });
      }
    }

    if (!apiKey) {
      // Fallback if API key missing
      return NextResponse.json(fallbackExtract(extractedText));
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let contentParts: any[] = [];
    if (fileBase64 && (mimeType === 'application/pdf' || fileName?.endsWith('.pdf'))) {
      contentParts = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileBase64,
          },
        },
        {
          text: `Extract candidate profile details from this resume document. Also provide a clean plain text representation in the "rawText" field.`
        }
      ];
    } else {
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
        "role": "Most relevant / target Job Title (e.g. Senior Frontend Engineer, Chartered Accountant, Financial Analyst)",
        "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6", "Skill 7", "Skill 8", "Skill 9", "Skill 10"],
        "experienceLevel": "Entry | Mid | Senior | Lead | Executive",
        "yearsOfExperience": 3,
        "education": "Degree and Major (e.g. B.Tech Computer Science, MBA Finance, B.Com)",
        "extracurricular": ["Project / Leadership / Certification 1", "Project / Certification 2"],
        "location": "City, Country (e.g. Bangalore, India or New York, US) or 'Remote'",
        "summary": "Compelling 2-sentence executive summary of the candidate's background.",
        "rawText": "Complete plain text of the resume"
      }
    `;

    contentParts.push({ text: prompt });

    // Try models with automatic fallback
    let rawResponse = '';
    let lastErr: any = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contentParts);
        rawResponse = result.response.text();
        if (rawResponse) break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed during parse:`, err.message?.slice(0, 100));
        lastErr = err;
      }
    }

    if (!rawResponse) {
      console.warn('All AI models failed, using intelligent rule-based fallback parser.');
      return NextResponse.json(fallbackExtract(extractedText));
    }

    const firstBrace = rawResponse.indexOf('{');
    const lastBrace = rawResponse.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      return NextResponse.json(fallbackExtract(extractedText));
    }

    const cleanJson = rawResponse.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleanJson);

    if (!parsed.rawText && extractedText) {
      parsed.rawText = extractedText;
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Resume parse caught error:', error.message || error);
    // Even in case of unexpected exception, fallback gracefully
    const fallback = fallbackExtract(fallbackText);
    return NextResponse.json(fallback);
  }
}
