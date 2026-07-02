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

  const questions = await generateDailyQuestions();
  await saveQuestions(questions, quizDate);

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.id,
    action: 'QUESTIONS_GENERATED',
    entity: 'question',
    meta: { quiz_date: quizDate, count: 3 },
  });

  return NextResponse.json({ success: true, quiz_date: quizDate, count: questions.length });
}
