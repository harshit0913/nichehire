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

    const prompt = `You are an elite human resume consultant and career coach.
Your job is to rewrite and tailor the candidate's RESUME for the TARGET JOB below in a natural, 100% humanized voice that completely avoids AI-generated cadence, AI cliches, and robotic boilerplate.

CRITICAL OBJECTIVE: The output MUST read as if written by an articulate, experienced human engineer/professional. It must pass all AI detectors (ZeroGPT, Turnitin, GPTZero, CopyLeaks) with 0% AI detection probability.

HUMANIZATION & ANTI-DETECTION RULES:
1. STRICT BLACKLIST OF AI TRIGGER WORDS (NEVER USE ANY OF THESE):
   - DO NOT USE: "spearheaded", "orchestrated", "synergized", "leveraged", "pivotal", "delved", "testament", "tapestry", "seamlessly", "cutting-edge", "game-changing", "fostered a culture", "proven track record", "results-driven", "seasoned professional", "adept at", "harnessed", "utilized", "instrumental in", "navigated the complexities", "dynamic landscape".
2. NATURAL HUMAN VOCABULARY:
   - Use straightforward, grounded action verbs: "Built", "Shipped", "Designed", "Wrote", "Led", "Automated", "Fixed", "Debugged", "Reduced", "Cut", "Scaled", "Managed", "Collaborated with", "Maintained", "Refactored", "Deployed".
3. HIGH BURSTINESS & VARIED SENTENCE CADENCE:
   - Vary bullet lengths naturally. Mix punchy 8-word impact statements with 20-word contextual technical explanations. Real humans do not write identical 14-word bullet templates.
4. 100% FACTUAL HONESTY & PLAGIARISM RESISTANCE:
   - Never fabricate employers, degrees, dates, tools, certifications, or metrics not already in the candidate's resume.
   - Weave target keywords into existing achievements ONLY where the candidate genuinely performed that work.
   - Do not copy-paste chunks of the job description verbatim. Rephrase naturally into the candidate's real context.
5. GROUNDED PROFESSIONAL SUMMARY:
   - Write a 2-3 sentence grounded summary. Speak plainly about actual technical strengths and target alignment. Zero marketing fluff.
6. FORMAT:
   - Output clean Markdown only (## for sections, - for bullets).
   - No conversational preamble, no "Here is your tailored resume:", no explanatory notes.

TARGET JOB
Title: ${jobTitle}
Company: ${company || 'Not specified'}
Description: ${(jobDescription || 'Not provided').slice(0, 1000)}

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
