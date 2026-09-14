import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jobTitle, jobTags, baseResume } = await request.json();
    
    // Your exact, valid API key
   

    const prompt = `
      You are an expert Executive Recruiter and ATS (Applicant Tracking System) Optimizer.
      Your task is to rewrite the provided Base Resume to perfectly match the Job Title and Tags, guaranteeing an ATS score of 80 or higher.
      
      Job Title: ${jobTitle}
      Key Focus Areas: ${jobTags.join(', ')}
      
      Base Resume Context:
      ${baseResume}
      
      Instructions:
      1. Keep the candidate's actual job titles and employment dates entirely factual.
      2. Rewrite the bullet points to heavily emphasize skills that overlap with the targeted Job Title.
      3. Format the output in clean, readable text.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_API_KEY!
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google REST API Error:", data);
      return NextResponse.json({ error: data.error?.message || "API Request Failed" }, { status: response.status });
    }

    const tailoredResume = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ tailoredResume });
    
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error occurred" }, { status: 500 });
  }
}