'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Target, Clock, AlertTriangle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { QuizSession, QuizSet } from '@/lib/types';

interface SessionWithSet extends QuizSession {
  quiz_sets: QuizSet | null;
}

export default function ReviewPage() {
  const [sessions, setSessions] = useState<SessionWithSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('quiz_sessions')
        .select('*, quiz_sets(*)')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(30);

      setSessions((data as SessionWithSet[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const completed = sessions.filter(s => s.accuracy !== null);
  const avgAccuracy = completed.length > 0
    ? Math.round(completed.reduce((s, ss) => s + (ss.accuracy || 0), 0) / completed.length)
    : 0;
  const totalTime = sessions.reduce((s, ss) => s + (ss.duration_secs || 0), 0);
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  // Chart data
  const chartData = completed.slice(0, 10).reverse().map((s, i) => ({
    name: `S${i + 1}`,
    accuracy: Math.round(s.accuracy || 0),
    time: Math.round((s.duration_secs || 0) / 60),
  }));

  // Subject performance (by quiz set subject)
  const subjectMap: Record<string, { count: number; totalAccuracy: number }> = {};
  sessions.forEach(s => {
    if (s.accuracy === null) return;
    const subject = s.quiz_sets?.subject || 'Unknown';
    if (!subjectMap[subject]) subjectMap[subject] = { count: 0, totalAccuracy: 0 };
    subjectMap[subject].count += 1;
    subjectMap[subject].totalAccuracy += s.accuracy;
  });
  const subjectData = Object.entries(subjectMap).map(([subject, { count, totalAccuracy }]) => ({
    subject, accuracy: count > 0 ? Math.round(totalAccuracy / count) : 0, sessions: count,
  })).sort((a, b) => b.accuracy - a.accuracy);

  const COLORS = ['var(--ember)', '#ff9551', '#b34d0f', '#6b6b6b'];

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Review & Analytics</h1>
        <p>Track your performance and identify where to focus next.</p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { icon: Target, label: 'Avg. Accuracy', value: `${avgAccuracy}%`, color: 'var(--ember)' },
          { icon: BarChart2, label: 'Sessions', value: sessions.length, color: 'var(--ember)' },
          { icon: TrendingUp, label: 'Best Score', value: completed.length > 0 ? `${Math.max(...completed.map(s => Math.round(s.accuracy || 0)))}%` : '—', color: 'var(--ember)' },
          { icon: Clock, label: 'Total Time', value: formatTime(totalTime), color: 'var(--ember)' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--ember-subtle)', border: '1px solid var(--ember-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <stat.icon size={18} color="var(--ember)" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {loading ? <div className="shimmer" style={{ width: 40, height: 22, borderRadius: 4 }} /> : stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {[1,2].map(i => <div key={i} className="shimmer" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BarChart2 size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>No sessions yet</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Complete a quiz to see your analytics here.</p>
          <Link href="/generate" className="btn btn-primary">Start practising</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Accuracy trend */}
          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card md:col-span-2" style={{ minWidth: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>Accuracy Trend</h3>
              <div style={{ width: '100%', minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'Accuracy']}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--ember)" strokeWidth={2} dot={{ fill: 'var(--ember)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Subject performance */}
          {subjectData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ minWidth: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>Subject Performance</h3>
              <div style={{ width: '100%', minHeight: 180 }}>
                <ResponsiveContainer width="100%" height={180}>
                <BarChart data={subjectData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="subject" type="category" stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Avg Accuracy']} />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {subjectData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Recent sessions table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`card ${subjectData.length === 0 ? 'md:col-span-2' : ''}`}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>Session History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sessions.slice(0, 8).map(s => (
                <Link href={`/review/${s.id}`} key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: (s.accuracy || 0) >= 70 ? 'var(--success)' : (s.accuracy || 0) >= 40 ? 'var(--warning)' : 'var(--error)', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.quiz_sets?.title || 'Quiz Session'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s.mode} mode</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ember)' }}>{s.accuracy ? `${Math.round(s.accuracy)}%` : '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{formatTime(s.duration_secs || 0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Weak areas insight */}
          {avgAccuracy < 70 && sessions.length >= 2 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card" style={{ gridColumn: '1 / -1', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h4 style={{ marginBottom: '0.4rem', color: 'var(--warning)', fontSize: '0.9rem' }}>Performance Insight</h4>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>
                    Your average accuracy is <strong style={{ color: 'var(--warning)' }}>{avgAccuracy}%</strong> — below the 70% mastery threshold.
                    Consider regenerating practice for your lowest-scoring subjects and switching to Practice Mode for immediate feedback.
                  </p>
                  <Link href="/generate" className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>
                    <RefreshCcw size={13} /> Generate targeted practice
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
