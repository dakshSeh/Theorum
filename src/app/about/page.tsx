'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Cpu, Target } from 'lucide-react';
import TheoremLogo from '@/components/ui/TheoremLogo';

export default function AboutPage() {
  return (
    <>
      {/* Minimal nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--surface-glass)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.05), inset 0 -1px 0 rgba(255,255,255,0.1)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TheoremLogo size={16} color="var(--text)" />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Theorem</span>
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Start for free <ArrowRight size={14} /></Link>
        </div>
      </nav>

      <div style={{ paddingTop: 64 }}>
        {/* Hero */}
        <section className="section grid-bg" style={{ position: 'relative', overflow: 'hidden', minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
          <div className="noise-texture" />
          <div className="container" style={{ maxWidth: 720, position: 'relative', zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <h1 className="hero-title" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}>
                Cold PDFs enter.<br />
                <span style={{ color: 'var(--ember)' }}>
                  Sharper minds leave.
                </span>
              </h1>
              <p className="editorial-text">
                Theorem was built on one observation: students spend more time <em>hunting for good practice questions</em> than actually <span style={{ color: 'var(--ember)' }}>practising</span>. We built the tool we wished existed.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="section diagonal-bg" style={{ background: 'var(--surface)' }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
              {[
                { icon: Target, title: 'Mission', desc: 'To make quality exam preparation accessible, intelligent, and adaptive — for every student, regardless of school or resources.' },
                { icon: BookOpen, title: 'Philosophy', desc: 'Learning is strengthened through deliberate challenge. Passive re-reading fools you into false confidence. Theorem forces active recall.' },
                { icon: Cpu, title: 'Technology', desc: 'State-of-the-art language models, prompted specifically to understand standardized exam conventions — not just generic quiz generators.' },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }} className="card card-ember">
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--radius)', background: 'var(--ember-subtle)', border: '1px solid var(--ember-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <item.icon size={22} color="var(--ember)" />
                  </div>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{item.title}</h3>
                  <p className="editorial-text" style={{ fontSize: '1rem' }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* The Forge Metaphor */}
        <section className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '2rem', letterSpacing: '-0.03em' }}>Why &ldquo;Theorem&rdquo;?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  'A theorem is not a guess. It is a proven truth — arrived at through rigorous process, not intuition. That is what we want your exam preparation to feel like.',
                  'The forge metaphor runs through everything we do. A forge does not just heat metal — it works it, shapes it, removes impurities. Raw information is not enough. It needs to be forged into understanding.',
                  'Theorem is not just a quiz generator. It is a system that converts passive studying into active intellectual refinement. The questions it generates are not random — they follow the logic of how expert examiners actually think.',
                  'We built Theorem to be a quiet academic weapon. Not loud. Not gimmicky. Just devastatingly useful.',
                ].map((para, i) => (
                  <p key={i} className="editorial-text">{para}</p>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <TheoremLogo size={40} color="var(--ember)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Ready to start practicing?</h2>
            <p className="editorial-text" style={{ margin: '0 auto 2.5rem' }}>
              Upload your first chapter and see what Theorem can do.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg" style={{ fontSize: '1.1rem', padding: '1rem 3rem' }}>
              Start for free <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 22, height: 22, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TheoremLogo size={12} color="var(--text)" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Theorem</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Where learning is forged through practice.</p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link href="/feedback" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Leave Feedback</Link>
              <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>← Back to home</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
