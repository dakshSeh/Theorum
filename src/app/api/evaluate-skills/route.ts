import { NextResponse, type NextRequest } from 'next/server';
import { evaluateCognitiveSkills } from '@/lib/ai/groq';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the session and its answers
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select(`
        *,
        session_answers (
          user_answer,
          is_correct,
          marks_awarded,
          ai_feedback,
          questions (
            question_text,
            question_type,
            marks,
            answer,
            options
          )
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Format transcript for AI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transcript = session.session_answers.map((ans: any) => ({
      question: ans.questions?.question_text,
      type: ans.questions?.question_type,
      maxMarks: ans.questions?.marks,
      correctAnswer: ans.questions?.answer,
      userAnswer: ans.user_answer,
      marksAwarded: ans.marks_awarded,
      feedback: ans.ai_feedback,
    }));

    // Evaluate
    const apiKey = process.env.GROQ_API_KEY;
    const scores = await evaluateCognitiveSkills(transcript, apiKey);

    // Save back to database
    const { error: updateError } = await supabaseAdmin
      .from('quiz_sessions')
      .update({
        skill_recall: scores.recall,
        skill_comprehension: scores.comprehension,
        skill_application: scores.application,
        skill_analysis: scores.analysis,
        skill_evaluation: scores.evaluation,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update skills:', updateError);
    }

    return NextResponse.json({ success: true, scores });
  } catch (err: unknown) {
    console.error('[evaluate-skills]', err);
    const message = err instanceof Error ? err.message : 'Evaluation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
