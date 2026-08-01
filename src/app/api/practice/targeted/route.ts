import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTargetedPractice } from '@/lib/ai/groq';

// Initialize Supabase admin client to bypass RLS for DB inserts within the API route
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const { sessionId, quizSetId } = await req.json();

    if (!sessionId || !quizSetId) {
      return NextResponse.json({ error: 'sessionId and quizSetId are required' }, { status: 400 });
    }

    // 1. Fetch original quiz set
    const { data: quizSet, error: quizSetError } = await supabaseAdmin
      .from('quiz_sets')
      .select('*')
      .eq('id', quizSetId)
      .single();

    if (quizSetError || !quizSet) {
      throw new Error(`Failed to fetch quiz set: ${quizSetError?.message}`);
    }

    // 2. Fetch session and answers
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('*, session_answers(*, questions(question_text, question_type, difficulty, marks))')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to fetch session: ${sessionError?.message}`);
    }

    // 3. Prepare performance data for the AI
    // We filter for questions where the user was either wrong, or lost marks, or just send all to let AI decide.
    // Let's send everything so AI sees the full context, but emphasize what's wrong.
    const userPerformance = session.session_answers.map((ans: any) => ({
      questionText: ans.questions.question_text,
      questionType: ans.questions.question_type,
      userAnswer: ans.user_answer,
      isCorrect: ans.is_correct,
      marksAwarded: ans.marks_awarded,
      maxMarks: ans.questions.marks,
      feedback: ans.ai_feedback,
    }));

    // Check if the user has provided a Groq API Key
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('groq_api_key')
      .eq('id', session.user_id)
      .single();

    const groqKey = userRecord?.groq_api_key || process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq API Key not found. Please add it in settings.' }, { status: 401 });
    }

    // 4. Call AI to generate targeted practice
    const aiResult = await generateTargetedPractice(quizSet.title, userPerformance, groqKey);

    // 5. Save the new quiz set
    const newTitle = aiResult.title || `Targeted Practice: ${quizSet.title}`;
    
    const { data: newQuizSet, error: newSetError } = await supabaseAdmin
      .from('quiz_sets')
      .insert({
        user_id: session.user_id,
        title: newTitle,
        subject: quizSet.subject,
        chapter: quizSet.chapter,
        difficulty: aiResult.difficulty || 'mixed',
        question_count: aiResult.questions.length,
      })
      .select()
      .single();

    if (newSetError || !newQuizSet) {
      throw new Error(`Failed to create new quiz set: ${newSetError?.message}`);
    }

    // 6. Save the new questions
    const questionsToInsert = aiResult.questions.map((q: any, i: number) => ({
      quiz_set_id: newQuizSet.id,
      user_id: session.user_id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      marks: q.marks,
      order_index: i,
    }));

    const { error: insertQuestionsError } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert);

    if (insertQuestionsError) {
      // Rollback quiz set
      await supabaseAdmin.from('quiz_sets').delete().eq('id', newQuizSet.id);
      throw new Error(`Failed to insert questions: ${insertQuestionsError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      quizSetId: newQuizSet.id,
      analysis: aiResult.analysis 
    });

  } catch (error: any) {
    console.error('Targeted practice generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
