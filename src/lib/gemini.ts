import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from './supabase';

export interface GeneratedQuestion {
  slot: 1 | 2 | 3;
  category: 'OT' | 'NT-Gospel' | 'NT-Other';
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  verse_reference: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic_tag?: string;
  english_question?: string;
}

export interface DailyReadingsOutput {
  liturgical_day: string;
  first_reading_ref: string;
  first_reading_text: string;  // key verses excerpt ≤120 words
  gospel_ref: string;
  gospel_text: string;         // key verses excerpt ≤120 words
  reflection_hi: string;       // 2-3 sentence Hindi reflection
  reflection_en: string;       // 2-3 sentence English reflection
}

export interface GenerationResult {
  questions: GeneratedQuestion[];
  readings: DailyReadingsOutput;
}

async function getRecentTopics(days = 90): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data } = await supabaseAdmin
    .from('questions')
    .select('topic_tag, verse_reference')
    .gte('quiz_date', cutoff.toISOString().split('T')[0])
    .not('topic_tag', 'is', null);
  return (data || []).map((q: { topic_tag: string; verse_reference: string }) => `${q.topic_tag} (${q.verse_reference})`);
}

function buildPrompt(recentTopics: string[]): string {
  const recentList = recentTopics.length ? recentTopics.slice(-30).join('\n- ') : 'None';
  return `You are a Catholic Bible expert for an Indian parish. Based on today's Catholic Mass readings (Roman Rite), generate the following JSON object.

SLOT RULES (STRICT):
- slot 1, category "OT": Question from the FIRST READING (Old Testament)
- slot 2, category "NT-Gospel": Question from the GOSPEL reading
- slot 3, category "NT-Other": Question from the SECOND READING (Epistle/New Testament)

LANGUAGE RULES for questions:
- question_text: Hindi in Devanagari script
- english_question: Same question in English
- option_a/b/c/d: Hindi Devanagari
- explanation: Hindi Devanagari (2-3 sentences with verse reference)
- verse_reference: Hindi book name + chapter:verse (e.g. "लूका 10:1")
- topic_tag: English keyword

READINGS RULES:
- first_reading_text: Key 2-3 verses from the First Reading (English, ≤120 words)
- gospel_text: Key 3-4 verses from the Gospel (English, ≤120 words)
- reflection_hi: 2-3 sentence spiritual reflection in Hindi Devanagari
- reflection_en: Same reflection in English

DO NOT repeat these recent topics:
- ${recentList}

Return ONLY a valid JSON object (no markdown fences) in this exact shape:
{
  "questions": [
    {"slot":1,"category":"OT","question_text":"हिंदी","english_question":"English","option_a":"हिंदी","option_b":"हिंदी","option_c":"हिंदी","option_d":"हिंदी","correct_answer":"A","verse_reference":"पुस्तक अ:व","explanation":"हिंदी","difficulty":"medium","topic_tag":"English"},
    {"slot":2,"category":"NT-Gospel",...},
    {"slot":3,"category":"NT-Other",...}
  ],
  "readings": {
    "liturgical_day": "Ordinary Time — Week 13, Friday",
    "first_reading_ref": "Amos 9:11-15",
    "first_reading_text": "Key verses from First Reading...",
    "gospel_ref": "Matthew 9:14-17",
    "gospel_text": "Key verses from Gospel...",
    "reflection_hi": "आज के सुसमाचार में येसु...",
    "reflection_en": "In today's Gospel, Jesus..."
  }
}`;
}

