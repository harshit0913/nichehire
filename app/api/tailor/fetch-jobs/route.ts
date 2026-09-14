import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { jobTitle, jobTags, baseResume } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Missing Google API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `
      You are an elite Executive Resume Writer and ATS (Applicant Tracking System) optimization expert.
      
      Your client has provided their base resume details:
      """
      ${baseResume}
      """
      
      They are applying for the position of: "${jobTitle}"
      Associated job tags/context: ${JSON.stringify(jobTags || [])}
      
      Your task is to completely rewrite and optimize their resume specifically for this exact role. 
      
      Rules for the rewrite:
      1. Formatting: Output the result strictly in clean Markdown. Use # for the main header (Name), ## for sections, and bullet points for experience.
      2. Professional Summary: Write a compelling 3-sentence summary at the top that directly bridges their past experience with the requirements of a ${jobTitle}.
      3. Experience Bullets: Enhance their past experience bullet points. Keep them truthful, but emphasize transferable skills, leadership, and metrics that matter for a ${jobTitle}.
      4. Keyword Optimization: Naturally integrate industry-standard keywords related to this target role so it scores highly in ATS software.
      5. Tone: Highly professional, action-oriented, and confident.
      
      Do not include any conversational filler (e.g., "Here is your customized resume"). Output ONLY the markdown resume.
    `;

    const result = await model.generateContent(prompt);
    let tailoredResume = result.response.text().trim();

    return NextResponse.json({ tailoredResume });

  } catch (error: any) {
    console.error("Tailoring Error:", error.message || error);
    return NextResponse.json({ error: "Failed to generate tailored CV" }, { status: 500 });
  }
}