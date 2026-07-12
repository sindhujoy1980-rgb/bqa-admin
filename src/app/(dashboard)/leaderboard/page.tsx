'use client';

import { useEffect, useState } from 'react';
import { Trophy, Loader2, RefreshCw, Medal } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';

type ScoreRow = {
  id: string; rank: number | null; score: number; percentage: number;
  submitted_time: string; total_time_sec: number | null;
  users: { name: string; phone: string; church: string | null; city: string | null } | null;
};

const RANK_COLORS: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#b45309' };
const SCORE_COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981'];

export default function LeaderboardPage() {
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    const res  = await fetch(`/api/scores?date=${date}`);
    const data = await res.json();
    setScores(data.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchScores(); }, [date]);

  const total    = scores.length;
  const avgScore = total ? (scores.reduce((s, r) => s + r.score, 0) / total).toFixed(2) : '0';
  const perfect  = scores.filter(s => s.score === 1).length;  // max score is 1

  // Score distribution chart data (0 = incorrect, 1 = correct)
  const distData = [0, 1].map(s => ({
    name: s === 1 ? 'Correct' : 'Incorrect', count: scores.filter(r => r.score === s).length,
  }));

  // Church ranking data
  const churchMap: Record<string, { total: number; count: number }> = {};
  scores.forEach(s => {
    const c = s.users?.church || 'Unknown';
    if (!churchMap[c]) churchMap[c] = { total: 0, count: 0 };
    churchMap[c].total += s.score;
    churchMap[c].count++;
  });
  const churchData = Object.entries(churchMap)
    .map(([name, v]) => ({ name, avg: parseFloat((v.total / v.count).toFixed(2)) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 8);

  const maskPhone = (phone: string) => phone.slice(0, 4) + '****' + phone.slice(-2);

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Leaderboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Live quiz rankings and score analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="glass-input" style={{ padding: '8px 12px', fontSize: 13 }} />
          <button onClick={fetchScores} className="btn-ghost" style={{ fontSize: 13 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Participants', value: total,    color: '#6366f1', icon: '👥' },
          { label: 'Avg Score',    value: avgScore, color: '#10b981', icon: '📊' },
          { label: 'Perfect 3/3',  value: perfect,  color: '#f59e0b', icon: '⭐' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="stat-card fade-up" style={{ padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* Score distribution */}
        <div className="glass-card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14 }}>Score Distribution</span>
          </div>
          <div style={{ padding: '20px 20px 12px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#3d4966', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3d4966', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
                  labelStyle={{ color: '#eef2ff', fontWeight: 700 }}
                  itemStyle={{ color: '#8892b0' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distData.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Church rankings */}
        <div className="glass-card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14 }}>Top Churches</span>
          </div>
          <div style={{ padding: 16 }}>
            {churchData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
            ) : (
              churchData.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < churchData.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 14, width: 24, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo)' }}>{c.avg}/3</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')} Rankings
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} participants</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Trophy size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No scores yet for this date.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Church</th>
                  <th>City</th>
                  <th>Score</th>
                  <th>%</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {scores.map(s => {
                  const rank = s.rank ?? 0;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {rank <= 3
                            ? <Medal size={14} style={{ color: RANK_COLORS[rank] }} />
                            : null}
                          <span style={{ fontWeight: rank <= 3 ? 700 : 400, color: RANK_COLORS[rank] || 'var(--text)' }}>
                            #{rank}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.users?.name ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{s.users?.phone ? maskPhone(s.users.phone) : '—'}</td>
                      <td>{s.users?.church ?? '—'}</td>
                      <td>{s.users?.city ?? '—'}</td>
                      <td>
                        <span style={{
                          fontWeight: 800, fontSize: 14,
                          color: s.score === 3 ? '#10b981' : s.score === 2 ? '#6366f1' : s.score === 1 ? '#f59e0b' : '#ef4444',
                        }}>
                          {s.score}/3
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-sub)' }}>{s.percentage}%</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {s.total_time_sec != null ? `${s.total_time_sec}s` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
