
-- 1. Add max_points_reached_at column to profiles
ALTER TABLE public.profiles
ADD COLUMN max_points_reached_at timestamp with time zone DEFAULT NULL;

-- 2. Insert max_app_points setting (sum of all active missions)
INSERT INTO public.app_settings (key, value, description)
VALUES ('max_app_points', '5650', 'Pontuação máxima possível no app (usada para desempate)')
ON CONFLICT DO NOTHING;

-- 3. Create trigger function to auto-set max_points_reached_at
CREATE OR REPLACE FUNCTION public.check_max_points_reached()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_points integer;
BEGIN
  -- Only act when points changed
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    -- Only set if not already set
    IF NEW.max_points_reached_at IS NULL THEN
      SELECT value::integer INTO v_max_points
      FROM public.app_settings
      WHERE key = 'max_app_points';

      IF v_max_points IS NOT NULL AND NEW.points >= v_max_points THEN
        NEW.max_points_reached_at := now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach trigger
CREATE TRIGGER trg_check_max_points
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_max_points_reached();

-- 5. Recreate ranking_public view with tiebreaker ordering and new column
CREATE OR REPLACE VIEW public.ranking_public AS
SELECT
  user_id,
  name,
  avatar_emoji,
  avatar_id,
  points,
  registration_type,
  max_points_reached_at
FROM public.profiles
ORDER BY points DESC, max_points_reached_at ASC NULLS LAST;
