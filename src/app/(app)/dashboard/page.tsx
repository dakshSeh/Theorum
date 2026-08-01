'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, FileText, BookMarked, ArrowRight, TrendingUp, Crosshair } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { Upload, QuizSet, QuizSession } from '@/lib/types';
import FollowingEyes from '@/components/ui/FollowingEyes';

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, uploadsRes, quizRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('uploads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('quiz_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('quiz_sessions').select('*').eq('user_id', user.id).eq('completed', true).order('completed_at', { ascending: false }).limit(10),
      ]);

      setUserName(profileRes.data?.full_name || user.email?.split('@')[0] || 'Student');
      setUploads(uploadsRes.data || []);
      setQuizSets(quizRes.data || []);
      setSessions(sessionsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const [mountedTime, setMountedTime] = useState<number | null>(null);
  const [currentHour, setCurrentHour] = useState<number>(12);

  useEffect(() => {
    setTimeout(() => {
      setMountedTime(Date.now());
      setCurrentHour(new Date().getHours());
    }, 0);
  }, []);

  const avgAccuracy = sessions.length > 0
    ? Math.round(sessions.reduce((s, ss) => s + (ss.accuracy || 0), 0) / sessions.length)
    : null;

  const totalQuestions = quizSets.reduce((s, q) => s + q.question_count, 0);

  const formatTime = (iso: string) => {
    if (!mountedTime) return '';
    const date = new Date(iso);
    const diff = mountedTime - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const chartData = [...sessions].reverse().map((s, i) => ({
    name: `Session ${i + 1}`,
    accuracy: s.accuracy || 0,
  }));

  const heatmapCells = useMemo(() => {
    // Map actual sessions to dates
    const dateCounts: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.completed_at) {
        const d = new Date(s.completed_at).toISOString().split('T')[0];
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      }
    });

    const cells = [];
    const today = new Date();
    // 90 days ago
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = dateCounts[dateStr] || 0;
      
      let bg = 'var(--surface-3)'; // default (0)
      if (count === 1) bg = 'var(--ember-subtle)';
      else if (count === 2) bg = 'var(--ember-dim)';
      else if (count >= 3) bg = 'var(--ember)';
      
      cells.push({ date: dateStr, count, bg });
    }
    return cells;
  }, [sessions]);

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
                Good {currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'},{' '}
                <span style={{ color: 'var(--ember)' }}>{loading ? '…' : userName}</span>
              </h1>
              <FollowingEyes />
            </div>
            <p>Your forge is ready. What are we practising today?</p>
          </div>
          <Link href="/generate" className="btn btn-primary">
            <Zap size={15} /> Quick Generate
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        {[
          { icon: FileText, label: 'Uploads', value: uploads.length, sub: 'PDFs processed' },
          { icon: BookMarked, label: 'Quiz Sets', value: quizSets.length, sub: 'Generated sets' },
          { icon: Zap, label: 'Questions', value: totalQuestions, sub: 'Total forged' },
          { icon: TrendingUp, label: 'Accuracy', value: avgAccuracy !== null ? `${avgAccuracy}%` : '—', sub: 'Avg. across sessions' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--ember-subtle)', border: '1px solid var(--ember-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <stat.icon size={18} color="var(--ember)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                {loading ? <div className="shimmer" style={{ width: 40, height: 24, borderRadius: 4 }} /> : stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stat.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Recommendation Banner */}
      {(() => {
        if (sessions.length === 0 || quizSets.length === 0) return null;
        // Find the lowest accuracy session
        const lowestSession = [...sessions].sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))[0];
        const relatedSet = quizSets.find(q => q.id === lowestSession.quiz_set_id);
        
        if (!relatedSet || (lowestSession.accuracy || 0) > 80) return null; // No weak points found

        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card" style={{ marginBottom: '3rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), transparent)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#ef4444', marginBottom: '0.25rem' }}>AI Forge Recommendation</h3>
              <p style={{ color: 'var(--text)', lineHeight: 1.5, fontSize: '0.9rem', marginBottom: '1rem' }}>
                We noticed you scored <span style={{ fontWeight: 700, color: '#ef4444' }}>{Math.round(lowestSession.accuracy || 0)}%</span> on <span style={{ fontWeight: 600 }}>{relatedSet.title}</span>. A quick 10-minute focus session could turn this weakness into a strength.
              </p>
              <Link href={`/practice/${relatedSet.id}`} className="btn btn-primary btn-sm" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}>
                Start Refresher Session <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        );
      })()}

      {/* Mastery Heatmap */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>90-Day Forge Heatmap</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily activity intensity</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '100%', overflow: 'hidden', padding: '0.5rem' }}>
          {heatmapCells.map((cell, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.005, type: 'spring', stiffness: 200, damping: 20 }}
              title={`${cell.count} sessions on ${new Date(cell.date).toLocaleDateString()}`}
              whileHover={{ scale: 1.25, zIndex: 10, boxShadow: '0 0 10px var(--ember-glow)' }}
              style={{
                width: 'calc(100% / 31 - 6px)',
                minWidth: 12,
                aspectRatio: '1/1',
                background: cell.bg,
                borderRadius: '50%',
                cursor: 'pointer',
                border: cell.count > 0 ? '1px solid var(--ember-border)' : '1px solid transparent'
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
          <span>Less</span>
          <div style={{ width: 10, height: 10, background: 'var(--surface-3)', borderRadius: '50%' }} />
          <div style={{ width: 10, height: 10, background: 'var(--ember-subtle)', borderRadius: '50%' }} />
          <div style={{ width: 10, height: 10, background: 'var(--ember-dim)', borderRadius: '50%' }} />
          <div style={{ width: 10, height: 10, background: 'var(--ember)', borderRadius: '50%' }} />
          <span>More</span>
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card" style={{ gridColumn: '1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem' }}>Recent Uploads</h3>
            <Link href="/generate" style={{ fontSize: '0.78rem', color: 'var(--ember)' }}>Upload new <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : uploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No uploads yet. <Link href="/generate">Upload a PDF</Link> to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uploads.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <FileText size={15} color="var(--ember)" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.file_name}</div>
                    {u.subject && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.subject}{u.chapter ? ` · ${u.chapter}` : ''}</div>}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', flexShrink: 0 }}>{formatTime(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Quiz Sets */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem' }}>Saved Quiz Sets</h3>
            <Link href="/saved" style={{ fontSize: '0.78rem', color: 'var(--ember)' }}>View all <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : quizSets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No quiz sets yet. <Link href="/generate">Generate one</Link> first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quizSets.map(qs => {
                const isTargeted = qs.title.startsWith('Targeted Practice:');
                return (
                  <Link key={qs.id} href={`/practice/${qs.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.2s' }}>
                    {isTargeted ? <Crosshair size={15} color="var(--ember)" /> : <BookMarked size={15} color="var(--text-muted)" />}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qs.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qs.question_count} questions · {qs.difficulty}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', flexShrink: 0 }}>{formatTime(qs.created_at)}</span>
                </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Accuracy Over Time Chart */}
        {sessions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem' }}>Accuracy Over Time</h3>
              <Link href="/review" style={{ fontSize: '0.78rem', color: 'var(--ember)' }}>Full review <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
            </div>
            
            <div style={{ width: '100%', height: 320, marginTop: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--ember)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--ember)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-dim)' }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--text-dim)' }} 
                    domain={[0, 100]} 
                  />
                  <Tooltip 
                    contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}
                    itemStyle={{ color: 'var(--ember)', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="var(--ember)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAccuracy)" 
                    activeDot={{ r: 6, fill: 'var(--ember)', stroke: 'var(--bg)', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
