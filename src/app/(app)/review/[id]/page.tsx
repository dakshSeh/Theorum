'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { QuizSession, SessionAnswer, Question, QuizSet } from '@/lib/types';

interface AnswerWithQuestion extends SessionAnswer {
  questions: Question;
}

interface SessionWithSet extends QuizSession {
  quiz_sets: QuizSet;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [session, setSession] = useState<SessionWithSet | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTargeted, setGeneratingTargeted] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sessionData } = await supabase
        .from('quiz_sessions')
        .select('*, quiz_sets(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!sessionData) {
        router.push('/review');
        return;
      }

      const { data: answersData } = await supabase
        .from('session_answers')
        .select('*, questions(*)')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      setSession(sessionData as SessionWithSet);
      setAnswers((answersData as AnswerWithQuestion[]) || []);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleGenerateTargeted = async () => {
    if (!session) return;
    setGeneratingTargeted(true);
    try {
      const res = await fetch('/api/practice/targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          quizSetId: session.quiz_sets.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate targeted practice');
      
      if (data.quizSetId) {
        router.push(`/practice/${data.quizSetId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Something went wrong');
    } finally {
      setGeneratingTargeted(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div className="shimmer" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/review" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '2rem', transition: 'color 0.2s' }}>
        <ArrowLeft size={14} /> Back to Review
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{session.quiz_sets.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
              {session.mode} Mode &bull; {new Date(session.completed_at || session.started_at).toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ember)', lineHeight: 1 }}>
              {session.accuracy !== null ? `${Math.round(session.accuracy)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Score</div>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleGenerateTargeted}
          disabled={generatingTargeted}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          {generatingTargeted ? (
            <><Loader2 size={16} className="animate-spin" /> Crafting Targeted Practice...</>
          ) : (
            <>Generate Targeted Practice</>
          )}
        </button>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Detailed Responses</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {answers.map((ans, i) => (
          <motion.div key={ans.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span className="question-number">Q{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${ans.questions.difficulty}`}>{ans.questions.difficulty}</span>
                  <span className="badge badge-ember">{ans.questions.question_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                    {ans.marks_awarded != null ? `${ans.marks_awarded} / ` : ''}{ans.questions.marks} mark{ans.questions.marks > 1 ? 's' : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>{ans.questions.question_text}</p>
              </div>
            </div>

            <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* User Answer */}
              <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: `1px solid ${ans.is_correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Your Answer
                  {ans.is_correct ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                  {ans.user_answer || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Skipped</span>}
                </p>
              </div>

              {/* AI Feedback if available */}
              {ans.ai_feedback && (
                <div style={{ padding: '1rem', background: ans.is_correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius)', border: `1px solid ${ans.is_correct ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ans.is_correct ? 'var(--success)' : 'var(--error)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} /> AI Feedback
                    {ans.marks_awarded != null && (
                      <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ans.marks_awarded} / {ans.questions.marks} marks
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ans.ai_feedback}</p>
                </div>
              )}

              {/* Model Answer (if not exact match MCQ) */}
              {ans.questions.question_type !== 'mcq' && (
                <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Model Answer</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{ans.questions.answer}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
