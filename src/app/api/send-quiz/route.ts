import { NextRequest, NextResponse } from 'next/server';

// POST /api/send-quiz
// Proxies to the biblequiz backend /api/cron/send-quiz with auth header.
// Allows manual resend from admin even after a day's quiz was already sent.
export async function POST(_req: NextRequest) {
  const apiUrl     = process.env.NEXT_PUBLIC_API_URL || 'https://biblequiz-five.vercel.app';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${apiUrl}/api/cron/send-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
