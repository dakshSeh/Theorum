import type { GeneratedQuestion, GenerationOptions, QuestionType, Difficulty } from '@/lib/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function buildCBSEPrompt(text: string, options: GenerationOptions): string {
  const { difficulty, questionCount, typeMix } = options;

  const typeBreakdown = Object.entries(typeMix)
    .filter(([, pct]) => pct && pct > 0)
    .map(([type, pct]) => `  - ${type}: ${pct}%`)
    .join('\n');

  const difficultyInstruction = difficulty === 'mixed'
    ? 'Mix difficulty levels: approximately 30% easy, 40% moderate, 30% hard.'
    : `All questions should be ${difficulty} difficulty.`;

  return `You are an expert CBSE exam question paper setter with 20+ years of experience.
Your task is to generate exactly ${questionCount} high-quality, exam-ready questions from the provided study material.

CRITICAL RULES:
1. Questions must be strictly based on the provided text. No hallucinated facts.
2. Use authentic CBSE board exam wording and style.
3. EXACT DIFFICULTY: ${difficultyInstruction} You MUST strictly follow the requested difficulty level. Make hard questions genuinely complex and easy questions straightforward.
4. ABSOLUTE CORRECTNESS: Every single question's answer MUST be 100% factually accurate and flawless. Double-check your logic.
5. For MCQs: Provide exactly 4 options (A, B, C, D) with exactly ONE correct answer. VARIATION: The incorrect options (distractors) must be highly varied, plausible but clearly wrong. Randomize which option (A, B, C, or D) is the correct one across questions.
6. Explanations must be concise and educational (2-3 sentences).
7. Ensure strict adherence to the requested question types. Do NOT generate question types that were not requested.
8. Uniqueness and Variety: Do not repeat questions or concepts. Each question must test a distinct, unique concept from the material. Use varied sentence structures. Ensure no two questions are similar in meaning or phrasing.

QUESTION TYPE DISTRIBUTION (approximate percentages):
${typeBreakdown || '  - Mix of MCQ and short answer questions'}

QUESTION TYPE DEFINITIONS:
- mcq: Multiple choice with 4 options, 1 mark
- assertion_reason: Assertion-Reason format (A: ..., R: ...), 1 mark
- fill_blank: Fill in the blank, 1 mark
- short_2mark: Short answer, 2 marks (3-4 sentences expected)
- short_3mark: Short answer, 3 marks (5-6 sentences expected)
- long_5mark: Long answer/essay, 5 marks (detailed explanation)
- case_based: Passage-based comprehension question, 4 marks
- hots: Higher order thinking, application/analysis, 3 marks
- match_following: Match column A with column B, 1 mark

OUTPUT FORMAT: Respond ONLY with a valid JSON array. No markdown, no explanation outside JSON.

[
  {
    "question_text": "...",
    "question_type": "mcq",
    "difficulty": "easy",
    "options": [
      {"label": "A", "text": "...", "is_correct": false},
      {"label": "B", "text": "...", "is_correct": true},
      {"label": "C", "text": "...", "is_correct": false},
      {"label": "D", "text": "...", "is_correct": false}
    ],
    "answer": "B",
    "explanation": "...",
    "marks": 1
  }
]

For non-MCQ questions, omit the "options" field and set "answer" to the model answer text.

STUDY MATERIAL:
---
${text.slice(0, 12000)}
---

Generate exactly ${questionCount} questions now:`;
}

