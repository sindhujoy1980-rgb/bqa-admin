import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key } = await req.json();
  if (!key?.trim()) return NextResponse.json({ ok: false, error: 'No key provided' });

  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.5-flash',
  ];

  const genAI = new GoogleGenerativeAI(key.trim());
  const attemptErrors: string[] = [];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say: OK');
      const text = result.response.text();
      if (text) {
        return NextResponse.json({ ok: true, model: modelName });
      }
    } catch (e: any) {
      const msg: string = e.message || String(e);
      attemptErrors.push(`${modelName}: ${msg}`);

      // Hard auth failure — no point trying other models
      if (
        msg.includes('API_KEY_INVALID') ||
        msg.includes('INVALID_API_KEY') ||
        msg.includes('invalid api key') ||
        msg.includes('401')
      ) {
        return NextResponse.json({ ok: false, error: `Invalid API key: ${msg}` });
      }
    }
  }

  // Return all errors so we can diagnose
  return NextResponse.json({
    ok: false,
    error: attemptErrors[0] || 'All models failed',
    details: attemptErrors,
  });
}
