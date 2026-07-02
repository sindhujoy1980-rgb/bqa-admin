'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, Download, ShieldBan, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { BqaUser } from '@/lib/supabase';

export default function ParticipantsPage() {
  const [users, setUsers]     = useState<BqaUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res  = await fetch(`/api/participants?${params}`);
    const data = await res.json();
    setUsers(data.data || []);
    setTotal(data.count || 0);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setBusyId(id);
    const res  = await fetch('/api/participants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`User ${newStatus}`);
      fetchUsers();
    } else {
      toast.error(data.error || 'Failed');
    }
    setBusyId(null);
  };

  const handleExport = () => {
    const rows = [
      ['Name', 'Phone', 'Church', 'City', 'Joined', 'Last Active', 'Status'],
      ...users.map(u => [
        u.name, u.phone, u.church || '', u.city || '',
        format(new Date(u.joined_date), 'yyyy-MM-dd'),
        u.last_active ? format(new Date(u.last_active), 'yyyy-MM-dd') : '',
        u.status,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bqa-participants-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const LIMIT = 50;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Participants</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {total.toLocaleString()} registered WhatsApp users
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={fetchUsers} className="btn-ghost" style={{ fontSize: 13 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleExport} className="btn-ghost" style={{ fontSize: 13 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, church…"
            className="glass-input"
            style={{ width: '100%', padding: '8px 12px 8px 34px', fontSize: 13 }}
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="glass-input" style={{ padding: '8px 12px', fontSize: 13 }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} style={{ color: 'var(--indigo)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Users</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {users.length} of {total}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No participants found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Church</th>
                  <th>City</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{u.phone}</td>
                    <td>{u.church || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{u.city || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>
                      {format(new Date(u.joined_date), 'MMM d, yyyy')}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>
                      {u.last_active ? format(new Date(u.last_active), 'MMM d') : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${u.status === 'active' ? 'approved' : u.status === 'blocked' ? 'rejected' : 'pending'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      {busyId === u.id ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
                      ) : u.status === 'blocked' ? (
                        <button className="btn-success" onClick={() => handleStatusChange(u.id, 'active')} style={{ fontSize: 11 }}>
                          <ShieldCheck size={12} /> Unblock
                        </button>
                      ) : (
                        <button className="btn-danger" onClick={() => handleStatusChange(u.id, 'blocked')} style={{ fontSize: 11 }}>
                          <ShieldBan size={12} /> Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <button className="btn-ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ fontSize: 13 }}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ fontSize: 13 }}>Next →</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
