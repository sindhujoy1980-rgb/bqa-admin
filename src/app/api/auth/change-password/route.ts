import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both passwords required' }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  // Verify current password by attempting sign-in
  const { error: signInErr } = await supabaseAuth.auth.signInWithPassword({
    email: admin.email,
    password: currentPassword,
  });
  if (signInErr) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

  // Update password via admin API
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    admin.supabase_uid,
    { password: newPassword }
  );
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
