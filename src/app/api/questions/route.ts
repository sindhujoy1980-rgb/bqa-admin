import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date     = searchParams.get('date');
  const status   = searchParams.get('status');
  const category = searchParams.get('category');

  let query = supabaseAdmin
    .from('questions')
    .select('*, admin_users(name)')
    .order('quiz_date', { ascending: false })
    .order('slot', { ascending: true });

  if (date)     query = query.eq('quiz_date', date);
  if (status)   query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({ ...body, generated_by: 'manual', status: 'pending' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/questions?date=yyyy-mm-dd  — clears all questions for a date
export async function DELETE(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = new URL(req.url).searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date param required' }, { status: 400 });

  const { error, count } = await supabaseAdmin
    .from('questions')
    .delete({ count: 'exact' })
    .eq('quiz_date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deleted: count });
}
