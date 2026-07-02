import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: pendingQuestions },
    { data: todayScores },
    { data: recentQuizzes },
    { data: upcomingPending },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('scores').select('score, percentage').eq('quiz_date', today),
    supabaseAdmin.from('quizzes').select('*').order('quiz_date', { ascending: false }).limit(7),
    supabaseAdmin.from('questions').select('quiz_date, status').gte('quiz_date', today).limit(20),
  ]);

  const todayParticipants = todayScores?.length ?? 0;
  const avgScore = todayScores?.length
    ? (todayScores.reduce((s, r) => s + Number(r.score), 0) / todayScores.length).toFixed(2)
    : '0';
  const perfectScores = todayScores?.filter(s => s.score === 3).length ?? 0;
  const publishedThisWeek = (recentQuizzes || []).filter(q => q.published).length;

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    pendingQuestions: pendingQuestions ?? 0,
    todayParticipants,
    avgScore,
    perfectScores,
    publishedThisWeek,
    recentQuizzes: recentQuizzes ?? [],
    upcomingPending: upcomingPending ?? [],
  });
}
