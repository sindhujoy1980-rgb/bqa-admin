import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────
type Readings = {
  liturgical_day: string;
  first_reading: string;
  second_reading: string;
  gospel: string;
  gospel_theme: string;
};

// ── Scrape from universalis.com ───────────────────────────────
// universalis.com provides free, accurate Roman Rite daily Mass readings
async function scrapeUniversalis(dateStr: string): Promise<Readings | null> {
  // dateStr format: YYYY-MM-DD → universalis uses YYYYMMDD
  const compact = dateStr.replace(/-/g, '');
  const url = `https://universalis.com/${compact}/mass.htm`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibleQuizAdmin/1.0)' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // ── Extract liturgical day ──────────────────────────────
    // Universalis wraps the day name in <h1 class="day-name"> or similar
    const liturgical_day =
      extractTag(html, 'class="day-name"') ||
      extractTag(html, '<title>') ||
      'Ordinary Time';

    // ── Extract reading references ──────────────────────────
    // Universalis labels sections with "A reading from..." or reference headings
    // We look for the citation spans / headings for each section
    const refs = extractReadingRefs(html);

    return {
      liturgical_day: cleanText(liturgical_day),
      first_reading:  refs.firstReading  || 'See universalis.com for today\'s reading',
      second_reading: refs.psalm         || 'See universalis.com for today\'s psalm',
      gospel:         refs.gospel        || 'See universalis.com for today\'s gospel',
      gospel_theme:   refs.gospelTheme   || '',
    };
  } catch {
    return null;
  }
}

// Extract inner text of an element identified by a string match
function extractTag(html: string, marker: string): string {
  const idx = html.indexOf(marker);
  if (idx === -1) return '';
  const start = html.indexOf('>', idx) + 1;
  const end = html.indexOf('<', start);
  if (start <= 0 || end <= start) return '';
  return html.slice(start, end).trim();
}

function cleanText(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

// Extract reading/psalm/gospel references from universalis HTML
function extractReadingRefs(html: string): {
  firstReading: string; psalm: string; gospel: string; gospelTheme: string;
} {
  // Universalis wraps citations in <p class="citation"> or <div class="citation">
  // Pattern: <span class="citation">Acts 12:1-11</span> etc.
  const citationRegex = /class="citation"[^>]*>([^<]+)<\/(?:span|p|div)>/gi;
  const citations: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = citationRegex.exec(html)) !== null) {
    const text = cleanText(m[1]);
    if (text && text.length > 2) citations.push(text);
  }

  // Universalis order: 1st reading, psalm/responsorial, [2nd reading on Sundays], gospel
  // We also look for heading markers
  const firstReading = citations[0] || extractSectionRef(html, ['First reading', 'A reading from', 'Reading 1']);
  const psalm        = citations[1] || extractSectionRef(html, ['Responsorial Psalm', 'Psalm']);
  const gospel       = citations[citations.length - 1] || extractSectionRef(html, ['Gospel', 'A reading from the holy Gospel']);

  // Gospel theme: look for first paragraph after gospel heading
  const gospelTheme = extractGospelTheme(html);

  return { firstReading, psalm, gospel, gospelTheme };
}

function extractSectionRef(html: string, markers: string[]): string {
  for (const marker of markers) {
    const idx = html.toLowerCase().indexOf(marker.toLowerCase());
    if (idx === -1) continue;
    // Look for the citation near this heading
    const chunk = html.slice(idx, idx + 500);
    const m = chunk.match(/class="citation"[^>]*>([^<]+)</i);
    if (m) return cleanText(m[1]);
    // Or a verse reference pattern like "John 12:1-8"
    const verseM = chunk.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s\d+:\d+(?:[–\-]\d+)?)/);
    if (verseM) return cleanText(verseM[1]);
  }
  return '';
}

function extractGospelTheme(html: string): string {
  const gospelIdx = html.toLowerCase().indexOf('gospel');
  if (gospelIdx === -1) return '';
  const chunk = html.slice(gospelIdx, gospelIdx + 1500);
  // First paragraph of text content after gospel heading
  const paraM = chunk.match(/<p[^>]*>([^<]{20,150})<\/p>/i);
  if (paraM) return cleanText(paraM[1]);
  return '';
}

// ── Fallback: use USCCB-style URL if universalis fails ────────
async function scrapeUSCCB(dateStr: string): Promise<Readings | null> {
  // catholicreadings.info provides structured daily readings
  try {
    const url = `https://www.catholicreadings.info/api/readings?date=${dateStr}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.gospel) return null;
    return {
      liturgical_day: json.liturgicalDay || json.season || 'Ordinary Time',
      first_reading:  json.firstReading  || '',
      second_reading: json.psalm         || json.secondReading || '',
      gospel:         json.gospel        || '',
      gospel_theme:   json.gospelTheme   || '',
    };
  } catch {
    return null;
  }
}

// ── Fallback: Gemini ──────────────────────────────────────────
async function fetchFromGemini(today: string, apiKey: string): Promise<Readings | null> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const dateStr = new Date(today).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const prompt = `What are the Catholic daily Mass readings for ${dateStr} in the Roman Rite (Ordinary Form)?

Return ONLY a JSON object with these exact fields (no markdown, no extra text):
{
  "liturgical_day": "e.g. 14th Sunday in Ordinary Time",
  "first_reading": "e.g. 2 Kings 4:8-11",
  "second_reading": "e.g. Psalm 89:2-3, 16-17",
  "gospel": "e.g. Matthew 10:37-42",
  "gospel_theme": "Brief theme of today's gospel in one sentence"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text()
      .trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw) as Readings;
  } catch {
    return null;
  }
}

// ── Main GET handler ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  // 1. Check DB cache first
  const { data: cached } = await supabaseAdmin
    .from('daily_readings')
    .select('*')
    .eq('reading_date', today)
    .single();

  if (cached && cached.gospel && cached.first_reading) {
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

  // 2. Try universalis.com scrape
  let readings = await scrapeUniversalis(today);
  let source = 'universalis';

  // 3. Fallback: catholicreadings.info
  if (!readings || !readings.gospel) {
    readings = await scrapeUSCCB(today);
    source = 'catholicreadings';
  }

  // 4. Final fallback: Gemini AI
  if (!readings || !readings.gospel) {
    const { data: keySetting } = await supabaseAdmin
      .from('app_settings').select('value').eq('key', 'gemini_key').single();
    const apiKey = (keySetting?.value as string) || process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      readings = await fetchFromGemini(today, apiKey);
      source = 'gemini';
    }
  }

  if (!readings) {
    return NextResponse.json({ error: 'Could not fetch today\'s readings from any source.' }, { status: 500 });
  }

  // Cache in DB
  await supabaseAdmin.from('daily_readings').upsert({
    reading_date:   today,
    liturgical_day: readings.liturgical_day,
    first_reading:  readings.first_reading,
    second_reading: readings.second_reading,
    gospel:         readings.gospel,
    gospel_theme:   readings.gospel_theme,
  }, { onConflict: 'reading_date' });

  return NextResponse.json({ readings, source });
}
