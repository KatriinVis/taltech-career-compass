ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS language text[],
  ADD COLUMN IF NOT EXISTS faculty text,
  ADD COLUMN IF NOT EXISTS assessment text,
  ADD COLUMN IF NOT EXISTS learning_outcomes text[],
  ADD COLUMN IF NOT EXISTS instructor text;

ALTER TABLE public.sync_runs
  ADD COLUMN IF NOT EXISTS prefix text;

CREATE INDEX IF NOT EXISTS idx_courses_faculty ON public.courses(faculty);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_source ON public.courses(source);