import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase';
import { hasUnlimitedAccess } from '../../../lib/premiumTierEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { userId, goals, targetSector, resumeText, freeText } = await req.json();

    if (!userId || !goals || !targetSector) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, goals, and targetSector are required.' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Career guidance AI is not configured. Add GOOGLE_API_KEY to environment.' },
        { status: 500 }
      );
    }

    // 1. Check Access / Credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_founder')
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

    let creditRecord: any = null;

    if (!isUnlimited) {
      // Must have remaining paid credits
      const { data: credits, error: creditErr } = await supabase
        .from('career_report_credits')
        .select('*')
        .eq('user_id', userId)
        .gt('credits_remaining', 0)
        .order('purchased_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (creditErr || !credits) {
        return NextResponse.json(
          {
            error: 'No remaining career report credits. Please purchase a report or consultation bundle.',
            requiresPayment: true,
          },
          { status: 402 }
        );
      }
      creditRecord = credits;
    }

    // 2. Generate Structured Report with Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a premier senior career strategist and public/private employment advisor in India.
Generate a comprehensive, highly customized AI Career Guidance Report for the candidate below.

CANDIDATE INTAKE:
- Target Sector: ${targetSector === 'govt' ? 'Government & Public Sector (UPSC, State PSC, SSC, Banking, PSUs)' : targetSector === 'private' ? 'Private Sector (Tech, Product, Startups, High-Growth)' : 'Undecided / Comparing Options'}
- Stated Goals: ${goals}
- Candidate Resume/Background: ${resumeText ? resumeText.slice(0, 1500) : 'Not provided (based on goals only)'}
- Additional Context: ${freeText || 'None'}

REPORT FORMAT (Clean Markdown):
# Comprehensive Strategic Career Trajectory Report

## 1. Executive Summary & Candidate Positioning
2-3 paragraphs analyzing their background, career leverage points, and immediate market viability.

## 2. Recommended Strategic Paths & Options
Provide 2-3 distinct actionable paths (e.g. Path A: Primary track; Path B: Backup or parallel track). For each:
- **Rationale**: Why their profile fits.
- **Specific Openings / Exams**: Name exact exams (e.g. SSC CGL, BPSC, RRB) or industry roles (e.g. Full-Stack Engineer, Product Analyst).
- **Realistic Timeline**: Preparation and hiring cycles.

## 3. Skill & Credential Gap Analysis
- **Strengths**: Concrete assets they possess today.
- **Critical Gaps**: Certifications, projects, or exam syllabi they must master.

## 4. 90-Day Actionable Milestone Plan
Specific steps for Month 1, Month 2, and Month 3.

## 5. Advisory Disclaimer
*Career guidance is informational and does not guarantee employment or exam outcomes.*`;

    const result = await model.generateContent(prompt);
    const reportContent = result.response.text().trim();

    if (!reportContent) {
      throw new Error('AI generated an empty response. Please retry.');
    }

    // 3. Save Report in Supabase
    const { data: savedReport, error: saveErr } = await supabase
      .from('career_reports')
      .insert([
        {
          user_id: userId,
          intake_goals: goals,
          target_sector: targetSector,
          intake_text: freeText || null,
          report_content: reportContent,
          human_follow_up_booked: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (saveErr) {
      throw saveErr;
    }

    // 4. Decrement Credit ONLY on successful save (if not unlimited)
    if (!isUnlimited && creditRecord) {
      await supabase
        .from('career_report_credits')
        .update({ credits_remaining: creditRecord.credits_remaining - 1 })
        .eq('id', creditRecord.id);
    }

    return NextResponse.json({
      success: true,
      report: savedReport,
      isUnlimited,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate career guidance report' },
      { status: 500 }
    );
  }
}
