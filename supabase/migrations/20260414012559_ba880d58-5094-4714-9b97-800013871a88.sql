CREATE OR REPLACE FUNCTION public.admin_reset_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  preserved_points integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(SUM(m.points), 0) INTO preserved_points
  FROM public.user_missions um
  JOIN public.missions m ON m.id = um.mission_id
  WHERE um.user_id = target_user_id
    AND m.slug IN ('cadastro-simples', 'cadastro-completo')
    AND um.status = 'completed';

  DELETE FROM public.user_missions
  WHERE user_id = target_user_id
    AND mission_id NOT IN (
      SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo')
    );

  DELETE FROM public.user_quizzes WHERE user_id = target_user_id;
  DELETE FROM public.golden_pass_redemptions WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET points = preserved_points, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_all_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.user_missions
  WHERE mission_id NOT IN (
    SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo')
  );

  DELETE FROM public.user_quizzes;
  DELETE FROM public.golden_pass_redemptions;

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

  UPDATE public.profiles
  SET points = 0, updated_at = now()
  WHERE user_id NOT IN (
    SELECT um.user_id FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id
    WHERE m.slug IN ('cadastro-simples', 'cadastro-completo')
  );
END;
$$;