import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, getSessionCookieName } from '@/lib/auth';

// Use anon key for signInWithPassword — service role cannot sign in users
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Sign in via Supabase Auth using anon key client
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Look up admin_users by supabase_uid first, then fall back to email
    let admin = null;
    const { data: byUid } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('supabase_uid', authData.user.id)
      .eq('is_active', true)
      .single();

    if (byUid) {
      admin = byUid;
    } else {
      const { data: byEmail } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (byEmail) {
        admin = byEmail;
        // Link supabase_uid if missing
        if (!byEmail.supabase_uid) {
          await supabaseAdmin
            .from('admin_users')
            .update({ supabase_uid: authData.user.id })
            .eq('id', byEmail.id);
        }
      }
    }

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin account not found or inactive' },
        { status: 403 }
      );
    }

    // Update last_login
    await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Issue session JWT
    const token = await createSession(admin.id);
    const res = NextResponse.json({
      success: true,
      admin: { name: admin.name, role: admin.role, email: admin.email },
    });
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return res;

  } catch (err) {
    console.error('[Login]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(getSessionCookieName());
  return res;
}
