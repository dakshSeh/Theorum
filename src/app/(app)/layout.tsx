'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, BarChart2,
  BookMarked, LogOut, User, Menu, X, ChevronRight,
  BookOpen, Layers, MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ui/ThemeToggle';
import TheoremLogo from '@/components/ui/TheoremLogo';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & Stats' },
  { href: '/generate', icon: Zap, label: 'Generate', description: 'Create Questions' },
  { href: '/notes', icon: BookOpen, label: 'Study Notes', description: 'AI-Generated Notes' },
  { href: '/flashcards', icon: Layers, label: 'Memory Forge', description: 'Spaced Repetition' },
  { href: '/review', icon: BarChart2, label: 'Review', description: 'Session History' },
  { href: '/saved', icon: BookMarked, label: 'Saved Sets', description: 'Your Question Banks' },
];

function Sidebar({ userName, isOpen, setIsOpen }: { userName: string, isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
            className="md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo and close button */}
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TheoremLogo size={15} color="var(--text)" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>Theorem</span>
        </Link>
        <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setIsOpen(false)} style={{ padding: '0.25rem' }}>
          <X size={18} />
        </button>
      </div>

      {/* Section Label */}
      <div style={{ padding: '1rem 1.25rem 0.35rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Navigation
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.65rem 0.875rem', borderRadius: 'var(--radius)',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                transition: 'all 0.2s ease',
                background: active ? 'var(--ember-subtle)' : 'transparent',
                color: active ? 'var(--ember)' : 'var(--text-muted)',
                border: active ? '1px solid var(--ember-border)' : '1px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--ember-border)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}>
                <item.icon size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: active ? 600 : 500, lineHeight: 1.2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.3, marginTop: '0.1rem' }}>
                  {item.description}
                </div>
              </div>
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 100, background: 'var(--ember)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.6rem 0.875rem',
            background: 'var(--surface-2)', borderRadius: 'var(--radius)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--ember-subtle)', border: '1px solid var(--ember-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={14} color="var(--ember)" />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || 'Student'}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <Link
          href="/feedback"
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem', color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          <MessageSquare size={14} /> Leave Feedback
        </Link>
        <button
          onClick={handleSignOut}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem', color: 'var(--text-muted)' }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const pathname = usePathname();

  // Close sidebar on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  // Fetch the user's name once for the sidebar
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setUserName(data?.full_name || user.email?.split('@')[0] || 'Student');
    }
    loadUser();
  }, []);

  // Get the current page title for breadcrumb
  const currentPage = NAV_ITEMS.find(
    item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );

  return (
    <div className="app-layout">
      <Sidebar userName={userName} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="main-content">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center justify-between" style={{
          padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <div style={{ width: 24, height: 24, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TheoremLogo size={14} color="var(--text)" />
              </div>
            </Link>
            {currentPage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <ChevronRight size={12} />
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currentPage.label}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
          </div>
        </div>
        
        {children}
      </main>
    </div>
  );
}
