'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckSquare, XSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BqaQuestion } from '@/lib/supabase';

export default function EditQuestionPage() {
  const { id }   = useParams() as { id: string };
  const router   = useRouter();
  const [q, setQ]           = useState<BqaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then(r => r.json())
      .then(d => { setQ(d.data); setLoading(false); });
  }, [id]);

  const update = (field: string, value: string) => {
    setQ(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!q) return;
    setSaving(true);
    const res = await fetch(`/api/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: q.question_text,
        option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer,
        verse_reference: q.verse_reference,
        explanation: q.explanation,
        difficulty: q.difficulty,
        topic_tag: q.topic_tag,
        english_question: q.english_question,
      }),
    });
    if (res.ok) { toast.success('Question saved ✅'); }
    else { const d = await res.json(); toast.error(d.error || 'Save failed'); }
    setSaving(false);
  };

  const handleApprove = async () => {
    await handleSave();
    const res = await fetch(`/api/questions/${id}/approve`, { method: 'POST' });
    if (res.ok) { toast.success('Approved ✅'); router.push('/questions'); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleReject = async () => {
    const res = await fetch(`/api/questions/${id}/reject`, { method: 'POST' });
    if (res.ok) { toast.success('Rejected'); router.push('/questions'); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 700, color: 'var(--text-sub)',
    textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6, display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif',
  };
  const taStyle: React.CSSProperties = { ...inputStyle, minHeight: 90, resize: 'vertical' };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!q) return <div style={{ padding: 40, color: 'var(--red)' }}>Question not found.</div>;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 860, margin: '0 auto' }}>
      <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: 24, fontSize: 13 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', flex: 1 }}>Edit Question</h1>
        <span className={`badge badge-${q.category === 'OT' ? 'ot' : q.category === 'NT-Gospel' ? 'gospel' : 'nt'}`}>
          Slot {q.slot} · {q.category}
        </span>
        <span className={`badge badge-${q.status}`}>{q.status}</span>
      </div>

      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div>
            <label style={labelStyle}>Question Text (Hindi / Devanagari)</label>
            <textarea value={q.question_text} onChange={e => update('question_text', e.target.value)}
              className="glass-input" style={taStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {(['a', 'b', 'c', 'd'] as const).map(opt => (
              <div key={opt}>
                <label style={labelStyle}>Option {opt.toUpperCase()}</label>
                <textarea value={q[`option_${opt}` as keyof BqaQuestion] as string}
                  onChange={e => update(`option_${opt}`, e.target.value)}
                  className="glass-input" style={{ ...taStyle, minHeight: 70 }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Correct Answer</label>
              <select value={q.correct_answer} onChange={e => update('correct_answer', e.target.value)}
                className="glass-input" style={inputStyle}>
                {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={q.difficulty} onChange={e => update('difficulty', e.target.value)}
                className="glass-input" style={inputStyle}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Verse Reference</label>
              <input value={q.verse_reference} onChange={e => update('verse_reference', e.target.value)}
                className="glass-input" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Explanation (Hindi)</label>
            <textarea value={q.explanation || ''} onChange={e => update('explanation', e.target.value)}
              className="glass-input" style={{ ...taStyle, minHeight: 80 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Topic Tag (English)</label>
              <input value={q.topic_tag || ''} onChange={e => update('topic_tag', e.target.value)}
                className="glass-input" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>English Question (for reference)</label>
              <input value={q.english_question || ''} onChange={e => update('english_question', e.target.value)}
                className="glass-input" style={inputStyle} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Save Changes
            </button>
            {q.status === 'pending' && (
              <>
                <button onClick={handleApprove} className="btn-success" disabled={saving}>
                  <CheckSquare size={14} /> Save & Approve
                </button>
                <button onClick={handleReject} className="btn-danger" disabled={saving}>
                  <XSquare size={14} /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
