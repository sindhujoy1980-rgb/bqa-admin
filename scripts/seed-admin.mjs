/**
 * seed-admin.mjs
 * Run once to create your first BQA admin user in Supabase.
 * Usage: node scripts/seed-admin.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lppcivresygnccyebrqr.supabase.co';
const SERVICE_ROLE  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcGNpdnJlc3lnbmNjeWVicnFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYxNDE5NCwiZXhwIjoyMDk4MTkwMTk0fQ.0Do6sdTUlHW2Twzz8e_9T_4IXeWzIMFrWHfd04RPWCw';

// ── CHANGE THESE ─────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@bqa.com';
const ADMIN_PASSWORD = 'BQA@Admin2026';
const ADMIN_NAME     = 'BQA Super Admin';
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function seedAdmin() {
  console.log('🌱 Seeding BQA admin user…\n');

  // 1. Create Supabase Auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authErr && !authErr.message.includes('already been registered')) {
    console.error('❌ Auth error:', authErr.message);
    process.exit(1);
  }

  const uid = authData?.user?.id;
  console.log(`✅ Auth user: ${uid ?? '(already exists)'}`);

  // If user already exists, fetch by email
  let supabaseUid = uid;
  if (!supabaseUid) {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users.find(u => u.email === ADMIN_EMAIL);
    supabaseUid = existing?.id ?? null;
    console.log(`   Found existing auth user: ${supabaseUid}`);
  }

  // 2. Upsert into admin_users table
  const { data: admin, error: dbErr } = await supabase
    .from('admin_users')
    .upsert({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'super_admin',
      supabase_uid: supabaseUid,
      is_active: true,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (dbErr) {
    console.error('❌ DB error:', dbErr.message);
    process.exit(1);
  }

  console.log(`✅ admin_users record: ${admin.id}`);
  console.log('\n─────────────────────────────────────────');
  console.log('🎉 Admin seeded! Login credentials:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   URL:      http://localhost:3000/login`);
  console.log('─────────────────────────────────────────\n');
}

seedAdmin().catch(console.error);
