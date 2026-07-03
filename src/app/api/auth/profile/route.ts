import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

// PATCH — update profile name/email
export async function PATCH(req: NextRequest) {
  const admin = await getSessionAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: 'Name and email required' }, { status: 400 });

  // Update admin_users table
  const { error: dbErr } = await supabaseAdmin
    .from('admin_users')
    .update({ name: name.trim(), email: email.trim() })
    .eq('id', admin.id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Update Supabase Auth email if changed
  if (email !== admin.email) {
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      admin.supabase_uid,
      { email: email.trim() }
    );
    if (authErr) return NextResponse.json({ error: `Auth update: ${authErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
