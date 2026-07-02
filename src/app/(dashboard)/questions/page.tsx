'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';


import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckSquare, XSquare, Pencil, Sparkles, Filter, Loader2, BookOpen, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { BqaQuestion } from '@/lib/supabase';

const CATEGORY_LABELS: Record<string, string> = {
  OT: 'Old Testament', 'NT-Gospel': 'Gospel', 'NT-Other': 'NT Other',
};
const SLOT_LABELS: Record<number, string> = { 1: 'OT', 2: 'Gospel', 3: 'NT Other' };

function QuestionCard({ q, onApprove, onReject, onEdit }: {
  q: BqaQuestion;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  onEdit:    (id: string) => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const handle = async (action: 'approve' | 'reject') => {
    setBusy(action);
    await (action === 'approve' ? onApprove(q.id) : onReject(q.id));
    setBusy(null);
  };

  return (
    <div className="glass-card fade-up" style={{ padding: 22 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span className={`badge badge-${q.category === 'OT' ? 'ot' : q.category === 'NT-Gospel' ? 'gospel' : 'nt'}`}>
          Slot {q.slot} · {CATEGORY_LABELS[q.category]}
        </span>
        <span className={`badge badge-${q.status}`}>
          {q.status === 'pending' ? '⏳ Pending' : q.status === 'approved' ? '✅ Approved' : '✕ Rejected'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {format(new Date(q.quiz_date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
      </div>

      {/* Question text */}
      <div style={{
        fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.6,
        marginBottom: 16, padding: '12px 16px',
        background: 'rgba(99,102,241,0.06)', borderRadius: 10,
        border: '1px solid rgba(99,102,241,0.12)',
        fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif',
      }}>
        {q.question_text}
      </div>

      {/* Options grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {(['A', 'B', 'C', 'D'] as const).map(opt => {
          const text = q[`option_${opt.toLowerCase()}` as keyof BqaQuestion] as string;
          const isCorrect = q.correct_answer === opt;
          return (
            <div key={opt} style={{
              padding: '9px 14px', borderRadius: 8, fontSize: 13,
              background: isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: isCorrect ? '#10b981' : 'var(--text-sub)',
              fontWeight: isCorrect ? 700 : 400,
              display: 'flex', gap: 8, alignItems: 'flex-start',
              fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif',
            }}>
              <span style={{ fontWeight: 700, minWidth: 18, color: isCorrect ? '#10b981' : 'var(--text-muted)' }}>{opt}.</span>
              {text}
            </div>
          );
        })}
      </div>

      {/* Verse + Explanation */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>
            Verse Reference
          </div>
          <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>{q.verse_reference}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>
            Difficulty
          </div>
          <span className="badge" style={{
            background: q.difficulty === 'easy' ? 'rgba(16,185,129,0.12)' : q.difficulty === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
            color: q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
          }}>{q.difficulty}</span>
        </div>
      </div>

      {q.explanation && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>View explanation</summary>
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.7, fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif' }}>
            {q.explanation}
          </div>
        </details>
      )}

      {q.english_question && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontStyle: 'italic' }}>
          EN: {q.english_question}
        </div>
      )}

      {/* Actions */}
      {q.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-success" onClick={() => handle('approve')} disabled={!!busy}>
            {busy === 'approve' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckSquare size={13} />}
            Approve
          </button>
          <button className="btn-danger" onClick={() => handle('reject')} disabled={!!busy}>
            {busy === 'reject' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <XSquare size={13} />}
            Reject
          </button>
          <button className="btn-ghost" onClick={() => onEdit(q.id)} style={{ fontSize: 12.5 }}>
            <Pencil size={13} /> Edit
          </button>
        </div>
      )}
      {q.status !== 'pending' && (
        <button className="btn-ghost" onClick={() => onEdit(q.id)} style={{ fontSize: 12.5 }}>
          <Pencil size={13} /> Edit
        </button>
      )}
    </div>
  );
}

function QuestionsInner() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<BqaQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab]             = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [dateFilter, setDateFilter] = useState(sp.get('date') || '');
  const [catFilter, setCatFilter]   = useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (dateFilter) params.set('date', dateFilter);
    if (catFilter)  params.set('category', catFilter);
    const res  = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data.data || []);
    setLoading(false);
  }, [tab, dateFilter, catFilter]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/questions/${id}/approve`, { method: 'POST' });
    if (res.ok) { toast.success('Question approved ✅'); fetchQuestions(); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    const res = await fetch(`/api/questions/${id}/reject`, { method: 'POST' });
    if (res.ok) { toast.success('Question rejected'); fetchQuestions(); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const date = dateFilter || new Date().toISOString().split('T')[0];
    const t = toast.loading('Generating with Gemini AI…');
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const data = await res.json();
    if (res.ok) { toast.success('3 questions generated!', { id: t }); fetchQuestions(); }
    else        { toast.error(data.error || 'Generation failed', { id: t }); }
    setGenerating(false);
  };

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: 'pending',  label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Question Review</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Review, approve, or reject AI-generated Bible quiz questions</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={fetchQuestions} className="btn-ghost" style={{ fontSize: 13 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            Generate{dateFilter ? ` for ${dateFilter}` : " Today's"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="glass-input" style={{ padding: '7px 12px', fontSize: 13, width: 160 }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="glass-input" style={{ padding: '7px 12px', fontSize: 13 }}>
          <option value="">All Categories</option>
          <option value="OT">Old Testament</option>
          <option value="NT-Gospel">Gospel</option>
          <option value="NT-Other">NT Other</option>
        </select>
        {(dateFilter || catFilter) && (
          <button className="btn-ghost" onClick={() => { setDateFilter(''); setCatFilter(''); }} style={{ fontSize: 12 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: tab === t.key ? 700 : 400, fontFamily: 'inherit',
              color: tab === t.key ? 'var(--indigo)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--indigo)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s ease',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Questions list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p>Loading questions…</p>
        </div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <BookOpen size={44} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No {tab} questions</p>
          {tab === 'pending' && (
            <p style={{ fontSize: 13 }}>Generate questions using the button above to start the review process.</p>
          )}
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map(q => (
            <QuestionCard key={q.id} q={q}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={id => router.push(`/questions/${id}`)}
            />
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading questions…
      </div>
    }>
      <QuestionsInner />
    </Suspense>
  );
}
