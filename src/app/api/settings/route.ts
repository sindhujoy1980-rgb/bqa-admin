import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

// GET — return current settings (masked key)
export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')
    .in('key', ['gemini_key']);

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    if (row.key === 'gemini_key') {
      const k = row.value as string;
      settings['gemini_key_masked'] = k ? k.slice(0, 6) + '…' + k.slice(-4) : '';
    }
  }
  return NextResponse.json(settings);
}

// POST — save setting
export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (body.gemini_key) {
    const { error } = await supabaseAdmin.from('app_settings').upsert(
      { key: 'gemini_key', value: body.gemini_key, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
