'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock, Send, Loader2, BookOpen, Trash2, Pencil, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, addMonths, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { BqaQuestion } from '@/lib/supabase';

type DailyReading = {
  liturgical_day: string;
  first_reading_ref: string;
  first_reading_text: string;
  gospel_ref: string;
  gospel_text: string;
  reflection_hi: string;
  reflection_en: string;
};

type Quiz = {
  quiz_date: string; published: boolean; published_at: string | null;
  question_stats: { pending: number; approved: number; rejected: number };
};

function getDayStatus(quiz: Quiz | undefined): 'published' | 'ready' | 'pending' | 'empty' {
  if (!quiz) return 'empty';
  if (quiz.published) return 'published';
  const { approved, pending } = quiz.question_stats;
  if (approved >= 1 || pending > 0) return 'ready';
  return 'empty';
}

const STATUS_COLORS: Record<string, string> = {
  published: '#10b981', ready: '#6366f1', pending: '#f59e0b', empty: 'transparent',
};

const CATEGORY_BADGE: Record<string, string> = {
  'First Reading': 'badge-first', 'Second Reading': 'badge-second', 'Gospel': 'badge-gospel',
  OT: 'badge-first', 'NT-Gospel': 'badge-gospel', 'NT-Other': 'badge-second',
};

