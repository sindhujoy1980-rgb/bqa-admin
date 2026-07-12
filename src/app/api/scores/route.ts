import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date  = searchParams.get('date');
  const since = searchParams.get('since');           // date-range mode
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = supabaseAdmin
    .from('scores')
    .select('*, quiz_date, users(name, phone, church, city)')
    .order('rank', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    // Range mode: fetch all scores from 'since' date onwards
    query = query.gte('quiz_date', since);
  } else {
    // Single-day mode (default to today)
    const filterDate = date || new Date().toISOString().split('T')[0];
    query = query.eq('quiz_date', filterDate);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, date: date || since });
}
