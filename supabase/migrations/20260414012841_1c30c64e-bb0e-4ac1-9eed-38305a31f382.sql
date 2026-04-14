CREATE OR REPLACE FUNCTION public.check_max_points_reached()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_max_points integer;
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    IF NEW.max_points_reached_at IS NULL THEN
      SELECT value::integer INTO v_max_points FROM public.app_settings WHERE key = 'max_app_points';
      IF v_max_points IS NOT NULL AND NEW.points >= v_max_points THEN
        NEW.max_points_reached_at := now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;