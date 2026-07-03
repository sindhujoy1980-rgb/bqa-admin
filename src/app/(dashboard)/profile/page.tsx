'use client';

import { useState, useEffect } from 'react';
import { UserCircle, Mail, Shield, Clock, Save, Loader2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type AdminProfile = {
  id: string; name: string; email: string; role: string;
  created_at: string; last_login: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile]   = useState<AdminProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.data) {
        setProfile(d.data);
        setForm({ name: d.data.name, email: d.data.email });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email required');
    setSaving(true);
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('✅ Profile updated!');
      setProfile(p => p ? { ...p, name: form.name, email: form.email } : p);
      setEditing(false);
    } else {
      toast.error(data.error || 'Update failed');
    }
    setSaving(false);
  }

  const initials = profile?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <div style={{ padding: '32px 28px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCircle size={22} style={{ color: 'var(--primary-light)' }} />
          My Profile
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your admin account details</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p>Loading profile…</p>
        </div>
      ) : (
        <>
          {/* Avatar card */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{profile?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{profile?.email}</div>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                fontSize: 11, fontWeight: 700,
                background: 'rgba(37,99,235,0.15)', color: '#60a5fa',
                border: '1px solid rgba(37,99,235,0.25)',
              }}>{profile?.role?.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>

          {/* Profile form */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={15} style={{ color: 'var(--primary-light)' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Account Details</span>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
                  <Edit3 size={13} /> Edit
                </button>
              )}
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Full Name</label>
                {editing ? (
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="glass-input" style={{ width: '100%', padding: '9px 14px', fontSize: 13.5 }} />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '9px 0' }}>{profile?.name}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Email Address (Login)
                </label>
                {editing ? (
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="glass-input" style={{ width: '100%', padding: '9px 14px', fontSize: 13.5 }} />
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--text)', padding: '9px 0' }}>{profile?.email}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Role
                </label>
                <div style={{ fontSize: 14, color: 'var(--text-sub)', padding: '9px 0' }}>{profile?.role?.replace('_', ' ')}</div>
              </div>

              {editing && (
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setEditing(false); setForm({ name: profile?.name ?? '', email: profile?.email ?? '' }); }}
                    className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 2 }}>
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account meta */}
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>
                <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Account Created
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {profile?.created_at ? format(new Date(profile.created_at), 'MMM d, yyyy') : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>
                Last Login
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {profile?.last_login ? format(new Date(profile.last_login), 'MMM d, yyyy · h:mm a') : '—'}
              </div>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
