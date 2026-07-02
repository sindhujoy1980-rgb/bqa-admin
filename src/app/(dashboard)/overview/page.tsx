'use client';

import { useEffect, useState } from 'react';
import { Users, BookOpen, CheckSquare, BarChart3, Sparkles, Calendar, Trophy, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Stats = {
  totalUsers: number;
  activeUsers: number;
  pendingQuestions: number;
  todayParticipants: number;
  avgScore: string;
  perfectScores: number;
  publishedThisWeek: number;
  recentQuizzes: Array<{ quiz_date: string; published: boolean; question_stats: { pending: number; approved: number } }>;
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="stat-card fade-up" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}18`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-sub)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  async function fetchStats() {
    setLoading(true);
    const res  = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    const t = toast.loading('Generating questions with Gemini AI…');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Generation failed', { id: t });
      } else {
        toast.success('✅ 3 questions generated for today!', { id: t });
        fetchStats();
      }
    } catch {
      toast.error('Network error', { id: t });
    } finally {
      setGenerating(false);
    }
  }

  const dateLabel = format(new Date(), 'EEEE, MMMM d yyyy');

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div className="dot-live" />
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Live</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            Dashboard Overview
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{dateLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={fetchStats} disabled={loading} className="btn-ghost" style={{ fontSize: 13 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
            Generate Today&apos;s Questions
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users}       label="Total Participants" value={loading ? '—' : (stats?.totalUsers ?? 0)}      sub={`${stats?.activeUsers ?? 0} active`} color="#6366f1" />
        <StatCard icon={BarChart3}   label="Today's Players"   value={loading ? '—' : (stats?.todayParticipants ?? 0)} sub={`Avg score: ${stats?.avgScore ?? 0}/3`} color="#10b981" />
        <StatCard icon={Trophy}      label="Perfect Scores"    value={loading ? '—' : (stats?.perfectScores ?? 0)}    sub="3/3 today" color="#f59e0b" />
        <StatCard icon={CheckSquare} label="Pending Review"    value={loading ? '—' : (stats?.pendingQuestions ?? 0)} sub="Questions awaiting" color="#ef4444" />
        <StatCard icon={Calendar}    label="Published This Week" value={loading ? '—' : (stats?.publishedThisWeek ?? 0)} sub="Quizzes" color="#8b5cf6" />
      </div>

      {/* Recent Quizzes Table */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--indigo)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Quiz Dates</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !stats?.recentQuizzes?.length ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No quizzes yet. Generate questions to get started.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Approved</th>
                  <th>Pending</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentQuizzes.map(q => (
                  <tr key={q.quiz_date}>
                    <td style={{ fontWeight: 600 }}>{format(new Date(q.quiz_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                    <td>
                      <span className={`badge ${q.published ? 'badge-approved' : 'badge-pending'}`}>
                        {q.published ? '✅ Published' : '⏳ Draft'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--green)' }}>{q.question_stats?.approved ?? 0}/3</td>
                    <td>
                      {(q.question_stats?.pending ?? 0) > 0 && (
                        <span style={{ color: 'var(--amber)' }}>{q.question_stats.pending} pending</span>
                      )}
                    </td>
                    <td>
                      <a href={`/questions?date=${q.quiz_date}`}
                        style={{ fontSize: 12, color: 'var(--indigo)', textDecoration: 'none', fontWeight: 600 }}>
                        Review →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {[
          { href: '/questions', icon: CheckSquare, label: 'Review Questions', desc: 'Approve or reject AI-generated questions', color: '#6366f1' },
          { href: '/schedule',  icon: Calendar,    label: 'Quiz Calendar',    desc: 'Publish quizzes and manage schedule',       color: '#10b981' },
          { href: '/leaderboard', icon: Trophy,    label: 'Leaderboard',      desc: "View today's scores and rankings",          color: '#f59e0b' },
          { href: '/participants', icon: Users,    label: 'Participants',     desc: 'Manage WhatsApp quiz users',                 color: '#8b5cf6' },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <a key={href} href={href} className="glass-card fade-up"
            style={{ padding: 20, textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `${color}18`, border: `1px solid ${color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
          </a>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
