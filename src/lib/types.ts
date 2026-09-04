export type UserRole = 'student' | 'teacher';
export type QuestionType =
  | 'mcq'
  | 'assertion_reason'
  | 'match_following'
  | 'fill_blank'
  | 'short_2mark'
  | 'short_3mark'
  | 'long_5mark'
  | 'case_based'
  | 'hots';
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type QuizMode = 'practice' | 'exam' | 'adaptive';
export type UploadStatus = 'pending' | 'parsing' | 'analyzing' | 'done' | 'error';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string | null;
  extracted_text: string | null;
  subject: string | null;
  chapter: string | null;
  key_concepts: string[] | null;
  word_count: number | null;
  status: UploadStatus;
  created_at: string;
}

export interface MCQOption {
  label: string;   // A, B, C, D
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  quiz_set_id: string;
  user_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  options: MCQOption[] | null;
  answer: string | null;
  explanation: string | null;
  marks: number;
  order_index: number;
  created_at: string;
}

export interface QuizSet {
  id: string;
  user_id: string;
  upload_id: string | null;
  folder_id: string | null;
  title: string;
  subject: string | null;
  chapter: string | null;
  difficulty: Difficulty | 'mixed';
  question_count: number;
  created_at: string;
  questions?: Question[];
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  quiz_sets?: QuizSet[];
}

export interface QuizSession {
  id: string;
  user_id: string;
  quiz_set_id: string;
  mode: QuizMode;
  score: number | null;
  accuracy: number | null;
  duration_secs: number | null;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  skill_recall: number | null;
  skill_comprehension: number | null;
  skill_application: number | null;
  skill_analysis: number | null;
  skill_evaluation: number | null;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  user_answer: string | null;
  is_correct: boolean | null;
  time_taken_secs: number | null;
  ai_feedback: string | null;
  marks_awarded: number | null;
}

// Generation options
export interface GenerationOptions {
  difficulty: Difficulty | 'mixed';
  questionCount: number;
  typeMix: Partial<Record<QuestionType, number>>; // percentage allocation
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  options?: MCQOption[];
  answer: string;
  explanation: string;
  marks: number;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  class_level: string;
  note_type: 'normal' | 'exam_ready';
  content: string;
  created_at: string;
}

export type CardType = 'term' | 'definition' | 'formula' | 'statement' | 'custom';
export type ReviewRating = 0 | 1 | 2 | 3; // Again | Hard | Good | Easy

export interface FlashcardDeck {
  id: string;
  user_id: string;
  note_id: string | null;
  title: string;
  subject: string;
  class_level: string;
  card_count: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  card_type: CardType;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_date: string;
  last_reviewed_at: string | null;
  created_at: string;
}
