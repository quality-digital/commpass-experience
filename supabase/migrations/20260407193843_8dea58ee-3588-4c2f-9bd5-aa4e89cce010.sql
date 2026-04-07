
-- Add columns to user_missions
ALTER TABLE public.user_missions
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_email text;

-- Add columns to user_quizzes
ALTER TABLE public.user_quizzes
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_email text;

-- Add columns to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_email text;

-- Backfill existing data from profiles
UPDATE public.user_missions um
SET user_name = p.name, user_email = p.email
FROM public.profiles p
WHERE p.user_id = um.user_id;

UPDATE public.user_quizzes uq
SET user_name = p.name, user_email = p.email
FROM public.profiles p
WHERE p.user_id = uq.user_id;

UPDATE public.user_roles ur
SET user_name = p.name, user_email = p.email
FROM public.profiles p
WHERE p.user_id = ur.user_id;

-- Create function to auto-fill user_name and user_email on insert
CREATE OR REPLACE FUNCTION public.fill_user_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_name IS NULL OR NEW.user_email IS NULL THEN
    SELECT name, email INTO NEW.user_name, NEW.user_email
    FROM public.profiles
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers
CREATE TRIGGER fill_user_info_user_missions
  BEFORE INSERT ON public.user_missions
  FOR EACH ROW EXECUTE FUNCTION public.fill_user_info();

CREATE TRIGGER fill_user_info_user_quizzes
  BEFORE INSERT ON public.user_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.fill_user_info();

CREATE TRIGGER fill_user_info_user_roles
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fill_user_info();
