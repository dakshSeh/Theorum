import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// We create a custom client bypassing RLS using the service role key to fetch all feedback
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminFeedbackPage() {
  const cookieStore = await cookies();

  // Create a regular authenticated client to check the current user
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user || user.email !== 'sehrawatdaksh143@gmail.com') {
    redirect('/dashboard');
  }

  const supabaseAdmin = getAdminClient();
  const { data: feedback, error } = await supabaseAdmin
    .from('site_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback:', error);
  }

  // Fetch all users to map emails since we cannot join auth.users directly via PostgREST
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const userMap = new Map(users.map(u => [u.id, u.email]));

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Site Feedback</h1>
          <p style={{ color: 'var(--text-muted)' }}>Admin view restricted to sehrawatdaksh143@gmail.com</p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">Back to Dashboard</Link>
      </div>

      {(!feedback || feedback.length === 0) ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <MessageSquare size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No feedback yet</h3>
          <p style={{ fontSize: '0.875rem' }}>When users submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feedback.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      color={item.rating >= star ? 'var(--ember)' : 'var(--border)'}
                      fill={item.rating >= star ? 'var(--ember)' : 'transparent'}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              
              <p style={{ fontSize: '1rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {item.message}
              </p>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{item.role || 'Not specified'}</span>
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <strong>User:</strong> {item.user_id ? userMap.get(item.user_id) || item.user_id : 'Anonymous'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
