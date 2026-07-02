import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: admin });
}
