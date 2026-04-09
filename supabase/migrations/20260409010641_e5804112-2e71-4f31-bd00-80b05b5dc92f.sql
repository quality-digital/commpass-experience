
CREATE OR REPLACE FUNCTION public.admin_reset_user(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  preserved_points integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate points from preserved registration missions
  SELECT COALESCE(SUM(m.points), 0) INTO preserved_points
  FROM public.user_missions um
  JOIN public.missions m ON m.id = um.mission_id
  WHERE um.user_id = target_user_id
    AND m.slug IN ('cadastro-simples', 'cadastro-completo')
    AND um.status = 'completed';

  -- Delete non-registration missions
  DELETE FROM public.user_missions
  WHERE user_id = target_user_id
    AND mission_id NOT IN (
      SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo')
    );

  -- Delete all quizzes
  DELETE FROM public.user_quizzes WHERE user_id = target_user_id;

  -- Delete golden pass redemptions
  DELETE FROM public.golden_pass_redemptions WHERE user_id = target_user_id;

  -- Set points to only the preserved registration mission points
  UPDATE public.profiles
  SET points = preserved_points, updated_at = now()
  WHERE user_id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_all_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete non-registration missions for all users
  DELETE FROM public.user_missions
  WHERE mission_id NOT IN (
    SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo')
  );

  -- Delete all quizzes
  DELETE FROM public.user_quizzes;

  -- Delete all golden pass redemptions
  DELETE FROM public.golden_pass_redemptions;

  -- Recalculate points for each user based only on preserved registration missions
  UPDATE public.profiles p
  SET points = COALESCE(sub.total, 0), updated_at = now()
  FROM (
    SELECT um.user_id, SUM(m.points) AS total
    FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id
    WHERE m.slug IN ('cadastro-simples', 'cadastro-completo')
      AND um.status = 'completed'
    GROUP BY um.user_id
  ) sub
  WHERE p.user_id = sub.user_id;

  -- Users with no preserved missions get 0 points
  UPDATE public.profiles
  SET points = 0, updated_at = now()
  WHERE user_id NOT IN (
    SELECT um.user_id FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id
    WHERE m.slug IN ('cadastro-simples', 'cadastro-completo')
  );
END;
$function$;
