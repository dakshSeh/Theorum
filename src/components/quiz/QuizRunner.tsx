'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle, XCircle, ChevronRight, Award, Loader2, FileText } from 'lucide-react';
import type { Question, QuizMode, MCQOption } from '@/lib/types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface Props {
  questions: Question[];
  mode: QuizMode;
  timeLimitMinutes?: number;
  onComplete: (results: SessionResult[]) => void;
  onGenerateTargeted?: () => Promise<void>;
  cognitiveScores?: { recall: number, comprehension: number, application: number, analysis: number, evaluation: number } | null;
}

export interface SessionResult {
  questionId: string;
  userAnswer: string | null;
  isCorrect: boolean;
  timeTakenSecs: number;
  aiFeedback?: string;
  marksAwarded?: number;
}

// Lazy singleton AudioContext to avoid leaking resources
let audioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioCtx = new AudioContextCtor();
  return audioCtx;
};

// Simple Web Audio API synthesizer for UI sounds
const playSound = (type: 'click' | 'correct' | 'incorrect') => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'incorrect') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Ignore audio errors if browser blocks it
  }
};

export default function QuizRunner({ questions, mode, timeLimitMinutes = 30, onComplete, onGenerateTargeted }: Props) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<SessionResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [generatingTargeted, setGeneratingTargeted] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);
  const startTime = useRef<number>(0);
  const questionStart = useRef<number>(0);

  // AI Grading State
  const [currentFeedback, setCurrentFeedback] = useState<{ marksAwarded: number, text: string, isCorrect: boolean } | null>(null);

  // Initialize timestamps on mount only
  useEffect(() => {
    startTime.current = Date.now();
    questionStart.current = Date.now();
  }, []);

  const handleFinish = useCallback(async (finalAnswers = answers) => {
    let gradedAnswers = [...finalAnswers];

    if (mode === 'exam') {
      const toGrade = gradedAnswers.filter(a => {
        const q = questions.find(qu => qu.id === a.questionId);
        return q && q.question_type !== 'mcq' && a.userAnswer;
      }).map(a => {
        const q = questions.find(qu => qu.id === a.questionId)!;
        return {
          id: q.id,
          questionText: q.question_text,
          userAnswer: a.userAnswer || '',
          modelAnswer: q.answer || '',
          marks: q.marks || 1
        };
      });

      if (toGrade.length > 0) {
        setIsGrading(true);
        try {
          const res = await fetch('/api/grade', {
            method: 'POST',
            body: JSON.stringify({ answers: toGrade })
          });
          const data = await res.json();
          
          if (data.results) {
            gradedAnswers = gradedAnswers.map(ans => {
              const gradeResult = data.results.find((r: { id: string, isCorrect: boolean, marksAwarded: number, feedback: string }) => r.id === ans.questionId);
              if (gradeResult) {
                return {
                  ...ans,
                  isCorrect: gradeResult.isCorrect,
                  marksAwarded: gradeResult.marksAwarded,
                  aiFeedback: gradeResult.feedback
                };
              }
              return ans;
            });
          }
        } catch (err) {
          console.error('Bulk grading failed:', err);
        } finally {
          setIsGrading(false);
        }
      }
    }

    setFinished(true);
    setAnswers(gradedAnswers);
    setTotalTime(Math.round((Date.now() - startTime.current) / 1000));
    onComplete(gradedAnswers);
  }, [answers, onComplete, mode, questions]);

  // Exam mode timer
  useEffect(() => {
    if (mode !== 'exam' || finished) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); handleFinish(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, handleFinish, finished]);

  const q = questions[current];
  const isMCQ = q?.question_type === 'mcq';
  const options = q?.options as MCQOption[] | null;

  const handleSelect = (answer: string) => {
    if (revealed || isGrading) return;
    playSound('click');
    setSelected(answer);
    if (mode === 'practice') {
      setRevealed(true);
      const isCorrect = answer === (options?.find(o => o.is_correct)?.label || q.answer);
      if (isCorrect) setTimeout(() => playSound('correct'), 150);
      else setTimeout(() => playSound('incorrect'), 150);
    }
  };

  const handleGradeSubjective = async () => {
    if (!selected || !selected.trim()) return;
    setIsGrading(true);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        body: JSON.stringify({
          answers: [{
            id: q.id,
            questionText: q.question_text,
            userAnswer: selected,
            modelAnswer: q.answer || '',
            marks: q.marks || 1
          }]
        })
      });
      const data = await res.json();
      if (data.results && data.results[0]) {
        const result = data.results[0];
        setCurrentFeedback({ marksAwarded: result.marksAwarded, text: result.feedback, isCorrect: result.isCorrect });
        if (result.isCorrect) setTimeout(() => playSound('correct'), 150);
        else setTimeout(() => playSound('incorrect'), 150);
      }
    } catch (err) {
      console.error('Grading failed:', err);
    } finally {
      setIsGrading(false);
      setRevealed(true);
    }
  };

  const handleNext = () => {
    if (isGrading) return;
    const timeTaken = Math.round((Date.now() - questionStart.current) / 1000);
    
    let isCorrect = false;
    let aiFeedback: string | undefined = undefined;
    let marksAwarded: number | undefined = undefined;

    if (isMCQ) {
      const correctAnswer = options?.find(o => o.is_correct)?.label || '';
      isCorrect = selected !== null && selected === correctAnswer;
      marksAwarded = isCorrect ? (q.marks || 1) : 0;
    } else {
      if (mode === 'practice' && currentFeedback) {
        isCorrect = currentFeedback.isCorrect;
        aiFeedback = currentFeedback.text;
        marksAwarded = currentFeedback.marksAwarded;
      } else {
        // Exam mode - handled in handleFinish in bulk, so set to false for now
        // Or if practice and they just skipped it
        isCorrect = false;
        marksAwarded = 0;
      }
    }

    const result: SessionResult = {
      questionId: q.id,
      userAnswer: selected,
      isCorrect,
      timeTakenSecs: timeTaken,
      aiFeedback,
      marksAwarded
    };

    const newAnswers = [...answers, result];
    setAnswers(newAnswers);

    if (current + 1 >= questions.length) {
      handleFinish(newAnswers);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
      setCurrentFeedback(null);
      questionStart.current = Date.now();
    }
  };

  const getOptionStyle = (opt: MCQOption) => {
    if (!revealed) return {
      background: selected === opt.label ? 'var(--ember-subtle)' : 'var(--surface-2)',
      border: `1px solid ${selected === opt.label ? 'var(--ember-border)' : 'var(--border)'}`,
      color: 'var(--text)',
    };
    if (opt.is_correct) return { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' };
    if (selected === opt.label && !opt.is_correct) return { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' };
    return { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' };
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const totalAwardedMarks = answers.reduce((sum, a) => sum + (a.marksAwarded || (a.isCorrect ? (questions.find(q => q.id === a.questionId)?.marks || 1) : 0)), 0);
  const accuracy = totalPossibleMarks > 0 
    ? Math.round((totalAwardedMarks / totalPossibleMarks) * 100) 
    : (answers.length > 0 ? Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100) : 0);

  if (finished) {
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const scoredMarks = answers.reduce((sum, a) => sum + (a.marksAwarded ?? (a.isCorrect ? (questions.find(q => q.id === a.questionId)?.marks || 1) : 0)), 0);
    const finishedAccuracy = totalMarks > 0 ? Math.round((scoredMarks / totalMarks) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '3rem 2rem' }}
      >
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ember-subtle)', border: '2px solid var(--ember-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Award size={32} color="var(--ember)" />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Session Complete</h2>
        <p style={{ marginBottom: '2rem' }}>Here&apos;s how you performed.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', maxWidth: 400, margin: '0 auto 2rem' }}>
          {[
            { label: 'Score', value: `${finishedAccuracy}%` },
            { label: 'Marks', value: `${Math.round(scoredMarks * 10) / 10}/${totalMarks}` },
            { label: 'Time', value: formatTime(totalTime) },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ember)', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Cognitive Skills Radar Chart */}
        {(() => {
          const hasScores = cognitiveScores !== undefined && cognitiveScores !== null;
          
          if (hasScores && cognitiveScores) {
            const radarData = [
              { subject: 'Recall', A: cognitiveScores.recall, fullMark: 100 },
              { subject: 'Comprehension', A: cognitiveScores.comprehension, fullMark: 100 },
              { subject: 'Application', A: cognitiveScores.application, fullMark: 100 },
              { subject: 'Analysis', A: cognitiveScores.analysis, fullMark: 100 },
              { subject: 'Evaluation', A: cognitiveScores.evaluation, fullMark: 100 },
            ];
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card" style={{ marginBottom: '2.5rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>Cognitive Skill Profile</h3>
                <div style={{ height: 350, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 13 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-dim)' }} />
                      <Radar name="Skills" dataKey="A" stroke="var(--ember)" fill="var(--ember)" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          }

          if (cognitiveScores === null) {
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: '2.5rem', textAlign: 'center', padding: '2rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ember)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI is analyzing your cognitive profile...</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>This usually takes a few seconds. The page will update automatically.</p>
              </motion.div>
            );
          }
          
          return null;
        })()}

        {onGenerateTargeted && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={async () => {
                setGeneratingTargeted(true);
                try { await onGenerateTargeted(); } 
                finally { setGeneratingTargeted(false); }
              }}
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
        )}

        <div style={{ textAlign: 'left', marginTop: '3rem', maxWidth: 800, margin: '3rem auto 0' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', textAlign: 'center' }}>Session Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {answers.map((ans, i) => {
              const q = questions.find(qu => qu.id === ans.questionId);
              if (!q) return null;
              return (
                <div key={ans.questionId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span className="question-number">Q{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                        <span className="badge badge-ember">{q.question_type.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                          {ans.marksAwarded != null ? `${ans.marksAwarded} / ` : ''}{q.marks} mark{q.marks > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>{q.question_text}</p>
                    </div>
                  </div>

                  <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: `1px solid ${ans.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        Your Answer
                        {ans.isCorrect ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error)" />}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                        {ans.userAnswer || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Skipped</span>}
                      </p>
                    </div>

                    {ans.aiFeedback && (
                      <div style={{ padding: '1rem', background: ans.isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius)', border: `1px solid ${ans.isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ans.isCorrect ? 'var(--success)' : 'var(--error)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={14} /> AI Feedback
                          {ans.marksAwarded != null && (
                            <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {ans.marksAwarded} / {q.marks} marks
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ans.aiFeedback}</p>
                      </div>
                    )}

                    {q.question_type !== 'mcq' && q.answer && (
                      <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Model Answer</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{q.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // Bulk Grading state view (Exam Mode ending)
  if (isGrading && mode === 'exam') {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
      >
        <Loader2 size={40} className="animate-spin" color="var(--ember)" />
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Grading Subjective Answers</h2>
          <p style={{ color: 'var(--text-muted)' }}>Our AI is reviewing your responses...</p>
        </div>
      </motion.div>
    );
  }

  if (!q) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Question <span style={{ color: 'var(--text)', fontWeight: 700 }}>{current + 1}</span> of {questions.length}
          </span>
          {/* Progress bar */}
          <div style={{ width: 100, height: 4, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--ember)', borderRadius: 100, width: `${((current + 1) / questions.length) * 100}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
        {mode === 'exam' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: timeLeft < 120 ? 'var(--error)' : 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            <Timer size={14} />
            {formatTime(timeLeft)}
          </div>
        )}
        {mode === 'practice' && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Score: <span style={{ color: 'var(--ember)', fontWeight: 700 }}>{accuracy}%</span>
          </div>
        )}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="card"
          style={{ borderColor: 'var(--border-2)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span className="question-number">Q{current + 1}</span>
            <div style={{ flex: 1 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                  <span className="badge badge-ember">{q.question_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
               </div>
               <p style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.65, fontWeight: 400 }}>
                 {q.question_text}
               </p>
            </div>
          </div>

          {isMCQ && options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {options.map(opt => (
                <motion.button
                  key={opt.label}
                  onClick={() => handleSelect(opt.label)}
                  whileHover={!revealed ? { scale: 1.01 } : {}}
                  whileTap={!revealed ? { scale: 0.98 } : {}}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                    cursor: revealed ? 'default' : 'pointer',
                    textAlign: 'left', font: 'inherit', fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    boxShadow: revealed && opt.is_correct ? '0 0 15px rgba(34,197,94,0.3)' : 'none',
                    ...getOptionStyle(opt),
                  }}
                  disabled={revealed || isGrading}
                >
                  <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.05)' }}>
                    {opt.label}
                  </span>
                  <span style={{ flex: 1 }}>{opt.text}</span>
                  {revealed && opt.is_correct && <CheckCircle size={16} color="var(--success)" />}
                  {revealed && selected === opt.label && !opt.is_correct && <XCircle size={16} color="var(--error)" />}
                </motion.button>
              ))}
            </div>
          )}

          {!isMCQ && (
            <div>
              <textarea
                placeholder="Type your answer here…"
                value={selected || ''}
                onChange={e => setSelected(e.target.value)}
                rows={4}
                className="input"
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', width: '100%' }}
                disabled={revealed || isGrading}
              />
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '0.75rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}
                >
                  <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.3rem' }}>Model Answer</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.65 }}>{q.answer}</p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        {!isMCQ && !revealed && mode === 'practice' && (
           <button className="btn btn-ghost" onClick={handleGradeSubjective} disabled={isGrading || !selected}>
             {isGrading ? <Loader2 size={16} className="animate-spin" /> : 'Check Answer'}
           </button>
        )}
        {!isMCQ && !revealed && mode === 'exam' && (
          <button className="btn btn-ghost" onClick={() => setRevealed(true)} disabled={isGrading}>
            Skip Question
          </button>
        )}
        {isMCQ && !revealed && mode === 'exam' && (
           <button className="btn btn-ghost" onClick={() => handleNext()} disabled={isGrading}>
             Skip Question
           </button>
        )}
        {((revealed && mode === 'practice') || mode === 'exam') && (
          <button className="btn btn-primary" onClick={handleNext} disabled={isGrading}>
            {current + 1 >= questions.length ? 'Finish' : 'Next'}
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* Practice feedback */}
      {mode === 'practice' && revealed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              background: currentFeedback
                 ? (currentFeedback.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)')
                 : selected === null 
                ? 'var(--surface-2)' 
                : selected === (options?.find(o => o.is_correct)?.label || q.answer)
                  ? 'rgba(34,197,94,0.08)'
                  : 'rgba(239,68,68,0.08)',
              border: `1px solid ${currentFeedback
                 ? (currentFeedback.isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                 : selected === null 
                ? 'var(--border)' 
                : selected === (options?.find(o => o.is_correct)?.label || q.answer)
                  ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {currentFeedback && (
              <div style={{ marginBottom: q.explanation ? '1rem' : 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: currentFeedback.isCorrect ? '#4ade80' : '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {currentFeedback.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  AI Feedback ({currentFeedback.marksAwarded} / {q.marks || 1} marks)
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{currentFeedback.text}</p>
              </div>
            )}
            {q.explanation && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.65 }}>
                <span style={{ fontWeight: 600, color: 'var(--ember)' }}>Explanation: </span>
                {q.explanation}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
