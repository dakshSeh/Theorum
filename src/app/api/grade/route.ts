import { NextResponse, type NextRequest } from 'next/server';
import { gradeSubjectiveAnswers } from '@/lib/ai/groq';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json() as {
      answers: {
        id: string;
        questionText: string;
        userAnswer: string;
        modelAnswer: string;
        marks: number;
      }[];
    };

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const results = await gradeSubjectiveAnswers(answers, apiKey);

    return NextResponse.json({ results });
  } catch (err: unknown) {
    console.error('[grade]', err);
    const message = err instanceof Error ? err.message : 'Grading failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
