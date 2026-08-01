'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, Folder, Plus, Play, Trash2, Search, FolderPlus, X, Crosshair } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { QuizSet, Folder as FolderType } from '@/lib/types';

export default function SavedPage() {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [qsRes, fRes] = await Promise.all([
      supabase.from('quiz_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('folders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setQuizSets(qsRes.data || []);
    setFolders(fRes.data || []);
    setLoading(false);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('folders').insert({ user_id: user.id, name: newFolderName.trim() });
    setNewFolderName(''); setCreating(false); load();
  }

  async function deleteQuizSet(id: string) {
    const supabase = createClient();
    await supabase.from('quiz_sets').delete().eq('id', id);
    setQuizSets(prev => prev.filter(q => q.id !== id));
  }

  const filtered = quizSets
    .filter(q => !search || q.title.toLowerCase().includes(search.toLowerCase()))
    .filter(q => activeFolder === null ? true : activeFolder === 'none' ? !q.folder_id : q.folder_id === activeFolder);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const sidebarItems = [
    { id: null as string | null, name: 'All Sets', count: quizSets.length },
    { id: 'none', name: 'Uncategorised', count: quizSets.filter(q => !q.folder_id).length },
    ...folders.map(f => ({ id: f.id, name: f.name, count: quizSets.filter(q => q.folder_id === f.id).length })),
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Saved Sets</h1>
            <p>Organise and access all your generated quiz sets.</p>
          </div>
          <Link href="/generate" className="btn btn-primary"><Plus size={15} /> New Quiz Set</Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-start">
        {/* Folder sidebar */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folders</span>
            <button className="btn btn-icon btn-ghost" onClick={() => setCreating(true)} title="New folder"><FolderPlus size={14} /></button>
          </div>
          {creating && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input className="input" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} placeholder="Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} autoFocus />
              <button className="btn btn-primary btn-sm btn-icon" onClick={createFolder}><Plus size={13} /></button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setCreating(false); setNewFolderName(''); }}><X size={13} /></button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sidebarItems.map(item => (
              <button key={String(item.id)} onClick={() => setActiveFolder(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-sm)', background: activeFolder === item.id ? 'var(--ember-subtle)' : 'transparent', border: `1px solid ${activeFolder === item.id ? 'var(--ember-border)' : 'transparent'}`, color: activeFolder === item.id ? 'var(--ember)' : 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', font: 'inherit', transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
                <Folder size={13} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <span style={{ fontSize: '0.7rem', background: 'var(--surface-3)', borderRadius: 100, padding: '0 5px' }}>{item.count}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main */}
        <div>
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search quiz sets…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <BookMarked size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No quiz sets found</h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>{search ? 'No sets match your search.' : 'Generate a quiz to see it here.'}</p>
              {!search && <Link href="/generate" className="btn btn-primary">Generate your first set</Link>}
            </div>
          ) : (
            <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              <AnimatePresence>
                {filtered.map((qs, i) => {
                  const isTargeted = qs.title.startsWith('Targeted Practice:');
                  return (
                  <motion.div key={qs.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }} className="card card-ember" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        {isTargeted ? <Crosshair size={15} color="var(--ember)" /> : <BookMarked size={15} color="var(--ember)" />}
                        <button className="btn btn-icon btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-dim)' }} onClick={() => deleteQuizSet(qs.id)}><Trash2 size={13} /></button>
                      </div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem', lineHeight: 1.3 }}>{qs.title}</h3>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {qs.subject && <span className="tag" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>{qs.subject}</span>}
                        {qs.chapter && <span className="tag" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>{qs.chapter}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{qs.question_count} questions · <span style={{ textTransform: 'capitalize' }}>{qs.difficulty}</span></div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.875rem', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{formatDate(qs.created_at)}</span>
                      <Link href={`/practice/${qs.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}><Play size={11} /> Practice</Link>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
