-- ============================================================
-- THEOREM — Full Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  storage_path    TEXT,
  extracted_text  TEXT,
  subject         TEXT,
  chapter         TEXT,
  key_concepts    TEXT[],
  word_count      INTEGER,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','parsing','analyzing','done','error')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own uploads" ON public.uploads;
CREATE POLICY "Users manage own uploads"
  ON public.uploads FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. FOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#e8681a',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own folders" ON public.folders;
CREATE POLICY "Users manage own folders"
  ON public.folders FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. QUIZ SETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id       UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  folder_id       UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  subject         TEXT,
  chapter         TEXT,
  difficulty      TEXT DEFAULT 'mixed' CHECK (difficulty IN ('easy','moderate','hard','mixed')),
  question_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quiz sets" ON public.quiz_sets;
CREATE POLICY "Users manage own quiz sets"
  ON public.quiz_sets FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_set_id     UUID NOT NULL REFERENCES public.quiz_sets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL CHECK (question_type IN (
    'mcq','assertion_reason','match_following',
    'fill_blank','short_2mark','short_3mark',
    'long_5mark','case_based','hots'
  )),
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy','moderate','hard')),
  options         JSONB,
  answer          TEXT,
  explanation     TEXT,
  marks           INTEGER DEFAULT 1,
  order_index     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own questions" ON public.questions;
CREATE POLICY "Users manage own questions"
  ON public.questions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. QUIZ SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_set_id     UUID NOT NULL REFERENCES public.quiz_sets(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL CHECK (mode IN ('practice','exam','adaptive')),
  score           NUMERIC(5,2),
  accuracy        NUMERIC(5,2),
  duration_secs   INTEGER,
  completed       BOOLEAN DEFAULT false,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sessions" ON public.quiz_sessions;
CREATE POLICY "Users manage own sessions"
  ON public.quiz_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. SESSION ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_answer     TEXT,
  is_correct      BOOLEAN,
  time_taken_secs INTEGER,
  ai_feedback     TEXT,
  marks_awarded   NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own answers" ON public.session_answers;
CREATE POLICY "Users manage own answers"
  ON public.session_answers FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. SITE FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role            TEXT CHECK (role IN ('student', 'teacher', 'other')),
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.site_feedback;
CREATE POLICY "Anyone can insert feedback"
  ON public.site_feedback FOR INSERT
  WITH CHECK (true);

-- No select policy needed because we will query using a service role key in the admin route.

-- ============================================================
-- 9. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_uploads_user        ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sets_user      ON public.quiz_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_set  ON public.questions(quiz_set_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user       ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_session     ON public.session_answers(session_id);

-- ============================================================
-- 10. CACHE RELOAD
-- ============================================================
-- This is critical to ensure the API recognizes the new tables immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 11. STORAGE BUCKET POLICIES
-- ============================================================
-- Note: You must first create a Private bucket named "uploads" in the dashboard
-- Then these policies will secure it.
CREATE POLICY "Users upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
