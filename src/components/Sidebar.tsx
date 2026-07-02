'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CheckSquare, Calendar, Trophy, Users,
  PanelLeftClose, PanelLeftOpen, LogOut, ChevronUp, BookOpen,
} from 'lucide-react';

const NAV = [
  { section: 'Overview', items: [
    { name: 'Dashboard',        path: '/overview',      Icon: LayoutDashboard },
  ]},
  { section: 'Quiz Management', items: [
    { name: 'Question Review',  path: '/questions',     Icon: CheckSquare },
    { name: 'Quiz Schedule',    path: '/schedule',      Icon: Calendar },
  ]},
  { section: 'Analytics', items: [
    { name: 'Leaderboard',      path: '/leaderboard',   Icon: Trophy },
    { name: 'Participants',     path: '/participants',  Icon: Users },
  ]},
];

type Admin = { name: string; role: string; email: string };

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]           = useState(true);
  const [admin, setAdmin]         = useState<Admin | null>(null);
  const [showAccount, setShowAcc] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.data) setAdmin(d.data); }).catch(() => {});
  }, []);

  useEffect(() => { if (!open) setShowAcc(false); }, [open]);

  const initials = admin ? admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const W = open ? 248 : 62;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/login', { method: 'DELETE' }).catch(() => {});
    router.push('/login');
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: W,
      transition: 'width 0.28s cubic-bezier(.4,0,.2,1)',
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', zIndex: 50, overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -60, left: -60, width: 220, height: 220,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, right: -60, width: 200, height: 200,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: open ? '0 12px 0 14px' : '0',
        justifyContent: open ? 'space-between' : 'center',
        height: 58, borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 1,
        transition: 'padding 0.28s cubic-bezier(.4,0,.2,1)',
      }}>
        {open ? (
          <Link href="/overview" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Image src="/logo.png" alt="BQA" width={32} height={32}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#eef2ff', whiteSpace: 'nowrap', lineHeight: 1.2 }}>BQA Admin</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', lineHeight: 1.3 }}>Bible Quiz Automation</div>
            </div>
          </Link>
        ) : (
          <Link href="/overview" style={{ display: 'flex' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Image src="/logo.png" alt="BQA" width={32} height={32}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
          </Link>
        )}

        <button onClick={() => setOpen(v => !v)} title={open ? 'Collapse' : 'Expand'}
          style={{
            width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s ease',
          }}>
          {open ? <PanelLeftClose size={14} strokeWidth={1.8} /> : <PanelLeftOpen size={14} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: open ? '8px 10px' : '8px 8px',
        position: 'relative', zIndex: 1, scrollbarWidth: 'none',
      }}>
        {NAV.map((sec, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            {open ? (
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.2px', color: 'var(--text-muted)',
                padding: '8px 8px 4px',
              }}>{sec.section}</div>
            ) : (
              si > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 6px 8px' }} />
            )}

            {sec.items.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              const { Icon } = item;
              return (
                <Link key={item.path} href={item.path} title={!open ? item.name : undefined}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: open ? 10 : 0,
                    justifyContent: open ? 'flex-start' : 'center',
                    padding: open ? '8px 10px' : '9px 0',
                    borderRadius: 10, marginBottom: 1,
                    textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#c7d0f8' : 'var(--text-muted)',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(99,102,241,0.16), rgba(99,102,241,0.04))'
                      : 'transparent',
                    borderLeft: isActive && open ? '2px solid var(--indigo)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.6}
                    style={{ flexShrink: 0, color: isActive ? 'var(--indigo)' : 'inherit', transition: 'color 0.15s' }} />
                  {open && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>}
                  {open && isActive && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--indigo)', boxShadow: '0 0 8px rgba(99,102,241,0.9)',
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Account */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {showAccount && open && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 6,
            background: 'rgba(11,16,32,0.98)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 -12px 48px rgba(0,0,0,0.6)', zIndex: 60,
          }}>
            {admin && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Signed in as</div>
                <div style={{ fontWeight: 700, color: '#eef2ff', fontSize: 13.5 }}>{admin.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{admin.email}</div>
                <span style={{
                  display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 99,
                  fontSize: 10, fontWeight: 600,
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                }}>{admin.role?.replace('_', ' ')}</span>
              </div>
            )}
            <div style={{ padding: 6 }}>
              <button onClick={handleLogout} disabled={loggingOut}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none',
                  fontSize: 12.5, color: '#ef4444', cursor: loggingOut ? 'not-allowed' : 'pointer',
                  opacity: loggingOut ? 0.5 : 1, transition: 'background 0.12s', fontFamily: 'inherit',
                }}>
                <LogOut size={14} strokeWidth={1.8} />
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        )}

        <button onClick={() => open && setShowAcc(v => !v)}
          title={!open ? (admin?.name ?? 'Account') : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: open ? 10 : 0, justifyContent: open ? 'flex-start' : 'center',
            padding: open ? '11px 14px' : '11px 0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            textAlign: 'left', transition: 'background 0.15s', fontFamily: 'inherit',
          }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          {open && (
            <>
              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#d4daef', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {admin?.name ?? 'Loading…'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{admin?.role ?? ''}</div>
              </div>
              <ChevronUp size={13} strokeWidth={1.8} style={{
                color: 'var(--text-muted)', flexShrink: 0,
                transform: showAccount ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
