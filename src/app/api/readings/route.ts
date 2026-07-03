import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  // Check cache in DB first
  const { data: cached } = await supabaseAdmin
    .from('daily_readings')
    .select('*')
    .eq('reading_date', today)
    .single();

  if (cached) {
    return NextResponse.json({ readings: {
      liturgical_day: cached.liturgical_day,
      first_reading:  cached.first_reading,
      second_reading: cached.second_reading,
      gospel:         cached.gospel,
      gospel_theme:   cached.gospel_theme,
    }});
  }

  // Not cached — generate via Gemini
  try {
    // Get API key from DB settings first, fall back to env
    const { data: keySetting } = await supabaseAdmin
      .from('app_settings').select('value').eq('key', 'gemini_key').single();
    const apiKey = (keySetting?.value as string) || process.env.GEMINI_API_KEY!;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const dateStr = new Date(today).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const prompt = `What are the Catholic daily Mass readings for ${dateStr} in the Roman Rite?

Return ONLY a JSON object with these exact fields (no markdown, no extra text):
{
  "liturgical_day": "e.g. 14th Sunday in Ordinary Time",
  "first_reading": "e.g. 2 Kings 4:8-11, 14-16a",
  "second_reading": "e.g. Psalm 89:2-3, 16-17, 18-19",
  "gospel": "e.g. Matthew 10:37-42",
  "gospel_theme": "Brief theme of today's gospel in one sentence"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text()
      .trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const readings = JSON.parse(raw);

    // Cache in DB
    await supabaseAdmin.from('daily_readings').upsert({
      reading_date: today,
      ...readings,
    }, { onConflict: 'reading_date' });

    return NextResponse.json({ readings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
