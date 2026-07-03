import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key } = await req.json();
  if (!key?.trim()) return NextResponse.json({ ok: false, error: 'No key provided' });

  // Try models in order — use the SDK (handles versioning correctly)
  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-pro',
  ];

  const genAI = new GoogleGenerativeAI(key.trim());

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say: OK');
      const text = result.response.text();
      if (text) {
        return NextResponse.json({ ok: true, model: modelName });
      }
    } catch (e: any) {
      // Try next model
      const msg: string = e.message || '';
      // If it's an auth/key error (not a model-not-found error), fail immediately
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('401')) {
        return NextResponse.json({ ok: false, error: 'Invalid API key' });
      }
      // Otherwise try the next model
      continue;
    }
  }

  return NextResponse.json({ ok: false, error: 'No supported Gemini model found for this key. Please check your API key.' });
}
