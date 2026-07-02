import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('questions')
    .update({
      status: 'approved',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log action
  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.id,
    action: 'QUESTION_APPROVED',
    entity: 'question',
    entity_id: id,
    meta: { quiz_date: data.quiz_date, slot: data.slot },
  });

  return NextResponse.json({ data });
}
