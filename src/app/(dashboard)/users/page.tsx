'use client';

import { useEffect, useState, useRef } from 'react';
import { UsersRound, Plus, Upload, Search, Trash2, ToggleLeft, ToggleRight, Loader2, X, Phone, User, Globe, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type QuizUser = {
  id: string; name: string; phone: string; status: 'active' | 'inactive';
  language: string; joined_date: string; last_active: string | null;
};

export default function UsersPage() {
  const [users, setUsers]         = useState<QuizUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [showBulk, setShowBulk]   = useState(false);
  const [csvText, setCsvText]     = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add user form
  const [form, setForm] = useState({ name: '', phone: '', language: 'hi' });
  const [adding, setAdding] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res  = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone required');
    const phone = form.phone.replace(/\D/g, '');
    if (phone.length < 10) return toast.error('Enter valid phone number');
    setAdding(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), phone: phone.startsWith('91') ? phone : `91${phone}`, language: form.language }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('User added ✅');
      setForm({ name: '', phone: '', language: 'hi' });
      setShowAdd(false);
      fetchUsers();
    } else {
      toast.error(data.error || 'Failed to add user');
    }
    setAdding(false);
  }

  async function handleToggle(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) { toast.success(`User ${next}`); fetchUsers(); }
    else { toast.error('Update failed'); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('User deleted'); fetchUsers(); }
    else { toast.error('Delete failed'); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleBulkImport() {
    if (!csvText.trim()) return toast.error('No CSV data');
    setImporting(true);
    const res = await fetch('/api/users/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvText }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`✅ Imported ${data.imported} users (${data.skipped} skipped)`);
      setShowBulk(false); setCsvText(''); fetchUsers();
    } else {
      toast.error(data.error || 'Import failed');
    }
    setImporting(false);
  }

  const activeCount   = users.filter(u => u.status === 'active').length;
  const inactiveCount = users.filter(u => u.status === 'inactive').length;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UsersRound size={22} style={{ color: 'var(--primary-light)' }} />
            User Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {activeCount} active · {inactiveCount} inactive · {users.length} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowBulk(true)} className="btn-ghost" style={{ fontSize: 13 }}>
            <Upload size={14} /> Bulk Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text" placeholder="Search by name or phone…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="glass-input"
          style={{ flex: 1, border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13.5, outline: 'none' }}
        />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p>Loading users…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <UsersRound size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{search ? 'No users found' : 'No users yet'}</p>
              <p style={{ fontSize: 13 }}>{search ? 'Try a different search' : 'Add users individually or bulk import a CSV'}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.phone}</td>
                    <td>
                      <span className="badge badge-active">{u.language?.toUpperCase() || 'HI'}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.status === 'active' ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.joined_date ? new Date(u.joined_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => handleToggle(u.id, u.status)}
                          title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.status === 'active' ? 'var(--green)' : 'var(--text-muted)', padding: 4 }}>
                          {u.status === 'active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.name)}
                          title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CSV template download helper */}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        CSV format: <code style={{ background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 }}>name,phone,language</code> &nbsp;
        Phone: country code + number (e.g. 919993612014) · Language: hi / en
      </div>

      {/* ── Add User Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Add User</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Full Name *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="text" placeholder="e.g. Rajesh Kumar" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="glass-input" style={{ flex: 1, padding: '9px 12px', fontSize: 13.5 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>WhatsApp Phone *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="tel" placeholder="e.g. 9993612014 (Indian number)" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="glass-input" style={{ flex: 1, padding: '9px 12px', fontSize: 13.5 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Will be stored as 91XXXXXXXXXX</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Language</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    className="glass-input" style={{ flex: 1, padding: '9px 12px', fontSize: 13.5 }}>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                <button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleAdd} disabled={adding} className="btn-primary" style={{ flex: 2 }}>
                  {adding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ── */}
      {showBulk && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulk(false)}>
          <div className="modal-box">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Bulk Import Users</div>
              <button onClick={() => setShowBulk(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 12, background: 'rgba(37,99,235,0.08)', borderRadius: 10, border: '1px solid rgba(37,99,235,0.15)', fontSize: 12.5, color: 'var(--text-sub)' }}>
                <strong>CSV Format (first row = header):</strong><br />
                <code style={{ fontSize: 12 }}>name,phone,language</code><br />
                <code style={{ fontSize: 12 }}>Rajesh Kumar,919993612014,hi</code><br />
                <code style={{ fontSize: 12 }}>Priya Singh,917654321098,en</code>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Upload CSV File or Paste CSV Data
                </label>
                <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                  <Upload size={14} /> Choose CSV File
                </button>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                <textarea
                  value={csvText} onChange={e => setCsvText(e.target.value)}
                  placeholder="Or paste CSV data here…"
                  className="glass-input"
                  style={{ width: '100%', minHeight: 140, padding: '10px 12px', fontSize: 12.5, resize: 'vertical', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowBulk(false); setCsvText(''); }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleBulkImport} disabled={importing || !csvText.trim()} className="btn-primary" style={{ flex: 2 }}>
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                  Import Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
