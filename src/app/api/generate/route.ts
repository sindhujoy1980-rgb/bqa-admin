import { NextRequest, NextResponse } from 'next/server';
import { generateDailyQuestions, saveQuestions } from '@/lib/gemini';
import { getSessionAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const quizDate = body.date || new Date().toISOString().split('T')[0];

  // Check if questions already exist
  const { data: existing } = await supabaseAdmin
    .from('questions')
    .select('id')
    .eq('quiz_date', quizDate);

  if (existing && existing.length >= 3 && !body.force) {
    return NextResponse.json({
      error: `Questions already exist for ${quizDate}. Send { force: true } to regenerate.`,
    }, { status: 409 });
  }

  // Fetch Gemini API key: DB-stored key takes priority over env var
  const { data: keySetting } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'gemini_key')
    .single();

  const apiKey = (keySetting?.value as string | null) || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return NextResponse.json({
      error: 'Gemini API key not configured. Please add it in Settings.',
    }, { status: 400 });
  }

  try {
    const questions = await generateDailyQuestions(apiKey);
    await saveQuestions(questions, quizDate);

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: admin.id,
      action: 'QUESTIONS_GENERATED',
      entity: 'question',
      meta: { quiz_date: quizDate, count: questions.length },
    });

    return NextResponse.json({ success: true, quiz_date: quizDate, count: questions.length });
  } catch (err: any) {
    console.error('[generate] Error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
