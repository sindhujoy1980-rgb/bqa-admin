import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { csv } = await req.json();
  if (!csv?.trim()) return NextResponse.json({ error: 'No CSV data' }, { status: 400 });

  const lines = csv.trim().split('\n');
  // Skip header row if it starts with 'name' (case insensitive)
  const dataLines = lines[0].toLowerCase().startsWith('name') ? lines.slice(1) : lines;

  let imported = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const line of dataLines) {
    const parts = line.trim().split(',');
    if (parts.length < 2) { skipped++; continue; }

    const [name, rawPhone, lang] = parts.map((p: string) => p.trim().replace(/^"|"$/g, ''));
    if (!name || !rawPhone) { skipped++; continue; }

    const phone = rawPhone.replace(/\D/g, '');
    if (phone.length < 10) { skipped++; errors.push(`Invalid phone: ${rawPhone}`); continue; }

    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;

    try {
      const { error } = await supabaseAdmin.from('users').upsert({
        name,
        phone: fullPhone,
        language: lang || 'hi',
        status: 'active',
        joined_date: new Date().toISOString(),
      }, { onConflict: 'phone', ignoreDuplicates: true });

      if (error) { skipped++; errors.push(`${name}: ${error.message}`); }
      else { imported++; }
    } catch (e) {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10) });
}
