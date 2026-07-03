import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

type Readings = {
  liturgical_day: string;
  first_reading:  string;
  second_reading: string;
  gospel:         string;
  gospel_theme:   string;
};

// ── Gemini fetch (primary source — most reliable for liturgical data) ─────
async function fetchFromGemini(today: string, apiKey: string): Promise<Readings> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Try models in order of availability; 1.5-flash is most widely accessible
  const models = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-pro',
  ];

  const dateStr = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const prompt = `What are the Catholic daily Mass readings for ${dateStr} according to the Roman Rite liturgical calendar?

Return ONLY valid JSON (no markdown, no explanation):
{
  "liturgical_day": "e.g. 14th Sunday in Ordinary Time",
  "first_reading": "Book Chapter:Verse range, e.g. Isaiah 66:10-14",
  "second_reading": "Psalm reference, e.g. Psalm 66:1-7",
  "gospel": "Gospel reference, e.g. Luke 10:1-12",
  "gospel_theme": "One sentence theme of today's gospel"
}`;

  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      console.log(`[Readings] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const raw = result.response.text()
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(raw) as Readings;

      // Basic validation — must have a gospel
      if (!parsed.gospel?.trim()) throw new Error('Missing gospel in response');

      console.log(`[Readings] ✅ Got readings via ${modelName}`);
      return parsed;
    } catch (err: any) {
      lastError = err;
      console.error(`[Readings] Model ${modelName} failed:`, err.message);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

// ── Universalis scrape (backup — no API key needed) ───────────
async function scrapeUniversalis(today: string): Promise<Readings | null> {
  try {
    const compact = today.replace(/-/g, '');
    const url = `https://universalis.com/${compact}/mass.htm`;
    console.log(`[Readings] Trying universalis: ${url}`);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibleQuizAdmin/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error(`[Readings] Universalis HTTP ${res.status}`); return null; }

    const html = await res.text();

    // Extract citations: universalis wraps refs in <span class="citation">
    const citationMatches = [...html.matchAll(/class="citation"[^>]*>\s*([^<]+)\s*<\//gi)];
    const citations = citationMatches
      .map(m => m[1].trim())
      .filter(c => c.length > 2 && /\d/.test(c)); // must contain a number (verse ref)

    if (citations.length < 2) { console.error('[Readings] Universalis: not enough citations found'); return null; }

    // Liturgical day: look for <h1> or <div class="day-name">
    const dayMatch = html.match(/class="day-name"[^>]*>\s*([^<]+)\s*</i)
      || html.match(/<h1[^>]*>\s*([^<]{5,80})\s*<\/h1>/i);
    const liturgical_day = dayMatch ? cleanText(dayMatch[1]) : 'Ordinary Time';

    // Gospel theme: first paragraph of text near "Gospel" heading
    const gospelIdx = html.toLowerCase().indexOf('>gospel<');
    let gospel_theme = '';
    if (gospelIdx !== -1) {
      const chunk = html.slice(gospelIdx, gospelIdx + 2000);
      const paraM = chunk.match(/<p[^>]*>([^<]{30,200})<\/p>/i);
      if (paraM) gospel_theme = cleanText(paraM[1]);
    }

    return {
      liturgical_day,
      first_reading:  citations[0] || '',
      second_reading: citations[1] || '',
      gospel:         citations[citations.length - 1] || '',
      gospel_theme,
    };
  } catch (err: any) {
    console.error('[Readings] Universalis scrape error:', err.message);
    return null;
  }
}

function cleanText(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

// ── Main GET handler ──────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  // 1. DB cache check
  const { data: cached } = await supabaseAdmin
    .from('daily_readings')
    .select('*')
    .eq('reading_date', today)
    .single();

  if (cached?.gospel && cached?.first_reading) {
    return NextResponse.json({
      readings: {
        liturgical_day: cached.liturgical_day,
        first_reading:  cached.first_reading,
        second_reading: cached.second_reading,
        gospel:         cached.gospel,
        gospel_theme:   cached.gospel_theme,
      },
      source: 'cache',
    });
  }

  // 2. Get API key: DB-stored key takes priority over env var
  const { data: keySetting } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'gemini_key')
    .single();

  const apiKey = (keySetting?.value as string | null) || process.env.GEMINI_API_KEY || '';

  let readings: Readings | null = null;
  let source = '';
  const errors: string[] = [];

  // 3. Primary: Gemini AI (knows the liturgical calendar reliably)
  if (apiKey) {
    try {
      readings = await fetchFromGemini(today, apiKey);
      source = 'gemini';
    } catch (err: any) {
      errors.push(`Gemini: ${err.message}`);
      console.error('[Readings] Gemini failed:', err.message);
    }
  } else {
    errors.push('Gemini: No API key configured');
  }

  // 4. Fallback: universalis.com scrape
  if (!readings?.gospel) {
    const scraped = await scrapeUniversalis(today);
    if (scraped?.gospel) {
      readings = scraped;
      source = 'universalis';
    } else {
      errors.push('Universalis: scrape failed or empty');
    }
  }

  if (!readings?.gospel) {
    console.error('[Readings] All sources failed:', errors);
    return NextResponse.json({
      error: 'Could not fetch today\'s readings.',
      details: errors,
    }, { status: 500 });
  }

  // 5. Cache in DB
  await supabaseAdmin.from('daily_readings').upsert({
    reading_date:   today,
    liturgical_day: readings.liturgical_day || '',
    first_reading:  readings.first_reading  || '',
    second_reading: readings.second_reading || '',
    gospel:         readings.gospel         || '',
    gospel_theme:   readings.gospel_theme   || '',
  }, { onConflict: 'reading_date' });

  return NextResponse.json({ readings, source });
}
