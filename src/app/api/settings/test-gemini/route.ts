import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key } = await req.json();
  if (!key?.trim()) return NextResponse.json({ ok: false, error: 'No key provided' });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Say: OK' }] }] }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: false, error: (err as any)?.error?.message || `HTTP ${res.status}` });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