export default function SchedulePage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quizzes, setQuizzes]           = useState<Quiz[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateQuestions, setDateQuestions] = useState<BqaQuestion[]>([]);
  const [loading, setLoading]           = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending]           = useState(false);
  const [clearingAll, setClearingAll]   = useState(false);
  const [dayReadings, setDayReadings]   = useState<DailyReading | null>(null);

  const monthStr = format(currentMonth, 'yyyy-MM');

  const fetchMonthQuizzes = async () => {
    const r = await fetch(`/api/quizzes?month=${monthStr}`);
    const d = await r.json();
    setQuizzes(d.data || []);
  };

  useEffect(() => { fetchMonthQuizzes(); }, [monthStr]);

  const quizMap = Object.fromEntries(quizzes.map(q => [q.quiz_date, q]));

  const fetchDayQuestions = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    setDayReadings(null);
    const [qRes, rRes] = await Promise.all([
      fetch(`/api/questions?date=${date}`),
      fetch(`/api/daily-readings?date=${date}`),
    ]);
    const qData = await qRes.json();
    const rData = await rRes.json();
    setDateQuestions(qData.data || []);
    setDayReadings(rData.data || null);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!selectedDate) return;
    setPublishing(true);
    const res  = await fetch(`/api/quizzes/${selectedDate}/publish`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Quiz published for ${selectedDate} 🎉`);
      fetchMonthQuizzes();
    } else {
      toast.error(data.error || 'Publish failed');
    }
    setPublishing(false);
  };

  // Generate question for the first time
  const handleGenerate = async () => {
    if (!selectedDate) return;
    setGenerating(true);
    const t = toast.loading('Generating Gospel question with Gemini AI…');
    const res  = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('✅ Gospel question generated!', { id: t });
      fetchDayQuestions(selectedDate);
      fetchMonthQuizzes();
    } else if (res.status === 409) {
      // Question already exists — prompt to regenerate instead
      toast.dismiss(t);
      toast('Question already exists. Use "Regenerate" to replace it.', { icon: '💡' });
    } else {
      toast.error(data.error || 'Generation failed', { id: t });
    }
    setGenerating(false);
  };

  // Force-regenerate (overwrites existing)
  const handleRegenerate = async () => {
    if (!selectedDate) return;
    setRegenerating(true);
    const t = toast.loading('Regenerating Gospel question…');
    const res  = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, force: true }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('✅ Question regenerated!', { id: t });
      fetchDayQuestions(selectedDate);
      fetchMonthQuizzes();
    } else {
      toast.error(data.error || 'Regeneration failed', { id: t });
    }
    setRegenerating(false);
  };

  const handleSendQuiz = async () => {
    setSending(true);
    const t = toast.loading('Sending quiz via WhatsApp…');
    try {
      const res  = await fetch('/api/send-quiz', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`✅ Sent to ${data.sent} user(s)! Failed: ${data.failed}`, { id: t, duration: 5000 });
      } else {
        toast.error(data.error || 'Send failed', { id: t });
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error', { id: t });
    }
    setSending(false);
  };

  const handleClearAll = async () => {
    if (!selectedDate) return;
    if (!confirm(`Delete ALL questions for ${selectedDate}? This cannot be undone.`)) return;
    setClearingAll(true);
    const res = await fetch(`/api/questions?date=${selectedDate}`, { method: 'DELETE' });
    const d   = await res.json();
    if (res.ok) {
      toast.success(`Cleared ${d.deleted ?? 'all'} questions for ${selectedDate}`);
      fetchDayQuestions(selectedDate);
      fetchMonthQuizzes();
    } else {
      toast.error(d.error || 'Failed to clear');
    }
    setClearingAll(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);
  const selectedQuiz = selectedDate ? quizMap[selectedDate] : null;

  // The Gospel question for today (slot=1 preferred, else any)
  const gospelQ = dateQuestions.find(q => q.slot === 1) || dateQuestions[0] || null;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Quiz Schedule</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
        Manage and publish daily Gospel quizzes. Click a date to view or generate a question.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>
        {/* Calendar */}
        <div className="glass-card" style={{ padding: 24 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button className="btn-ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{format(currentMonth, 'MMMM yyyy')}</span>
            <button className="btn-ghost" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['published','Published'],['ready','Question Ready'],['empty','No Question']].map(([s, l]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[s] || 'rgba(255,255,255,0.1)', border: s === 'empty' ? '1px solid rgba(255,255,255,0.1)' : 'none' }} />
                {l}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const quiz    = quizMap[dateStr];
              const status  = getDayStatus(quiz);
              const isSelected = selectedDate === dateStr;
              const today   = isToday(day);

              return (
                <button key={dateStr} onClick={() => fetchDayQuestions(dateStr)}
                  style={{
                    aspectRatio: '1', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isSelected
                      ? 'rgba(99,102,241,0.25)'
                      : status !== 'empty'
                      ? `${STATUS_COLORS[status]}18`
                      : 'rgba(255,255,255,0.03)',
                    outline: isSelected ? '2px solid var(--indigo)' : today ? '2px solid rgba(255,255,255,0.15)' : 'none',
                    position: 'relative', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3,
                    transition: 'all 0.12s ease', padding: 4,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: today ? 800 : 500, color: today ? '#fff' : 'var(--text)' }}>
                    {format(day, 'd')}
                  </span>
                  {status !== 'empty' && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLORS[status] }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div>
          {selectedDate ? (
            <div className="glass-card" style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d yyyy')}
                </div>
                {selectedQuiz && (
                  <span className={`badge ${selectedQuiz.published ? 'badge-approved' : 'badge-pending'}`}>
                    {selectedQuiz.published ? '✅ Published' : '⏳ Draft'}
                  </span>
                )}
              </div>

              {/* Readings Preview */}
              {dayReadings && (
                <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <BookOpen size={13} /> Today's Readings
                  </div>
                  {dayReadings.liturgical_day && (
                    <div style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>✝️ {dayReadings.liturgical_day}</div>
                  )}
                  {dayReadings.gospel_ref && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>✝️ GOSPEL — {dayReadings.gospel_ref}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5, fontStyle: 'italic' }}>
                        {dayReadings.gospel_text?.slice(0, 200)}{(dayReadings.gospel_text?.length || 0) > 200 ? '…' : ''}
                      </div>
                    </div>
                  )}
                  {dayReadings.reflection_en && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>🙏 REFLECTION</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.6 }}>{dayReadings.reflection_en}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Question Preview */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : gospelQ ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <BookOpen size={13} /> Today's Gospel Question
                  </div>

                  <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 10 }}>
                    {/* Status + category badges */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span className={`badge ${CATEGORY_BADGE[gospelQ.category] || 'badge-gospel'}`} style={{ fontSize: 10 }}>
                        ✝️ {gospelQ.category}
                      </span>
                      <span className={`badge badge-${gospelQ.status}`} style={{ fontSize: 10 }}>
                        {gospelQ.status === 'pending' ? '⏳ Pending' : gospelQ.status === 'approved' ? '✅ Approved' : '✕ Rejected'}
                      </span>
                      {gospelQ.verse_reference && (
                        <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600, marginLeft: 'auto' }}>
                          📖 {gospelQ.verse_reference}
                        </span>
                      )}
                    </div>

                    {/* Hindi question */}
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.65, marginBottom: 10, fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif' }}>
                      {gospelQ.question_text}
                    </div>

                    {/* English question */}
                    {gospelQ.english_question && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                        {gospelQ.english_question}
                      </div>
                    )}

                    {/* Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {(['A','B','C','D'] as const).map(opt => {
                        const text = gospelQ[`option_${opt.toLowerCase()}` as keyof BqaQuestion] as string;
                        const isCorrect = gospelQ.correct_answer === opt;
                        return (
                          <div key={opt} style={{
                            padding: '7px 10px', borderRadius: 7, fontSize: 11.5,
                            background: isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            color: isCorrect ? '#10b981' : 'var(--text-sub)', fontWeight: isCorrect ? 700 : 400,
                            display: 'flex', gap: 6, alignItems: 'flex-start',
                            fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif',
                          }}>
                            <span style={{ fontWeight: 700, minWidth: 14, color: isCorrect ? '#10b981' : 'var(--text-muted)', fontSize: 11 }}>{opt}.</span>
                            {text}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {gospelQ.explanation && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: '"Noto Sans Devanagari", sans-serif', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                        💡 {gospelQ.explanation}
                      </div>
                    )}
                  </div>

                  {/* Per-question actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => router.push(`/questions/${gospelQ.id}`)} style={{ fontSize: 12, flex: 1, justifyContent: 'center' }}>
                      <Pencil size={12} /> Edit Question
                    </button>
                    <button className="btn-ghost" onClick={handleRegenerate} disabled={regenerating} style={{ fontSize: 12, flex: 1, justifyContent: 'center', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                      {regenerating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                  <BookOpen size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <p>No question generated yet.</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Click &quot;Generate Question&quot; below.</p>
                </div>
              )}

              {/* Main actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                {/* Generate (only if no question exists) */}
                {!gospelQ && (
                  <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ justifyContent: 'center' }}>
                    {generating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                    Generate Gospel Question
                  </button>
                )}

                {/* Publish */}
                {!selectedQuiz?.published && (
                  <button onClick={handlePublish}
                    disabled={publishing || (selectedQuiz?.question_stats?.pending ?? 0) + (selectedQuiz?.question_stats?.approved ?? 0) < 1}
                    className="btn-primary" style={{ justifyContent: 'center' }}>
                    {publishing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                    Publish Quiz
                  </button>
                )}

                {selectedQuiz?.published && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                    <CheckCircle2 size={15} /> Published
                    {selectedQuiz.published_at && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {format(new Date(selectedQuiz.published_at), 'MMM d, HH:mm')}
                      </span>
                    )}
                  </div>
                )}

                {/* Send WhatsApp Now */}
                <button onClick={handleSendQuiz} disabled={sending} className="btn-ghost"
                  style={{ justifyContent: 'center', fontSize: 13, borderColor: 'rgba(99,102,241,0.3)' }}>
                  {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                  Send WhatsApp Now
                </button>

                {/* Clear All */}
                <button onClick={handleClearAll} disabled={clearingAll || !gospelQ} className="btn-ghost"
                  style={{ justifyContent: 'center', fontSize: 13, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                  {clearingAll ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                  Clear All Questions
                </button>

                {((selectedQuiz?.question_stats?.pending ?? 0) + (selectedQuiz?.question_stats?.approved ?? 0)) < 1 && !selectedQuiz?.published && (
                  <p style={{ fontSize: 11.5, color: 'var(--amber)', textAlign: 'center' }}>
                    Generate a question first to publish
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Click a date on the calendar to view and manage its quiz</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