function buildCBSEPromptByTopic(
  topic: string,
  subject: string,
  classLevel: string,
  options: GenerationOptions
): string {
  const { difficulty, questionCount, typeMix } = options;

  const typeBreakdown = Object.entries(typeMix)
    .filter(([, pct]) => pct && pct > 0)
    .map(([type, pct]) => `  - ${type}: ${pct}%`)
    .join('\n');

  const difficultyInstruction = difficulty === 'mixed'
    ? 'Mix difficulty levels: approximately 30% easy, 40% moderate, 30% hard.'
    : `All questions should be ${difficulty} difficulty.`;

  return `You are an expert CBSE exam question paper setter with 20+ years of experience.
Your task is to generate exactly ${questionCount} high-quality, syllabus-relevant, exam-ready questions for the following target:
- Subject: ${subject}
- Class/Grade: ${classLevel}
- Topic/Chapter: ${topic}

CRITICAL RULES:
1. Questions must be highly relevant, syllabus-accurate, and aligned with standard curriculum models for ${classLevel}.
2. Use authentic board exam wording and style.
3. EXACT DIFFICULTY: ${difficultyInstruction} You MUST strictly follow the requested difficulty level. Make hard questions genuinely complex and easy questions straightforward.
4. ABSOLUTE CORRECTNESS: Every single question's answer MUST be 100% factually accurate and flawless. Double-check your logic.
5. For MCQs: Provide exactly 4 options (A, B, C, D) with exactly ONE correct answer. VARIATION: The incorrect options (distractors) must be highly varied, plausible but clearly wrong. Randomize which option (A, B, C, or D) is the correct one across questions.
6. Explanations must be concise and educational (2-3 sentences).
7. Ensure strict adherence to the requested question types. Do NOT generate question types that were not requested.
8. Uniqueness and Variety: Do not repeat questions or concepts. Each question must test a distinct, unique concept from the material. Use varied sentence structures. Ensure no two questions are similar in meaning or phrasing.

QUESTION TYPE DISTRIBUTION (approximate percentages):
${typeBreakdown || '  - Mix of MCQ and short answer questions'}

QUESTION TYPE DEFINITIONS:
- mcq: Multiple choice with 4 options, 1 mark
- assertion_reason: Assertion-Reason format (A: ..., R: ...), 1 mark
- fill_blank: Fill in the blank, 1 mark
- short_2mark: Short answer, 2 marks (3-4 sentences expected)
- short_3mark: Short answer, 3 marks (5-6 sentences expected)
- long_5mark: Long answer/essay, 5 marks (detailed explanation)
- case_based: Passage-based comprehension question, 4 marks
- hots: Higher order thinking, application/analysis, 3 marks
- match_following: Match column A with column B, 1 mark

OUTPUT FORMAT: Respond ONLY with a valid JSON array. No markdown, no explanation outside JSON.

[
  {
    "question_text": "...",
    "question_type": "mcq",
    "difficulty": "easy",
    "options": [
      {"label": "A", "text": "...", "is_correct": false},
      {"label": "B", "text": "...", "is_correct": true},
      {"label": "C", "text": "...", "is_correct": false},
      {"label": "D", "text": "...", "is_correct": false}
    ],
    "answer": "B",
    "explanation": "...",
    "marks": 1
  }
]

For non-MCQ questions, omit the "options" field and set "answer" to the model answer text.

Generate exactly ${questionCount} questions now:`;
}

export async function generateQuestionsWithAI(
  text: string,
  options: GenerationOptions,
  apiKey: string,
  topicParams?: { topic: string; subject: string; classLevel: string }
): Promise<GeneratedQuestion[]> {
  const prompt = topicParams
    ? buildCBSEPromptByTopic(topicParams.topic, topicParams.subject, topicParams.classLevel, options)
    : buildCBSEPrompt(text, options);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content returned from AI');

  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const questions = JSON.parse(cleaned) as GeneratedQuestion[];

  // Normalize and validate
  return questions.map((q, i) => ({
    question_text: q.question_text || `Question ${i + 1}`,
    question_type: (q.question_type || 'mcq') as QuestionType,
    difficulty: (q.difficulty || 'moderate') as Difficulty,
    options: q.options || undefined,
    answer: q.answer || '',
    explanation: q.explanation || '',
    marks: q.marks || 1,
  }));
}

export async function generateNotesWithAI(
  topic: string,
  subject: string,
  classLevel: string,
  noteType: 'normal' | 'exam_ready',
  apiKey: string
): Promise<string> {
  const noteTypePrompt = noteType === 'exam_ready'
    ? `Create an EXAM-READY revision sheet. It must be high-density, bulleted, straight-to-the-point, and optimized for maximum speed and revision performance. Avoid unnecessary fluff, but ensure every single important fact, date, formula, and definition is present. Minimum length: 1000 words.`
    : `Create a DETAILED, extensive, and highly comprehensive study note. It must cover all concepts, explanations, background theory, historical context (if applicable), and step-by-step logic exhaustively. Write in a clear, academic, and highly readable editorial tone. You MUST include deep conceptual breakdowns, real-world examples, and edge cases. MINIMUM LENGTH: 1500 to 2000 words. Do not be brief. Explain everything deeply.`;

  const prompt = `You are a premium, highly academic educational content creator and curriculum expert.
Your task is to write an extraordinarily comprehensive, top-tier study note on the following target:
- Subject: ${subject}
- Class/Grade: ${classLevel}
- Topic: ${topic}

NOTE STYLE REQUIREMENT:
${noteTypePrompt}

FORMATTING:
- Use clear markdown structure (headers '#', '##', '###', bullet points, numbered lists, bold text).
- Structure the content with an introduction, core concepts, detailed breakdowns, examples, and a summary.
- Return ONLY the clean markdown string. Do not wrap the response in markdown JSON or anything else. Just start directly with the title header '#'.

Write the extensive notes now:`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content returned from AI');

  return content;
}

