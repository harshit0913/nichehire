import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { hasUnlimitedAccess, checkUsageLimit } from '../../../lib/premiumTierEngine';
import { flagPotentialFabrications, validateOneToOneMapping } from '../../../lib/resumeFactCheck';
import { BulletDiffReview, StrengthenQuestion } from '../../../types/resumeBuilder';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { userId, mode, bullets, userAnswers } = await req.json();

    if (!userId || !Array.isArray(bullets) || bullets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and bullets array are required.' },
        { status: 400 }
      );
    }

    if (!['polish', 'strengthen'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "polish" or "strengthen".' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Editing is not configured. Add GOOGLE_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    // 1. Quota Check & Founder Bypass
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

    const isUnlimited = hasUnlimitedAccess(
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
            error: 'Monthly AI resume quota reached (11/11 actions used). Upgrade to unlock unlimited actions.',
            remaining: 0,
          },
          { status: 403 }
        );
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.2 }, // Low temperature for adherence to facts
    });

    // ─── Mode 1: Polish (Reword only, strict 1:1, zero new facts) ───────────
    if (mode === 'polish') {
      const prompt = `You are a professional executive resume editor.
CRITICAL CONSTRAINT: You must reword for grammar, brevity, and strong active verbs ONLY.
ABSOLUTELY FORBIDDEN:
1. Do NOT invent, add, or alter any numbers, percentages, metrics, or currency amounts.
2. Do NOT add new job titles, employers, certifications, dates, or technical skills not in the input.
3. Output MUST have EXACTLY one rewritten bullet per input bullet. Do NOT merge or split bullets.

INPUT BULLETS (One per line):
${bullets.map((b: string, i: number) => `[${i + 1}] ${b}`).join('\n')}

OUTPUT FORMAT:
Return JSON only in this schema:
{"rewritten": ["rewritten bullet 1", "rewritten bullet 2", ...]}`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response could not be parsed. Please retry.');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rewrittenList: string[] = parsed.rewritten || [];

      // Validate 1:1 mapping
      if (!validateOneToOneMapping(bullets, rewrittenList)) {
        // Fallback: If lengths mismatch, return original bullets
        return NextResponse.json({
          reviews: bullets.map((orig: string) => ({
            originalBullet: orig,
            rewrittenBullet: orig,
            flaggedFabrications: [],
            status: 'pending',
          })),
        });
      }

      // Run automated fact-check heuristic on every bullet pair
      const reviews: BulletDiffReview[] = bullets.map((orig: string, idx: number) => {
        const rewritten = rewrittenList[idx] || orig;
        const flagged = flagPotentialFabrications(orig, rewritten);
        return {
          originalBullet: orig,
          rewrittenBullet: rewritten,
          flaggedFabrications: flagged,
          status: 'pending',
        };
      });

      return NextResponse.json({ reviews });
    }

    // ─── Mode 2: Strengthen (Flags vagueness, asks user — never invents) ────
    if (mode === 'strengthen') {
      // If userAnswers are supplied, incorporate them into polished bullets
      if (userAnswers && Array.isArray(userAnswers) && userAnswers.length > 0) {
        const mergePrompt = `You are an executive resume editor.
Incorporate the user's specific answers into their respective resume bullets, while maintaining executive action-verb tone.
Do NOT invent any metrics that the user did not specify.

BULLETS & USER ANSWERS:
${bullets.map((b: string, i: number) => {
  const ans = userAnswers.find((a: any) => a.bulletIndex === i);
  return `Bullet ${i + 1}: ${b}\nUser Answer: ${ans?.answer || 'Skipped / No extra detail provided'}`;
}).join('\n\n')}

OUTPUT FORMAT:
Return JSON only:
{"rewritten": ["bullet 1", "bullet 2", ...]}`;

        const res = await model.generateContent(mergePrompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { rewritten: bullets };
        const rewrittenList: string[] = parsed.rewritten || bullets;

        const reviews: BulletDiffReview[] = bullets.map((orig: string, idx: number) => {
          const rewritten = rewrittenList[idx] || orig;
          const flagged = flagPotentialFabrications(orig, rewritten);
          return {
            originalBullet: orig,
            rewrittenBullet: rewritten,
            flaggedFabrications: flagged,
            status: 'pending',
          };
        });

        return NextResponse.json({ reviews });
      }

      // Otherwise, scan each bullet and generate targeted questions for vague/unquantified bullets
      const scanPrompt = `You are an expert career coach.
Analyze these resume bullets. For bullets that are vague, lack quantifiable metrics, or lack concrete outcomes, generate ONE targeted question asking the user for missing specifics (e.g. roughly what percentage, team size, or frequency).
If a bullet is already strong and quantified, return null for the question.

BULLETS:
${bullets.map((b: string, i: number) => `[${i}] ${b}`).join('\n')}

OUTPUT FORMAT:
Return JSON only:
{"questions": [{"bulletIndex": 0, "question": "Roughly how much faster did deployment become?"}]}`;

      const res = await model.generateContent(scanPrompt);
      const text = res.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };

      const questions: StrengthenQuestion[] = (parsed.questions || [])
        .filter((q: any) => q.question && typeof q.bulletIndex === 'number')
        .map((q: any) => ({
          bulletIndex: q.bulletIndex,
          originalBullet: bullets[q.bulletIndex] || '',
          question: q.question,
        }));

      return NextResponse.json({ questions });
    }

    return NextResponse.json({ error: 'Unsupported mode' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI resume editing failed.' },
      { status: 500 }
    );
  }
}
