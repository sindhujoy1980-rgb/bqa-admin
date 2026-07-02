import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date  = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const limit = parseInt(searchParams.get('limit') || '100');

  const { data, error } = await supabaseAdmin
    .from('scores')
    .select('*, users(name, phone, church, city)')
    .eq('quiz_date', date)
    .order('rank', { ascending: true })
    .order('submitted_time', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, date });
}
