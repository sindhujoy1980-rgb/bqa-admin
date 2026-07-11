import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from './supabase';

export interface GeneratedQuestion {
  slot: 1;
  category: 'Gospel';
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
  first_reading_text: string;
  gospel_ref: string;
  gospel_text: string;
  reflection_hi: string;
  reflection_en: string;
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
  return `You are a Catholic Bible expert for an Indian parish. Based on today's Catholic Mass Gospel reading (Roman Rite), generate exactly ONE quiz question in the following JSON format.

RULES:
- The question MUST be from the GOSPEL reading of today's Catholic Mass
- question_text: Hindi in Devanagari script
- english_question: Same question in English
- option_a/b/c/d: Hindi Devanagari (short, clear options)
- correct_answer: exactly one of "A", "B", "C", or "D"
- explanation: Hindi Devanagari (2-3 sentences with verse reference explaining the correct answer)
- verse_reference: Hindi book name + chapter:verse (e.g. "मत्ती 9:14" or "लूका 10:1")
- topic_tag: English keyword for the topic
- difficulty: one of "easy", "medium", or "hard"

DO NOT repeat these recent topics (avoid repeating the same scripture passage):
- ${recentList}

Return ONLY a valid JSON object (no markdown fences, no extra text) in this EXACT shape:
{
  "question": {
    "slot": 1,
    "category": "Gospel",
    "question_text": "हिंदी में प्रश्न",
    "english_question": "Question in English",
    "option_a": "हिंदी",
    "option_b": "हिंदी",
    "option_c": "हिंदी",
    "option_d": "हिंदी",
    "correct_answer": "A",
    "verse_reference": "पुस्तक अ:व",
    "explanation": "हिंदी में व्याख्या (2-3 वाक्य)",
    "difficulty": "medium",
    "topic_tag": "English keyword"
  },
  "readings": {
    "liturgical_day": "Ordinary Time — Week 14, Saturday",
    "first_reading_ref": "Genesis 49:29-32",
    "first_reading_text": "Key 2-3 verses from the First Reading (English, ≤100 words)",
    "gospel_ref": "Matthew 10:24-33",
    "gospel_text": "Key 3-4 verses from the Gospel (English, ≤120 words)",
    "reflection_hi": "आज के सुसमाचार में येसु... (2-3 वाक्य)",
    "reflection_en": "In today's Gospel, Jesus... (2-3 sentences)"
  }
}`;
}

function validate(q: GeneratedQuestion): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const devanagari = /[\u0900-\u097F]/;

  if (!q.question_text?.trim()) errors.push('Missing question_text');
  if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) errors.push(`Invalid correct_answer: "${q.correct_answer}"`);
  if (!q.verse_reference?.trim()) errors.push('Missing verse_reference');
  if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) errors.push('Missing one or more options');
  if (!devanagari.test(q.question_text || '')) {
    console.warn(`[Gemini] question_text not in Devanagari: "${q.question_text?.slice(0, 50)}"`);
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

      // Support both { question: {...} } and flat array format
      const q: GeneratedQuestion = parsed.question
        ? { ...parsed.question, slot: 1, category: 'Gospel' }
        : Array.isArray(parsed)
          ? { ...parsed[0], slot: 1, category: 'Gospel' }
          : { ...parsed, slot: 1, category: 'Gospel' };

      const readings: DailyReadingsOutput = parsed.readings || buildFallbackReadings(q);

      const { valid, errors } = validate(q);
      if (!valid) {
        lastValidationErrors = errors;
        console.error('[Gemini] Validation failed:', errors);
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }

      console.log('[Gemini] ✅ Gospel question generated successfully');
      return { questions: [q], readings };

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

function buildFallbackReadings(q: GeneratedQuestion): DailyReadingsOutput {
  return {
    liturgical_day: '',
    first_reading_ref: '',
    first_reading_text: '',
    gospel_ref: q.verse_reference || '',
    gospel_text: '',
    reflection_hi: q.explanation || '',
    reflection_en: q.english_question || '',
  };
}

/** @deprecated Use generateDailyContent instead */
export async function generateDailyQuestions(apiKey?: string): Promise<GeneratedQuestion[]> {
  const result = await generateDailyContent(apiKey);
  return result.questions;
}

export async function saveQuestions(questions: GeneratedQuestion[], quizDate: string): Promise<void> {
  const payload = questions.map(q => ({
    quiz_date:      quizDate,
    slot:           q.slot,
    category:       q.category,
    question_text:  q.question_text,
    option_a:       q.option_a,
    option_b:       q.option_b,
    option_c:       q.option_c,
    option_d:       q.option_d,
    correct_answer: q.correct_answer,
    verse_reference: q.verse_reference,
    difficulty:     q.difficulty,
    explanation:    q.explanation,
    topic_tag:      q.topic_tag || null,
    english_question: q.english_question || null,
    status:         'pending',
    generated_by:   'gemini',
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
      reading_date:      readingDate,
      liturgical_day:    readings.liturgical_day,
      first_reading_ref: readings.first_reading_ref,
      first_reading_text: readings.first_reading_text,
      gospel_ref:        readings.gospel_ref,
      gospel_text:       readings.gospel_text,
      reflection_hi:     readings.reflection_hi,
      reflection_en:     readings.reflection_en,
    }, { onConflict: 'reading_date' });

  if (error) throw new Error(`[Supabase] Save readings failed: ${error.message}`);
}
