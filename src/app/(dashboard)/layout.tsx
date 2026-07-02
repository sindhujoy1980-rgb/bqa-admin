'use client';

import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Ambient gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 55% at 15% 10%, rgba(99,102,241,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 55% 45% at 80% 85%, rgba(245,158,11,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 60% 0%,  rgba(139,92,246,0.06) 0%, transparent 60%)
        `,
        transition: 'background 0.3s ease',
      }} />

      <Sidebar />

      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? '248px' : '62px',
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
            background: 'rgba(15,20,40,0.95)',
            color: '#eef2ff',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            fontSize: '13.5px',
            backdropFilter: 'blur(12px)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}
