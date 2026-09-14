import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    
    // Explicitly using the model Google requested in the terminal
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `
      Extract the candidate's details from this resume text.
      Return ONLY a raw, flat JSON object. Do not include markdown formatting or backticks.
      Use EXACTLY these three keys: "name", "role", "location".
      The name is usually the very first line (e.g., "SANSKRITI SHARMA").
      If a field is missing, return an empty string "".
      
      Resume text:
      ${resumeText}
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    const parsedData = JSON.parse(text);
    return NextResponse.json(parsedData);
    
  } catch (error: any) {
    console.error("Parse Resume Error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to parse resume" }, { status: 500 });
  }
}