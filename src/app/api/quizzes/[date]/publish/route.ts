import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function POST(_: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { date } = await params;

  // Check at least 1 question exists (no approval required — generated/pending is fine)
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, status, slot')
    .eq('quiz_date', date)
    .not('status', 'eq', 'rejected');

  if (!questions || questions.length < 1) {
    return NextResponse.json({
      error: `No questions found for ${date}. Please generate questions first (current count: ${questions?.length ?? 0}).`,
    }, { status: 400 });
  }

  // Mark as published in DB
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .upsert({
      quiz_date: date,
      published: true,
      published_at: new Date().toISOString(),
      published_by: admin.id,
    }, { onConflict: 'quiz_date' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger WhatsApp broadcast via backend API
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  let broadcastResult: { sent?: number; failed?: number; error?: string } = {};

  if (backendUrl && process.env.CRON_SECRET) {
    try {
      const res = await fetch(`${backendUrl}/api/cron/send-quiz`, {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET },
      });
      broadcastResult = await res.json();
      if (!res.ok) {
        console.error('[Publish] Broadcast failed:', broadcastResult);
      }
    } catch (err) {
      console.error('[Publish] Could not reach backend:', err);
      broadcastResult = { error: 'Backend unreachable — quiz marked published but messages not sent.' };
    }
  } else {
    broadcastResult = { error: 'NEXT_PUBLIC_API_URL or CRON_SECRET not set — messages not sent.' };
  }

  // Log admin action
  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.id,
    action: 'QUIZ_PUBLISHED',
    entity: 'quiz',
    meta: { quiz_date: date, broadcast: broadcastResult },
  });

  return NextResponse.json({ data, broadcast: broadcastResult });
}

