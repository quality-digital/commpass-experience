
ALTER TABLE public.brands DROP COLUMN IF EXISTS emoji;
ALTER TABLE public.brands DROP COLUMN IF EXISTS cases;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS icon_url text;
