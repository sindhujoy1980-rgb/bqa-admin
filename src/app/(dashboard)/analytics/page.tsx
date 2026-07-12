'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BarChart2, Users, TrendingUp, Award, RefreshCw, CheckCircle,
} from 'lucide-react';

type DailyStat  = { date: string; total: number; correct: number; incorrect: number; pct: number };
type ChurchStat = { church: string; total: number; correct: number; pct: number };
type TopScorer  = { name: string; phone: string; score: number; date: string };

const RANGE_OPTS = [
  { label: '7 Days',  days: 7  },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'All',     days: 365 },
];
const C = { correct: '#10b981', incorrect: '#ef4444', total: '#6366f1', accent: '#f59e0b' };

function KpiCard({ label, value, sub, color, Icon }: {
  label: string; value: string | number; sub?: string; color: string; Icon: React.ElementType;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 160,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}22`, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [rangeDays,   setRangeDays]   = useState(30);
  const [dailyStats,  setDailyStats]  = useState<DailyStat[]>([]);
  const [churchStats, setChurchStats] = useState<ChurchStat[]>([]);
  const [topScorers,  setTopScorers]  = useState<TopScorer[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);
      const sinceStr = since.toISOString().split('T')[0];
      const today    = new Date().toISOString().split('T')[0];

      const res  = await fetch(`/api/scores?since=${sinceStr}&limit=2000`);
      const json = await res.json();
      const rows: any[] = json.data || [];

      // --- Daily stats ---
      const byDate: Record<string, { total: number; correct: number }> = {};
      rows.forEach((r: any) => {
        const dt = r.quiz_date || r.created_at?.slice(0, 10) || '';
        if (!dt || dt < sinceStr) return;
        if (!byDate[dt]) byDate[dt] = { total: 0, correct: 0 };
        byDate[dt].total++;
        if (r.score >= 1) byDate[dt].correct++;
      });
      const allDates: string[] = [];
      const iter = new Date(sinceStr);
      while (iter.toISOString().split('T')[0] <= today) {
        allDates.push(iter.toISOString().split('T')[0]);
        iter.setDate(iter.getDate() + 1);
      }
      setDailyStats(allDates.filter(d => byDate[d]).map(dt => ({
        date: dt.slice(5), total: byDate[dt].total,
        correct: byDate[dt].correct, incorrect: byDate[dt].total - byDate[dt].correct,
        pct: byDate[dt].total ? Math.round((byDate[dt].correct / byDate[dt].total) * 100) : 0,
      })));

      // --- Church stats ---
      const byChurch: Record<string, { total: number; correct: number }> = {};
      rows.forEach((r: any) => {
        const ch = r.users?.church || 'Unknown';
        if (!byChurch[ch]) byChurch[ch] = { total: 0, correct: 0 };
        byChurch[ch].total++;
        if (r.score >= 1) byChurch[ch].correct++;
      });
      setChurchStats(Object.entries(byChurch)
        .map(([church, v]) => ({ church, ...v, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0 }))
        .sort((a, b) => b.pct - a.pct || b.total - a.total));

      // --- Top scorers ---
      const seen = new Set<string>();
      setTopScorers(rows
        .filter((r: any) => r.score >= 1 && r.users?.name)
        .filter((r: any) => { const k = r.users.phone; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 10)
        .map((r: any) => ({ name: r.users.name, phone: r.users.phone, score: r.score, date: r.quiz_date || r.created_at?.slice(0, 10) })));
    } catch (e) {
      console.error('[Analytics]', e);
    } finally { setLoading(false); setRefreshing(false); }
  }, [rangeDays]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const totalP   = dailyStats.reduce((s, d) => s + d.total, 0);
  const totalC   = dailyStats.reduce((s, d) => s + d.correct, 0);
  const pct      = totalP ? Math.round((totalC / totalP) * 100) : 0;
  const actDays  = dailyStats.filter(d => d.total > 0).length;
  const avgPerD  = actDays ? Math.round(totalP / actDays) : 0;
  const pieData  = [{ name: 'Correct', value: totalC }, { name: 'Incorrect', value: totalP - totalC }];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#6366f1',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Result Analytics</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Quiz performance insights &mdash; last {rangeDays} days
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {RANGE_OPTS.map(o => (
            <button key={o.days} onClick={() => setRangeDays(o.days)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: rangeDays === o.days ? '#6366f1' : 'var(--bg-card)',
              color: rangeDays === o.days ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
            }}>{o.label}</button>
          ))}
          <button onClick={() => fetchAnalytics(true)} disabled={refreshing} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
          }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="Total Participations"   value={totalP}           sub={`Last ${rangeDays} days`}           color="#6366f1" Icon={Users}       />
        <KpiCard label="Correct Answers"        value={`${pct}%`}        sub={`${totalC} of ${totalP}`}          color="#10b981" Icon={CheckCircle}  />
        <KpiCard label="Avg / Active Day"       value={avgPerD}          sub={`${actDays} active days`}          color="#f59e0b" Icon={TrendingUp}   />
        <KpiCard label="Churches Represented"  value={churchStats.length} sub="Across all dates"                color="#8b5cf6" Icon={Award}        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 18 }}>
        <Section title="📈 Daily Participation Trend">
          {dailyStats.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyStats} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.correct} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.correct} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.total}   stopOpacity={0.3}  />
                      <stop offset="95%" stopColor={C.total}   stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, n: string) => [v, n === 'total' ? 'Total' : 'Correct']} />
                  <Area type="monotone" dataKey="total"   stroke={C.total}   fill="url(#gT)" strokeWidth={2} name="total"   />
                  <Area type="monotone" dataKey="correct" stroke={C.correct} fill="url(#gC)" strokeWidth={2} name="correct" />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </Section>

        <Section title="🎯 Score Split">
          {totalP === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
            : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" paddingAngle={3} stroke="none">
                      <Cell fill={C.correct} />
                      <Cell fill={C.incorrect} />
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: i === 0 ? C.correct : C.incorrect }} />
                      <span style={{ color: 'var(--text-muted)' }}>{d.name}: <b style={{ color: 'var(--text)' }}>{d.value}</b></span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </Section>
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Church performance */}
        <Section title="⛪ Church-wise Performance">
          {churchStats.length === 0
            ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
            : (
              <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Church','Participants','Correct','Accuracy'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {churchStats.map((ch, i) => (
                      <tr key={ch.church} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 8px', color: 'var(--text)', fontWeight: 600, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] + ' ' : ''}{ch.church}
                        </td>
                        <td style={{ padding: '7px 8px', color: 'var(--text-muted)' }}>{ch.total}</td>
                        <td style={{ padding: '7px 8px', color: C.correct }}>{ch.correct}</td>
                        <td style={{ padding: '7px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)' }}>
                              <div style={{ width: `${ch.pct}%`, height: '100%', borderRadius: 3, background: ch.pct >= 70 ? C.correct : ch.pct >= 40 ? C.accent : C.incorrect }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 30 }}>{ch.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Section>

        {/* Top performers */}
        <Section title="🏆 Top Performers">
          {topScorers.length === 0
            ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
            : (
              <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                {topScorers.map((s, i) => (
                  <div key={s.phone + s.date} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                    borderBottom: i < topScorers.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: i < 3 ? `${['#f59e0b','#94a3b8','#b45309'][i]}22` : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800,
                      color: i < 3 ? ['#f59e0b','#94a3b8','#b45309'][i] : 'var(--text-muted)',
                    }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.date}</div>
                    </div>
                    <div style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: `${C.correct}22`, color: C.correct }}>
                      {s.score} ✓
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Section>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}