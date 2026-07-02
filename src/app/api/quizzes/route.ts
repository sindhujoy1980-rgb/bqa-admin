import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM

  let query = supabaseAdmin
    .from('quizzes')
    .select('*')
    .order('quiz_date', { ascending: false });

  if (month) {
    query = query
      .gte('quiz_date', `${month}-01`)
      .lte('quiz_date', `${month}-31`);
  }

  const { data: quizzes, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach question status per quiz
  const dates = (quizzes || []).map(q => q.quiz_date);
  const { data: qCounts } = await supabaseAdmin
    .from('questions')
    .select('quiz_date, status')
    .in('quiz_date', dates);

  const statusMap: Record<string, { pending: number; approved: number; rejected: number }> = {};
  for (const q of qCounts || []) {
    if (!statusMap[q.quiz_date]) statusMap[q.quiz_date] = { pending: 0, approved: 0, rejected: 0 };
    statusMap[q.quiz_date][q.status as 'pending' | 'approved' | 'rejected']++;
  }

  const enriched = (quizzes || []).map(quiz => ({
    ...quiz,
    question_stats: statusMap[quiz.quiz_date] || { pending: 0, approved: 0, rejected: 0 },
  }));

  return NextResponse.json({ data: enriched });
}
