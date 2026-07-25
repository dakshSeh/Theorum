'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, SlidersHorizontal, FileText, Lightbulb } from 'lucide-react';
import type { GenerationOptions, QuestionType, Difficulty } from '@/lib/types';

interface Props {
  onGenerate: (
    options: GenerationOptions,
    title: string,
    subject: string,
    chapter: string,
    mode: 'pdf' | 'topic',
    classLevel: string,
    topic: string
  ) => void;
  loading: boolean;
  pdfUploaded: boolean;
  mode: 'pdf' | 'topic';
  onModeChange: (mode: 'pdf' | 'topic') => void;
}

const QUESTION_TYPES: { key: QuestionType; label: string }[] = [
  { key: 'mcq', label: 'MCQ' },
  { key: 'short_2mark', label: '2 Mark' },
  { key: 'short_3mark', label: '3 Mark' },
  { key: 'long_5mark', label: '5 Mark' },
  { key: 'hots', label: 'HOTS' },
  { key: 'case_based', label: 'Case Based' },
  { key: 'assertion_reason', label: 'Assertion-Reason' },
  { key: 'fill_blank', label: 'Fill in Blank' },
];

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Economics', 'History', 'Geography', 'Political Science', 'English', 'Business Studies', 'Other'];
const CLASSES = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Above / Advanced'];

export default function GeneratorControls({ onGenerate, loading, pdfUploaded, mode, onModeChange }: Props) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [count, setCount] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'short_2mark', 'hots']);

  const toggleType = (type: QuestionType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const buildTypeMix = () => {
    const mix: Partial<Record<QuestionType, number>> = {};
    if (selectedTypes.length === 0) return mix;
    const each = Math.floor(100 / selectedTypes.length);
    selectedTypes.forEach(t => { mix[t] = each; });
    return mix;
  };

  const handleGenerate = () => {
    onGenerate(
      { difficulty, questionCount: count, typeMix: buildTypeMix() },
      title || (mode === 'pdf' ? 'PDF Generated Quiz' : `${subject} ${classLevel} - ${topic}`),
      subject,
      chapter,
      mode,
      classLevel,
      topic
    );
  };

  const isGenerateDisabled = mode === 'pdf'
    ? !pdfUploaded
    : (!subject || !classLevel || !topic.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <SlidersHorizontal size={16} color="var(--ember)" />
        <h3 style={{ fontSize: '1rem' }}>Generation Controls</h3>
      </div>

      {/* Mode Selector */}
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Generation Method
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button
            onClick={() => onModeChange('pdf')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
              padding: '1rem', borderRadius: 'var(--radius-lg)',
              border: `2px solid ${mode === 'pdf' ? 'var(--ember)' : 'var(--border)'}`,
              background: mode === 'pdf' ? 'var(--ember-subtle)' : 'var(--surface-2)',
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
            }}
          >
            <FileText size={20} color={mode === 'pdf' ? 'var(--ember)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontWeight: 600, color: mode === 'pdf' ? 'var(--ember)' : 'var(--text)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>From PDF</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extract from your study material</div>
            </div>
          </button>
          
          <button
            onClick={() => onModeChange('topic')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
              padding: '1rem', borderRadius: 'var(--radius-lg)',
              border: `2px solid ${mode === 'topic' ? 'var(--ember)' : 'var(--border)'}`,
              background: mode === 'topic' ? 'var(--ember-subtle)' : 'var(--surface-2)',
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
            }}
          >
            <Lightbulb size={20} color={mode === 'topic' ? 'var(--ember)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontWeight: 600, color: mode === 'topic' ? 'var(--ember)' : 'var(--text)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>From Topic</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generate from curriculum</div>
            </div>
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quiz Title
        </label>
        <input
          className="input"
          placeholder={mode === 'pdf' ? "e.g. Physics Chapter 4 Practice" : "e.g. Chemical Bonding Test (Optional)"}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {/* Subject + Chapter/Class */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%' }}>
            <option value="">{mode === 'pdf' ? 'Auto-detect' : 'Select Subject'}</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {mode === 'pdf' ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chapter</label>
            <input
              className="input"
              placeholder="e.g. Thermodynamics"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class Level</label>
            <select value={classLevel} onChange={e => setClassLevel(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select Class</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Topic input (Topic mode only) */}
      {mode === 'topic' && (
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Topic / Syllabus Concept
          </label>
          <input
            className="input"
            placeholder="e.g. Laws of Motion or Chemical Kinetics"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>
      )}

      {/* Difficulty */}
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Difficulty
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['mixed', 'easy', 'moderate', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)',
                border: `1px solid ${difficulty === d ? 'var(--ember)' : 'var(--border)'}`,
                background: difficulty === d ? 'var(--ember-subtle)' : 'var(--surface-2)',
                color: difficulty === d ? 'var(--ember)' : 'var(--text-muted)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                font: 'inherit', transition: 'all 0.2s',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Question Count
          </label>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)' }}>
            {count}
          </span>
        </div>
        <input
          type="range" min={5} max={50} step={5}
          value={count}
          onChange={e => setCount(Number(e.target.value))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>5</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>50</span>
        </div>
      </div>

      {/* Question types */}
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Question Types
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {QUESTION_TYPES.map(({ key, label }) => {
            const active = selectedTypes.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 100,
                  border: `1px solid ${active ? 'var(--ember-border)' : 'var(--border)'}`,
                  background: active ? 'var(--ember-subtle)' : 'var(--surface-2)',
                  color: active ? 'var(--ember)' : 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                  font: 'inherit', transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {selectedTypes.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.4rem' }}>Select at least one question type.</p>
        )}
      </div>

      {/* Generate button */}
      <motion.button
        className="btn btn-primary"
        style={{
          width: '100%', justifyContent: 'center',
          opacity: (isGenerateDisabled || loading || selectedTypes.length === 0) ? 0.5 : 1,
          cursor: (isGenerateDisabled || loading || selectedTypes.length === 0) ? 'not-allowed' : 'pointer',
        }}
        disabled={isGenerateDisabled || loading || selectedTypes.length === 0}
        onClick={handleGenerate}
        whileHover={!isGenerateDisabled && !loading ? { scale: 1.01 } : {}}
        whileTap={!isGenerateDisabled && !loading ? { scale: 0.98 } : {}}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow 0.6s linear infinite' }} />
            Forging questions…
          </>
        ) : (
          <>
            <Zap size={15} /> Forge {count} Questions
          </>
        )}
      </motion.button>

      {mode === 'pdf' && !pdfUploaded && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '-0.5rem' }}>
          Upload a PDF first to enable generation.
        </p>
      )}
    </div>
  );
}
