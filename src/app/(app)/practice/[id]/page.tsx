'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import QuizRunner, { type SessionResult } from '@/components/quiz/QuizRunner';
import type { QuizSet, Question, QuizMode } from '@/lib/types';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizMode, setQuizMode] = useState<QuizMode | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [setRes, qRes] = await Promise.all([
        supabase.from('quiz_sets').select('*').eq('id', id).single(),
        supabase.from('questions').select('*').eq('quiz_set_id', id).order('order_index', { ascending: true }),
      ]);

      if (setRes.error || !setRes.data) {
        router.push('/saved');
        return;
      }

      setQuizSet(setRes.data);
      setQuestions(qRes.data || []);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSessionComplete = async (results: SessionResult[]) => {
    if (!quizSet || !quizMode) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const totalAwardedMarks = results.reduce((sum, r) => {
      if (r.marksAwarded !== undefined && r.marksAwarded !== null) return sum + r.marksAwarded;
      if (r.isCorrect) {
        const q = questions.find(q => q.id === r.questionId);
        return sum + (q?.marks || 1);
      }
      return sum;
    }, 0);

    const accuracy = totalPossibleMarks > 0 ? (totalAwardedMarks / totalPossibleMarks) * 100 : 0;
    const duration = results.reduce((s, r) => s + r.timeTakenSecs, 0);

    const { data: session } = await supabase.from('quiz_sessions').insert({
      user_id: user.id,
      quiz_set_id: quizSet.id,
      mode: quizMode,
      score: totalAwardedMarks,
      accuracy,
      duration_secs: duration,
      completed: true,
      completed_at: new Date().toISOString(),
    }).select().single();

    if (session) {
      const answers = results.map(r => ({
        session_id: session.id,
        question_id: r.questionId,
        user_id: user.id,
        user_answer: r.userAnswer,
        is_correct: r.isCorrect,
        time_taken_secs: r.timeTakenSecs,
        ai_feedback: r.aiFeedback,
        marks_awarded: r.marksAwarded,
      }));
      await supabase.from('session_answers').insert(answers);
      setCompletedSessionId(session.id);
    }
  };

  const handleGenerateTargeted = async () => {
    if (!completedSessionId || !quizSet) return;
    try {
      const res = await fetch('/api/practice/targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: completedSessionId,
          quizSetId: quizSet.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate targeted practice');
      
      if (data.quizSetId) {
        router.push(`/practice/${data.quizSetId}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Something went wrong');
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div className="shimmer" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!quizSet || questions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Quiz set not found or empty</h2>
        <Link href="/saved" className="btn btn-ghost" style={{ marginTop: '1rem' }}>Return to Saved</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {!sessionStarted && (
        <Link href="/saved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '2rem', transition: 'color 0.2s' }}>
          <ArrowLeft size={14} /> Back to Saved
        </Link>
      )}

      {!sessionStarted ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card card-ember">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {quizSet.subject && <span className="tag">{quizSet.subject}</span>}
            {quizSet.chapter && <span className="tag">{quizSet.chapter}</span>}
            <span className="tag" style={{ textTransform: 'capitalize' }}>{quizSet.difficulty} Difficulty</span>
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: 1.2 }}>{quizSet.title}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
            This set contains {questions.length} questions forged by Theorem. Choose your practice mode below to begin.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <button
              onClick={() => { setQuizMode('practice'); setSessionStarted(true); }}
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ember)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Play size={18} color="var(--ember)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Practice Mode</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                Untimed session. Get immediate feedback, correct answers, and AI explanations after every question.
              </p>
            </button>

            <button
              onClick={() => { setQuizMode('exam'); setSessionStarted(true); }}
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ember)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Clock size={18} color="var(--ember)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Exam Mode</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                Simulated test environment with a ticking clock. Results and explanations are only shown at the end.
              </p>
            </button>
          </div>
        </motion.div>
      ) : (
        quizMode === 'exam' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0a0a0a', zIndex: 9999, overflowY: 'auto', color: '#e5e5e5' }}
          >
            <div style={{
              maxWidth: 800,
              margin: '0 auto',
              padding: 'clamp(1.5rem, 4vw, 4rem) clamp(1rem, 3vw, 2rem)',
              '--text': '#F8F5F0',
              '--text-muted': '#B3B0AA',
              '--text-dim': '#7A7874',
              '--surface': '#262626',
              '--surface-2': '#2F2E2C',
              '--surface-3': '#3D3B39',
              '--border': '#3D3B39',
              '--border-2': '#4A4846',
              '--bg': '#1E1E1E',
              '--surface-glass': 'rgba(38, 38, 38, 0.55)',
              '--ember': '#f97316',
              '--ember-dim': 'rgba(249, 115, 22, 0.5)',
              '--ember-subtle': 'rgba(249, 115, 22, 0.1)',
              '--ember-border': 'rgba(249, 115, 22, 0.2)',
              '--ember-glow': 'rgba(249, 115, 22, 0.15)',
              '--error': '#ef4444',
              '--success': '#22c55e',
            } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', marginBottom: '0.2rem', color: '#fff' }}>{quizSet.title}</h2>
                  <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Exam Simulation — Focus Mode
                  </span>
                </div>
                <button style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setSessionStarted(false)}>
                  <X size={16} /> End Simulation
                </button>
              </div>
              <QuizRunner
                questions={questions}
                mode={quizMode || 'exam'}
                timeLimitMinutes={Math.max(10, questions.length * 1.5)}
                onComplete={handleSessionComplete}
              />
            </div>
          </motion.div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{quizSet.title}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Practice Session
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSessionStarted(false)}>
                <X size={14} /> Exit
              </button>
            </div>
            <QuizRunner
              questions={questions}
              mode={quizMode || 'practice'}
              timeLimitMinutes={Math.max(10, questions.length * 1.5)}
              onComplete={handleSessionComplete}
              onGenerateTargeted={completedSessionId ? handleGenerateTargeted : undefined}
            />
          </div>
        )
      )}
    </div>
  );
}
