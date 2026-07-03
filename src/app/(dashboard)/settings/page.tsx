'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Save, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  // Gemini key section
  const [geminiKey, setGeminiKey]   = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [savedKey, setSavedKey]     = useState('');
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [savingKey, setSavingKey]   = useState(false);

  // Password change section
  const [pwForm, setPwForm]         = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw]         = useState({ current: false, next: false, confirm: false });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    // Load current masked key
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.gemini_key_masked) setSavedKey(d.gemini_key_masked);
    }).catch(() => {});
  }, []);

  async function testKey() {
    if (!geminiKey.trim()) return toast.error('Enter a key first');
    setTesting(true); setTestResult(null);
    const res = await fetch('/api/settings/test-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: geminiKey }),
    });
    const data = await res.json();
    setTestResult(data.ok ? 'ok' : 'fail');
    if (data.ok) toast.success('✅ Gemini key is working!');
    else         toast.error(`❌ Key failed: ${data.error || 'Invalid key'}`);
    setTesting(false);
  }

  async function saveKey() {
    if (!geminiKey.trim()) return toast.error('Enter a key');
    if (testResult !== 'ok') {
      toast.error('Please test the key first to verify it works');
      return;
    }
    setSavingKey(true);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_key: geminiKey }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('✅ Gemini key saved!');
      setSavedKey(geminiKey.slice(0, 6) + '…' + geminiKey.slice(-4));
      setGeminiKey('');
      setTestResult(null);
    } else {
      toast.error(data.error || 'Save failed');
    }
    setSavingKey(false);
  }

  async function changePassword() {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) return toast.error('All fields required');
    if (pwForm.next !== pwForm.confirm) return toast.error('New passwords do not match');
    if (pwForm.next.length < 8) return toast.error('Password must be at least 8 characters');
    setChangingPw(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('✅ Password changed!');
      setPwForm({ current: '', next: '', confirm: '' });
    } else {
      toast.error(data.error || 'Failed to change password');
    }
    setChangingPw(false);
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} style={{ color: 'var(--primary-light)' }} />
          Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage API keys and security settings</p>
      </div>

      {/* ── Gemini API Key ── */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} style={{ color: 'var(--amber)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Gemini AI Key</span>
          </div>
          {savedKey && (
            <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'monospace' }}>
              Current: {savedKey}
            </span>
          )}
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            Get your key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
              aistudio.google.com
            </a>. The key will be tested before saving.
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Paste new Gemini API key…"
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); setTestResult(null); }}
              className="glass-input"
              style={{ width: '100%', padding: '10px 40px 10px 14px', fontSize: 13.5, fontFamily: 'monospace' }}
            />
            <button onClick={() => setShowKey(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {testResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
              color: testResult === 'ok' ? 'var(--green)' : 'var(--red)' }}>
              {testResult === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {testResult === 'ok' ? 'Key verified — ready to save!' : 'Key test failed — check the key and try again'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={testKey} disabled={testing || !geminiKey.trim()} className="btn-ghost" style={{ flex: 1 }}>
              {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube size={14} />}
              Test Key
            </button>
            <button onClick={saveKey} disabled={savingKey || testResult !== 'ok'} className="btn-primary" style={{ flex: 2 }}>
              {savingKey ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Save Key
            </button>
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} style={{ color: 'var(--primary-light)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Change Password</span>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['current', 'next', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {field === 'current' ? 'Current Password' : field === 'next' ? 'New Password' : 'Confirm New Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw[field] ? 'text' : 'password'}
                  placeholder={field === 'current' ? 'Enter current password' : field === 'next' ? 'At least 8 characters' : 'Repeat new password'}
                  value={pwForm[field]}
                  onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 40px 10px 14px', fontSize: 13.5 }}
                />
                <button onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <button onClick={changePassword} disabled={changingPw} className="btn-primary">
            {changingPw ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Change Password
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
