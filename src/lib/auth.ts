import { SignJWT, jwtVerify } from 'jose';
import { supabaseAdmin, type AdminUser } from './supabase';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'bqa-secret');
const COOKIE = 'bqa_session';

export async function createSession(adminId: string): Promise<string> {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
  return token;
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function getSessionAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const adminId = await verifySession(token);
  if (!adminId) return null;
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('id', adminId)
    .eq('is_active', true)
    .single();
  return data ?? null;
}

export function getSessionCookieName() { return COOKIE; }
