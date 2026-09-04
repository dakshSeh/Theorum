'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BookOpen, Search, Plus, Trash2, Download, Zap, 
  FileText, ArrowLeft, CheckCircle, AlertCircle, X, Layers
} from 'lucide-react';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { Note } from '@/lib/types';

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Economics', 'History', 'Geography', 'Political Science', 'English', 'Business Studies', 'Other'];
const CLASSES = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Above / Advanced'];

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  // Escape HTML tags except for our custom note highlights spans
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Remove highlight tags if they exist from older notes
  html = html
    .replace(/&lt;span\s+class=["']?note-(term|definition|formula|statement)["']?\s*&gt;/gi, '')
    .replace(/&lt;\/span&gt;/gi, '');


  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.7rem; font-family: var(--font-serif); font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; line-height: 1.3;">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.35rem; font-family: var(--font-serif); font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.65rem; color: var(--ember); line-height: 1.3;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; line-height: 1.3;">$1</h3>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points and Numbered lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.4rem; list-style-type: disc; color: var(--text-muted); line-height: 1.7;">$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.4rem; list-style-type: disc; color: var(--text-muted); line-height: 1.7;">$1</li>');
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.4rem; list-style-type: decimal; color: var(--text-muted); line-height: 1.7;">$2</li>');

  // Paragraphs - split by newlines instead of double newlines to catch all text
  const lines = html.split('\n');
  let inList = false;
  
  const processed = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    
    if (trimmed.startsWith('<h')) return line;
    
    if (trimmed.startsWith('<li')) {
      inList = true;
      return line;
    }
    
    if (inList && !trimmed.startsWith('<li')) {
       inList = false;
    }
    
    return `<p style="line-height: 1.85; font-size: 0.95rem; color: var(--text-muted); margin-bottom: 0.5rem; font-family: var(--font-sans);">${line}</p>`;
  });

  return processed.filter(Boolean).join('\n');
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardSuccess, setFlashcardSuccess] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');

  // Note creation pane states
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState<'custom' | 'ai'>('ai');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [noteType, setNoteType] = useState<'normal' | 'exam_ready'>('normal');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch notes');
      setNotes(data.notes || []);
      if (data.notes && data.notes.length > 0) {
        setSelectedNote(prev => prev || data.notes[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNotes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (createMode === 'custom') {
      if (!title || !content || !subject || !classLevel) {
        setError('Please fill in all fields.');
        return;
      }

      try {
        setGenerating(true);
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, subject, class_level: classLevel, note_type: noteType, content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save note');

        setNotes(prev => [data.note, ...prev]);
        setSelectedNote(data.note);
        setCreating(false);
        resetForm();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save note');
      } finally {
        setGenerating(false);
      }
    } else {
      if (!topic || !subject || !classLevel) {
        setError('Please specify topic, subject, and class level.');
        return;
      }

      try {
        setGenerating(true);
        // Step 1: Generate with AI
        const genRes = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, subject, classLevel, noteType }),
        });
        const genData = await genRes.json();
        if (!genRes.ok) throw new Error(genData.error || 'Generation failed');

        // Step 2: Save generated note to DB
        const saveRes = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || `${subject} ${classLevel} - ${topic}`,
            subject,
            class_level: classLevel,
            note_type: noteType,
            content: genData.content,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save note');

        setNotes(prev => [saveData.note, ...prev]);
        setSelectedNote(saveData.note);
        setCreating(false);
        resetForm();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to generate note');
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study note?')) return;
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      const updated = notes.filter(n => n.id !== id);
      setNotes(updated);
      if (selectedNote?.id === id) {
        setSelectedNote(updated.length > 0 ? updated[0] : null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleGenerateFlashcards = async (note: Note) => {
    setGeneratingFlashcards(true);
    setFlashcardSuccess('');
    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: note.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setFlashcardSuccess(`✓ Created ${data.card_count} flashcards! Redirecting…`);
      setTimeout(() => router.push(`/flashcards/${data.deck_id}`), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setClassLevel('');
    setNoteType('normal');
    setTopic('');
    setContent('');
  };

  const exportNotePDF = async (note: Note) => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const title = note.title;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Subject: ${note.subject} · Grade: ${note.class_level} · Format: ${note.note_type === 'exam_ready' ? 'Revision Sheet' : 'Comprehensive Theory'}`, 14, 27);
      doc.setTextColor(0);

      // Strip highlight span wrapper tags for plain PDF formatting
      const cleanContent = note.content
        .replace(/<span\s+class=["']?note-term["']?\s*>([\s\S]*?)<\/span>/gi, '$1')
        .replace(/<span\s+class=["']?note-definition["']?\s*>([\s\S]*?)<\/span>/gi, '$1')
        .replace(/<span\s+class=["']?note-formula["']?\s*>([\s\S]*?)<\/span>/gi, '$1')
        .replace(/<span\s+class=["']?note-statement["']?\s*>([\s\S]*?)<\/span>/gi, '$1')
        .replace(/#+\s+(.*)/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1');

      let y = 38;
      const lines = doc.splitTextToSize(cleanContent, 182);
      lines.forEach((line: string) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(line, 14, y);
        y += 6;
      });

      doc.save(`${title.replace(/\s+/g, '_')}_notes.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF');
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = !filterSubject || n.subject === filterSubject;
    const matchesType = !filterType || n.note_type === filterType;
    return matchesSearch && matchesSubject && matchesType;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Study Notes</h1>
          <p>Create detailed study notes or forge exam-ready revision sheets instantly.</p>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={() => { setCreating(true); resetForm(); }}>
            <Plus size={15} /> Create Note
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} color="var(--error)" />
          <p style={{ color: '#f87171', fontSize: '0.875rem', flex: 1, margin: 0 }}>{error}</p>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={15} /></button>
        </div>
      )}

      {creating ? (
        /* ==================== CREATE NOTE STATE ==================== */
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCreating(false)}>
              <ArrowLeft size={16} />
            </button>
            <h2 style={{ fontSize: '1.25rem' }}>Create New Study Note</h2>
          </div>

          {/* Selector */}
          <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setCreateMode('ai')}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'calc(var(--radius) - 2px)',
                background: createMode === 'ai' ? 'var(--surface)' : 'transparent',
                color: createMode === 'ai' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: createMode === 'ai' ? 600 : 500, fontSize: '0.82rem', cursor: 'pointer', font: 'inherit',
              }}
            >
              <Zap size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
              AI Notes Forge
            </button>
            <button
              onClick={() => setCreateMode('custom')}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'calc(var(--radius) - 2px)',
                background: createMode === 'custom' ? 'var(--surface)' : 'transparent',
                color: createMode === 'custom' ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: createMode === 'custom' ? 600 : 500, fontSize: '0.82rem', cursor: 'pointer', font: 'inherit',
              }}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Write Custom Note
            </button>
          </div>

          <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Note Type & Title */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} required style={{ width: '100%' }}>
                  <option value="">Select Subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Class Level</label>
                <select value={classLevel} onChange={e => setClassLevel(e.target.value)} required style={{ width: '100%' }}>
                  <option value="">Select Class</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Note Title {createMode === 'ai' && '(Optional)'}
                </label>
                <input
                  className="input"
                  placeholder="e.g. Physics Chapter 3: Laws of Motion"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required={createMode === 'custom'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Format Utility</label>
                <select value={noteType} onChange={e => setNoteType(e.target.value as 'normal' | 'exam_ready')} style={{ width: '100%' }}>
                  <option value="normal">Normal (Detailed)</option>
                  <option value="exam_ready">Exam Ready (Revision)</option>
                </select>
              </div>
            </div>

            {createMode === 'ai' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Topic / Chapter Concepts</label>
                <input
                  className="input"
                  placeholder="e.g. Chemical Bonding and Molecular Structure"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                  Theorem will create highly detailed revision material automatically highlighting definitions, formulas, statements and terms.
                </p>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Content (Markdown supported)</label>
                <textarea
                  className="input"
                  rows={12}
                  placeholder="Type your notes here. You can naturally highlight elements by using:
<span class=&quot;note-term&quot;>term</span>
<span class=&quot;note-definition&quot;>definition</span>
<span class=&quot;note-formula&quot;>formula</span>
<span class=&quot;note-statement&quot;>statement</span>"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.6 }}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)} disabled={generating}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={generating}>
                {generating ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow 0.6s linear infinite' }} />
                    {createMode === 'ai' ? 'Forging notes…' : 'Saving…'}
                  </>
                ) : (
                  <>
                    {createMode === 'ai' ? <Zap size={14} /> : <CheckCircle size={14} />}
                    {createMode === 'ai' ? 'Forge with AI' : 'Save Note'}
                  </>
                )}
              </button>
            </div>
          </form>

          {generating && createMode === 'ai' && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="shimmer" style={{ height: 60, borderRadius: 'var(--radius)' }} />
              <div className="shimmer" style={{ height: 120, borderRadius: 'var(--radius)' }} />
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Zap size={13} /> Writing study material… This may take 20–30 seconds.
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        /* ==================== WORKSPACE DOUBLE-PANE STATE ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT PANEL - LIST OF NOTES */}
          <div className="lg:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              {/* Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.4rem 0.75rem', marginBottom: '0.75rem' }}>
                <Search size={15} color="var(--text-dim)" />
                <input
                  placeholder="Search notes…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--text)' }}
                />
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.75rem' }}>
                  <option value="">All Subjects</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.75rem' }}>
                  <option value="">All Formats</option>
                  <option value="normal">Normal</option>
                  <option value="exam_ready">Exam Ready</option>
                </select>
              </div>
            </div>

            {/* Note items scroll area */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {loading ? (
                <SkeletonList />
              ) : filteredNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <BookOpen size={24} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No notes found.</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const active = selectedNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      style={{
                        padding: '0.875rem 1rem',
                        background: active ? 'var(--ember-subtle)' : 'var(--surface)',
                        border: `1px solid ${active ? 'var(--ember-border)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ember)', letterSpacing: '0.04em' }}>
                          {note.subject} · {note.class_level}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 4,
                          background: note.note_type === 'exam_ready' ? 'var(--highlight)' : 'var(--surface-3)',
                          color: note.note_type === 'exam_ready' ? '#8a622a' : 'var(--text-muted)'
                        }}>
                          {note.note_type === 'exam_ready' ? 'Exam Ready' : 'Normal'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL - DETAILED NOTE VIEW */}
          <div className="lg:col-span-3">
            {selectedNote ? (
              <motion.div key={selectedNote.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: '2.5rem' }}>
                {/* Note Actions / Header details */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-serif)', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedNote.title}</h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedNote.subject} · {selectedNote.class_level} · {selectedNote.note_type === 'exam_ready' ? 'Revision Format' : 'Detailed Format'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                     {flashcardSuccess ? (
                       <span style={{ fontSize: '0.78rem', color: 'var(--ember)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <CheckCircle size={13} /> {flashcardSuccess}
                       </span>
                     ) : (
                       <button
                         className="btn btn-ghost btn-sm"
                         style={{ color: 'var(--ember)', borderColor: 'var(--ember-border)' }}
                         onClick={() => handleGenerateFlashcards(selectedNote)}
                         disabled={generatingFlashcards}
                       >
                         <Layers size={13} />
                         {generatingFlashcards ? 'Forging…' : 'Generate Flashcards'}
                       </button>
                     )}
                     <button className="btn btn-ghost btn-sm" onClick={() => exportNotePDF(selectedNote)}>
                       <Download size={13} /> Export PDF
                     </button>
                     <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteNote(selectedNote.id)}>
                       <Trash2 size={13} />
                     </button>
                   </div>
                </div>


                {/* Rendered HTML */}
                <div 
                  className="editorial-notes-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(selectedNote.content) }} 
                  style={{ overflowX: 'auto' }}
                />
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <BookOpen size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>No Note Selected</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: 300, margin: '0 auto 1.5rem' }}>
                  Select an existing note from the list, or create a new one to get started.
                </p>
                <button className="btn btn-primary btn-sm" style={{ margin: '0 auto' }} onClick={() => { setCreating(true); resetForm(); }}>
                  <Plus size={14} /> Create Note
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