export async function gradeSubjectiveAnswers(
  answers: {
    id: string;
    questionText: string;
    userAnswer: string;
    modelAnswer: string;
    marks: number;
  }[],
  apiKey: string
): Promise<{ id: string; marksAwarded: number; feedback: string; isCorrect: boolean }[]> {
  const prompt = `You are a fair, encouraging, and highly competent AI teacher grading a student's test.
Your task is to grade the following subjective answers submitted by a student.

For each question, you are given:
- ID
- Question Text
- Student's Answer
- Model Answer (Reference)
- Maximum Marks (Weightage)

CRITICAL RULES:
1. Grade the student's answer fairly out of the maximum marks. Partial marks (e.g., 1.5, 2) can be awarded if the answer is partially correct.
2. Provide constructive feedback (1-3 sentences) explaining what they did well (praise) and what they missed or got wrong.
3. Determine if the answer is "correct" overall (usually meaning they scored more than 50% of the max marks, or grasped the core concept).
4. Do not be overly harsh for minor spelling mistakes, but be strict on factual accuracy.

You MUST respond ONLY with a valid JSON array of objects in this exact format, with NO other text:
[
  {
    "id": "question_id_here",
    "marksAwarded": 2.5,
    "feedback": "Great job identifying X! However, you missed Y which is crucial for full marks.",
    "isCorrect": true
  }
]

INPUT ANSWERS:
${JSON.stringify(answers, null, 2)}

Respond with the JSON array now:`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Low temperature for consistent grading
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('No content returned from AI');

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const results = JSON.parse(cleaned) as { id: string; marksAwarded: number; feedback: string; isCorrect: boolean }[];
  
  return results;
}

export async function generateTargetedPractice(
  originalTitle: string,
  userPerformance: {
    questionText: string;
    questionType: string;
    userAnswer: string;
    isCorrect: boolean;
    marksAwarded?: number;
    maxMarks: number;
    feedback?: string;
  }[],
  apiKey: string
): Promise<{
  analysis: string;
  difficulty: "easy" | "moderate" | "hard" | "mixed";
  title: string;
  questions: GeneratedQuestion[];
}> {
  const prompt = `You are an expert CBSE AI tutor. A student just completed a quiz titled "${originalTitle}".
I am providing their performance on the quiz below.
Your task is to analyze their weak points and generate a NEW targeted practice quiz to help them improve.

RULES:
1. Analyze the performance and isolate ONLY the specific concepts and topics from the questions where the user scored poorly or got the answer incorrect.
2. Determine their overall performance. If they did very poorly (many mistakes), set the new quiz difficulty to 'easy'. If they did okay but made a few mistakes, set it to 'moderate'. If they got almost everything right, set it to 'hard' to challenge them further.
3. Generate exactly 5 to 10 NEW questions that EXCLUSIVELY test the specific weak areas you identified in step 1. Do not generate questions for concepts they already mastered. Use a mix of types (e.g. MCQ, short answer).
4. Output EXACTLY a JSON object with this schema, and NO markdown code fences or conversational text:
{
  "analysis": "A brief explanation of what the student needs to work on and why you chose these questions.",
  "difficulty": "easy",
  "title": "Targeted Practice: [Topic]",
  "questions": [
    {
      "question_text": "...",
      "question_type": "mcq", // or short_2mark, long_5mark, etc.
      "difficulty": "easy",
      "options": [{"label":"A", "text":"...", "is_correct":true}, ...], // ONLY if mcq
      "answer": "...",
      "explanation": "...",
      "marks": 1
    }
  ]
}

USER PERFORMANCE:
${JSON.stringify(userPerformance, null, 2)}

Respond with ONLY the raw JSON object.`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content returned from AI');

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Normalize questions
  parsed.questions = parsed.questions.map((q: any, i: number) => ({
    question_text: q.question_text || `Question ${i + 1}`,
    question_type: (q.question_type || 'mcq') as QuestionType,
    difficulty: (q.difficulty || 'moderate') as Difficulty,
    options: q.options || undefined,
    answer: q.answer || '',
    explanation: q.explanation || '',
    marks: q.marks || 1,
  }));

  return parsed;
}
