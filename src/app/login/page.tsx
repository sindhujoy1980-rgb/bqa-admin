'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BookOpen, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push('/overview');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '20px',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(99,102,241,0.13) 0%, transparent 60%),
          radial-gradient(ellipse 50% 45% at 80% 80%, rgba(245,158,11,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 60% 10%, rgba(139,92,246,0.08) 0%, transparent 60%)
        `,
      }} />

      {/* Floating book particles */}
      {['✝', '📖', '✨', '☀', '🕊'].map((sym, i) => (
        <div key={i} style={{
          position: 'absolute', fontSize: i % 2 === 0 ? 28 : 20, opacity: 0.06,
          top: `${[15, 70, 30, 80, 55][i]}%`, left: `${[5, 88, 92, 10, 50][i]}%`,
          animation: `fadeUp ${3 + i * 0.5}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.7}s`,
        }}>{sym}</div>
      ))}

      <div className="fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(245,158,11,0.15))',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
          }}>
            <Image src="/logo.png" alt="BQA" width={68} height={68}
              style={{ borderRadius: 16, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#eef2ff', marginBottom: 4 }}>
            BQA Admin
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Bible Quiz Automation Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Sign in to manage the quiz system
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="glass-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="glass-input"
                  style={{ width: '100%', padding: '10px 42px 10px 14px', fontSize: 14 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button id="btn-login" type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4 }}>
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                : <><BookOpen size={16} /> Sign In</>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11.5, color: 'var(--text-muted)' }}>
          BQA Admin Portal · Bible Quiz Automation System
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
