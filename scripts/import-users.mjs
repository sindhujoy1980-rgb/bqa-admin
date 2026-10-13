import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lppcivresygnccyebrqr.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcGNpdnJlc3lnbmNjeWVicnFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYxNDE5NCwiZXhwIjoyMDk4MTkwMTk0fQ.0Do6sdTUlHW2Twzz8e_9T_4IXeWzIMFrWHfd04RPWCw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Reading scripts/extracted_members.json...');
  const data = fs.readFileSync('scripts/extracted_members.json', 'utf-8');
  const members = JSON.parse(data);
  console.log(`Found ${members.length} unique members to import.`);

  console.log('Upserting into Supabase users table in batches of 50...');
  const BATCH_SIZE = 50;
  let totalInserted = 0;

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('users')
      .upsert(batch, { onConflict: 'phone' })
      .select('id');

    if (error) {
      console.error(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    } else {
      totalInserted += (data?.length || batch.length);
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} (${totalInserted}/${members.length})`);
    }
  }

  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log(`\nImport Complete! Total active users in database now: ${count}`);
}

run().catch(console.error);
