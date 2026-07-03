import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('joined_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, phone, language } = await req.json();
  if (!name || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });

  // Check duplicate
  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('phone', phone).single();
  if (existing) return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });

  const { data, error } = await supabaseAdmin.from('users').insert({
    name, phone, language: language || 'hi', status: 'active',
    joined_date: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
