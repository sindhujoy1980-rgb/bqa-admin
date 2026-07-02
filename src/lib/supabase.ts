import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side: full access, bypasses RLS */
export const supabaseAdmin = createClient(url, svc, {
  auth: { persistSession: false },
});

/** Client-side: anon key */
export const supabase = createClient(url, anon);

// ── BQA Types ─────────────────────────────────────────────

export type BqaQuestion = {
  id: string;
  quiz_date: string;
  slot: 1 | 2 | 3;
  category: 'OT' | 'NT-Gospel' | 'NT-Other';
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  verse_reference: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string | null;
  topic_tag: string | null;
  english_question: string | null;
  status: 'pending' | 'approved' | 'rejected';
  generated_by: 'gemini' | 'manual';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  admin_users?: { name: string } | null;
};

export type BqaQuiz = {
  id: string;
  quiz_date: string;
  published: boolean;
  flow_id: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
};

export type BqaUser = {
  id: string;
  name: string;
  phone: string;
  church: string | null;
  city: string | null;
  joined_date: string;
  last_active: string | null;
  status: 'active' | 'inactive' | 'blocked';
  language: 'hi' | 'en';
  created_at: string;
};

export type BqaScore = {
  id: string;
  user_id: string;
  quiz_date: string;
  score: number;
  percentage: number;
  rank: number | null;
  total_time_sec: number | null;
  submitted_time: string;
  users?: BqaUser;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'editor' | 'volunteer' | 'viewer';
  supabase_uid: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

export type DailyStats = {
  quiz_date: string;
  total_participants: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  avg_percentage: number;
  perfect_scores: number;
};
