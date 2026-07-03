'use client';

import Sidebar from '@/components/Sidebar';
import { useState, useEffect, createContext, useContext } from 'react';
import { Toaster } from 'react-hot-toast';

// ── Theme Context ─────────────────────────────────────
type Theme = 'dark' | 'light';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Load saved theme
  useEffect(() => {
    const saved = (localStorage.getItem('bqa-theme') as Theme) || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('bqa-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Ambient gradient */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 15% 10%, var(--ambient-1) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 80% 85%, var(--ambient-3) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 60% 0%,  var(--ambient-2) 0%, transparent 60%)
          `,
          transition: 'background 0.3s ease',
        }} />

        <Sidebar />

        <main style={{
          flex: 1,
          marginLeft: '248px',
          transition: 'margin-left 0.28s cubic-bezier(.4,0,.2,1)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}>
          {children}
        </main>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13.5px',
              backdropFilter: 'blur(12px)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </div>
    </ThemeCtx.Provider>
  );
}