function validate(questions: GeneratedQuestion[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(questions) || questions.length !== 3) {
    return { valid: false, errors: [`Expected array of 3, got ${Array.isArray(questions) ? questions.length : typeof questions}`] };
  }

  const catMap: Record<number, string> = { 1: 'OT', 2: 'NT-Gospel', 3: 'NT-Other' };
  const devanagari = /[\u0900-\u097F]/;

  for (const q of questions) {
    if (!q.slot || !q.category) { errors.push(`Missing slot or category`); continue; }
    if (q.category !== catMap[q.slot]) errors.push(`Slot ${q.slot}: wrong category "${q.category}", expected "${catMap[q.slot]}"`);
    if (!q.question_text?.trim()) errors.push(`Slot ${q.slot}: missing question_text`);
    if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) errors.push(`Slot ${q.slot}: invalid correct_answer "${q.correct_answer}"`);
    if (!q.verse_reference?.trim()) errors.push(`Slot ${q.slot}: missing verse_reference`);
    if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) errors.push(`Slot ${q.slot}: missing one or more options`);
    if (!devanagari.test(q.question_text || '')) {
      console.warn(`[Gemini] Slot ${q.slot}: question_text not in Devanagari — "${q.question_text?.slice(0, 50)}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function generateDailyContent(apiKey?: string): Promise<GenerationResult> {
  const key = apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('No Gemini API key available. Please set it in Settings.');

  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const recentTopics = await getRecentTopics(90);
  const prompt = buildPrompt(recentTopics);
  const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3');

  let lastValidationErrors: string[] = [];
  let lastRawResponse = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[Gemini] Attempt ${attempt}/${MAX_RETRIES} using ${modelName}`);
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text()
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      lastRawResponse = raw.slice(0, 300);
      console.log(`[Gemini] Raw response (first 300 chars): ${lastRawResponse}`);

      const parsed = JSON.parse(raw);

      // Support both old array format and new object format
      const questions: GeneratedQuestion[] = Array.isArray(parsed) ? parsed : parsed.questions;
      const readings: DailyReadingsOutput | undefined = Array.isArray(parsed) ? undefined : parsed.readings;

      const { valid, errors } = validate(questions);

      if (!valid) {
        lastValidationErrors = errors;
        console.error('[Gemini] Validation failed:', errors);
        if (errors.some(e => e.includes('wrong category'))) {
          for (const q of questions) {
            const catMap: Record<number, 'OT' | 'NT-Gospel' | 'NT-Other'> = { 1: 'OT', 2: 'NT-Gospel', 3: 'NT-Other' };
            if (catMap[q.slot]) q.category = catMap[q.slot];
          }
          const { valid: valid2 } = validate(questions);
          if (valid2) {
            console.log('[Gemini] ✅ Auto-fixed category mapping');
            questions.sort((a, b) => a.slot - b.slot);
            return { questions, readings: readings || buildFallbackReadings(questions) };
          }
        }
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }

      questions.sort((a, b) => a.slot - b.slot);
      console.log('[Gemini] ✅ Content generated successfully');
      return { questions, readings: readings || buildFallbackReadings(questions) };

    } catch (err: any) {
      const msg: string = err.message || '';
      console.error(`[Gemini] Attempt ${attempt} error:`, msg.slice(0, 200));
      lastRawResponse = msg;

      if (msg.includes('limit: 0') || msg.includes('"limit":0')) {
        throw new Error(
          'Your Gemini API project has no quota allocated (limit: 0). ' +
          'Please create a new API key from an existing project in Google AI Studio, ' +
          'or enable billing on your current project. ' +
          'Visit: https://aistudio.google.com/app/apikey'
        );
      }

      const retryMatch = msg.match(/retry in ([\d.]+)s/i);
      const suggestedWait = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) * 1000 : 5000 * attempt;
      const waitMs = Math.min(suggestedWait, 15000);

      console.log(`[Gemini] Waiting ${Math.round(waitMs / 1000)}s before retry...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  const detail = lastValidationErrors.length
    ? `Validation errors: ${lastValidationErrors.join('; ')}`
    : `Last response: ${lastRawResponse}`;

  throw new Error(`Gemini generation failed after ${MAX_RETRIES} attempts. ${detail}`);
}

/** Fallback readings if Gemini doesn't return readings block */
function buildFallbackReadings(questions: GeneratedQuestion[]): DailyReadingsOutput {
  const gospel = questions.find(q => q.slot === 2);
  const ot = questions.find(q => q.slot === 1);
  return {
    liturgical_day: '',
    first_reading_ref: ot?.verse_reference || '',
    first_reading_text: '',
    gospel_ref: gospel?.verse_reference || '',
    gospel_text: '',
    reflection_hi: gospel?.explanation || '',
    reflection_en: gospel?.english_question || '',
  };
}

/** @deprecated Use generateDailyContent instead */
export async function generateDailyQuestions(apiKey?: string): Promise<GeneratedQuestion[]> {
  const result = await generateDailyContent(apiKey);
  return result.questions;
}

export async function saveQuestions(questions: GeneratedQuestion[], quizDate: string): Promise<void> {
  const payload = questions.map(q => ({
    quiz_date: quizDate,
    slot: q.slot,
    category: q.category,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    verse_reference: q.verse_reference,
    difficulty: q.difficulty,
    explanation: q.explanation,
    topic_tag: q.topic_tag || null,
    english_question: q.english_question || null,
    status: 'pending',
    generated_by: 'gemini',
  }));

  const { error } = await supabaseAdmin
    .from('questions')
    .upsert(payload, { onConflict: 'quiz_date,slot' });

  if (error) throw new Error(`[Supabase] Save failed: ${error.message}`);

  await supabaseAdmin
    .from('quizzes')
    .upsert({ quiz_date: quizDate, published: false }, { onConflict: 'quiz_date' });
}

export async function saveReadings(readings: DailyReadingsOutput, readingDate: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('daily_readings')
    .upsert({
      reading_date: readingDate,
      liturgical_day: readings.liturgical_day,
      first_reading_ref: readings.first_reading_ref,
      first_reading_text: readings.first_reading_text,
      gospel_ref: readings.gospel_ref,
      gospel_text: readings.gospel_text,
      reflection_hi: readings.reflection_hi,
      reflection_en: readings.reflection_en,
    }, { onConflict: 'reading_date' });

  if (error) throw new Error(`[Supabase] Save readings failed: ${error.message}`);
}
