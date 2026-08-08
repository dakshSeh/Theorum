'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [role, setRole] = useState<'student' | 'teacher' | 'other' | ''>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!role) {
      setError('Please select your role');
      return;
    }
    if (!message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('site_feedback').insert({
        user_id: user?.id || null,
        rating,
        role,
        message: message.trim()
      });

      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while submitting feedback');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: 400, textAlign: 'center', padding: '3rem 2rem' }}>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Thank You!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your feedback helps us make Theorem better for everyone.</p>
          <Link href="/" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Return Home</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <Link href="/" style={{ display: 'inline-block', marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
          &larr; Back to Home
        </Link>
        
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card card-ember">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <MessageSquare color="var(--ember)" />
            <h1 style={{ fontSize: '1.5rem' }}>Share Your Feedback</h1>
          </div>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
            We&apos;d love to hear about your experience with Theorem. Your thoughts help us improve!
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Rating */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                How would you rate your experience?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      padding: '0.25rem',
                      transition: 'transform 0.1s'
                    }}
                    className="hover-scale"
                  >
                    <Star 
                      size={32} 
                      color={(hoverRating || rating) >= star ? 'var(--ember)' : 'var(--border)'} 
                      fill={(hoverRating || rating) >= star ? 'var(--ember)' : 'transparent'} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                I am a...
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(['student', 'teacher', 'other'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${role === r ? 'var(--ember)' : 'var(--border)'}`,
                      background: role === r ? 'var(--ember-light)' : 'var(--surface-2)',
                      color: role === r ? 'var(--ember)' : 'var(--text)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                What did you like? What could we improve?
              </label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: '120px', resize: 'vertical', paddingTop: '0.75rem' }}
                placeholder="Tell us your thoughts..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderLeft: '3px solid var(--danger)', color: 'var(--danger)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? 'Submitting...' : <><Send size={16} /> Submit Feedback</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
