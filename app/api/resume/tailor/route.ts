import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../supabase';
import { hasUnlimitedAccess, checkUsageLimit } from '../../../lib/premiumTierEngine';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

export async function POST(req: Request) {
  try {
    const { resumeText, jobTitle, company, jobDescription, userId } = await req.json();

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

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to tailor your resume.' },
        { status: 401 }
      );
    }

    // ─── Quota & Founder Access Enforcement ──────────────────────────────────
    // NOTE: Override is ALWAYS looked up server-side from database by userId, NEVER accepted from the request.
    let isUnlimited = false;
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_founder, tier')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: override } = await supabase
        .from('founder_overrides')
        .select('access_level')
        .eq('user_id', userId)
        .maybeSingle();

      isUnlimited = hasUnlimitedAccess(
        { isFounder: profile?.is_founder || false },
        override
      );

      if (!isUnlimited) {
        const nowMonth = new Date().toISOString().slice(0, 7) + '-01';
        const { data: usageRow } = await supabase
          .from('premium_usage')
          .select('tailored_resume_count')
          .eq('user_id', userId)
          .eq('period_start', nowMonth)
          .maybeSingle();

        const currentCount = usageRow?.tailored_resume_count || 0;
        const usage = checkUsageLimit(
          { isFounder: false, tier: profile?.tier || 'member' },
          'tailored_resume',
          currentCount,
          override
        );

        if (!usage.allowed) {
          return NextResponse.json(
            {
              error: 'Monthly limit reached (11/11 tailored resumes). Upgrade or earn referrals to unlock unlimited.',
              remaining: 0,
            },
            { status: 403 }
          );
        }
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

    if (userId && !isUnlimited) {
      const nowMonth = new Date().toISOString().slice(0, 7) + '-01';
      try {
        const { data: existingUsage } = await supabase
          .from('premium_usage')
          .select('tailored_resume_count')
          .eq('user_id', userId)
          .eq('period_start', nowMonth)
          .maybeSingle();

        const newCount = (existingUsage?.tailored_resume_count || 0) + 1;
        await supabase.from('premium_usage').upsert({
          user_id: userId,
          period_start: nowMonth,
          tailored_resume_count: newCount,
        });
      } catch (usageErr) {
        console.warn('Could not increment premium usage count:', usageErr);
      }
    }

    return NextResponse.json({ tailoredResume: tailored });
  } catch (error: any) {
    console.error('Resume tailoring failed:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to tailor resume. Please try again.' }, { status: 500 });
  }
}
