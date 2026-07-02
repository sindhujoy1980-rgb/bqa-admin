'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns';
import type { BqaQuestion } from '@/lib/supabase';

type Quiz = {
  quiz_date: string; published: boolean; published_at: string | null;
  question_stats: { pending: number; approved: number; rejected: number };
};

function getDayStatus(quiz: Quiz | undefined): 'published' | 'ready' | 'pending' | 'empty' {
  if (!quiz) return 'empty';
  if (quiz.published) return 'published';
  const { approved, pending } = quiz.question_stats;
  if (approved >= 3) return 'ready';
  if (pending > 0 || approved > 0) return 'pending';
  return 'empty';
}

const STATUS_COLORS: Record<string, string> = {
  published: '#10b981', ready: '#6366f1', pending: '#f59e0b', empty: 'transparent',
};

export default function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quizzes, setQuizzes]           = useState<Quiz[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateQuestions, setDateQuestions] = useState<BqaQuestion[]>([]);
  const [loading, setLoading]           = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [generating, setGenerating]     = useState(false);

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    fetch(`/api/quizzes?month=${monthStr}`)
      .then(r => r.json()).then(d => setQuizzes(d.data || []));
  }, [monthStr]);

  const quizMap = Object.fromEntries(quizzes.map(q => [q.quiz_date, q]));

  const fetchDayQuestions = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    const res  = await fetch(`/api/questions?date=${date}`);
    const data = await res.json();
    setDateQuestions(data.data || []);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!selectedDate) return;
    setPublishing(true);
    const res  = await fetch(`/api/quizzes/${selectedDate}/publish`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Quiz published for ${selectedDate} 🎉`);
      const updated = await fetch(`/api/quizzes?month=${monthStr}`);
      const d = await updated.json();
      setQuizzes(d.data || []);
    } else {
      toast.error(data.error || 'Publish failed');
    }
    setPublishing(false);
  };

  const handleGenerate = async () => {
    if (!selectedDate) return;
    setGenerating(true);
    const t = toast.loading('Generating questions…');
    const res  = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate }),
    });
    const data = await res.json();
    if (res.ok) { toast.success('Questions generated!', { id: t }); fetchDayQuestions(selectedDate); }
    else        { toast.error(data.error || 'Failed', { id: t }); }
    setGenerating(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);
  const selectedQuiz = selectedDate ? quizMap[selectedDate] : null;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Quiz Schedule</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
        Manage and publish quizzes by date. Click a date to view questions.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
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
            {[['published','Published'],['ready','All Approved'],['pending','In Progress'],['empty','Empty']].map(([s, l]) => (
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
                    transition: 'all 0.12s ease',
                    padding: 4,
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

              {/* Questions for day */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : dateQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                  No questions for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {dateQuestions.map(q => (
                    <div key={q.id} style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: q.status === 'approved' ? 'rgba(16,185,129,0.08)' : q.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${q.status === 'approved' ? 'rgba(16,185,129,0.2)' : q.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Slot {q.slot} · {q.category}
                        </span>
                        <span className={`badge badge-${q.status}`} style={{ marginLeft: 'auto', fontSize: 10 }}>{q.status}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif' }}>
                        {q.question_text.slice(0, 80)}{q.question_text.length > 80 ? '…' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>{q.verse_reference}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleGenerate} disabled={generating} className="btn-ghost" style={{ justifyContent: 'center', fontSize: 13 }}>
                  {generating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                  Generate Questions
                </button>
                {!selectedQuiz?.published && (
                  <button onClick={handlePublish} disabled={publishing || (selectedQuiz?.question_stats?.approved ?? 0) < 3}
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
                {(selectedQuiz?.question_stats?.approved ?? 0) < 3 && !selectedQuiz?.published && (
                  <p style={{ fontSize: 11.5, color: 'var(--amber)', textAlign: 'center' }}>
                    Need {3 - (selectedQuiz?.question_stats?.approved ?? 0)} more approved questions to publish
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
