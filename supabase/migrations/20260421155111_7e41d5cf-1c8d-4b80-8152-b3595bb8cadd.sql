-- user_courses table
CREATE TABLE public.user_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  ects NUMERIC,
  semester TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  assessment TEXT,
  learning_outcomes TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  workload JSONB,
  raw_text TEXT,
  source_filename TEXT,
  kind TEXT DEFAULT 'course',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_courses_own_all" ON public.user_courses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_courses_set_updated_at
  BEFORE UPDATE ON public.user_courses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_user_courses_user_status ON public.user_courses(user_id, status);

-- profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS programme_code TEXT,
  ADD COLUMN IF NOT EXISTS programme_name TEXT,
  ADD COLUMN IF NOT EXISTS target_ects INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS target_graduation DATE;