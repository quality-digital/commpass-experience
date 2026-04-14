
-- Add last_points_at column to profiles
ALTER TABLE public.profiles ADD COLUMN last_points_at timestamp with time zone DEFAULT NULL;

-- Initialize last_points_at for users who already have points
UPDATE public.profiles SET last_points_at = updated_at WHERE points > 0 AND last_points_at IS NULL;

-- Update RLS policy to block client from editing last_points_at
DROP POLICY IF EXISTS "Users can update own profile (no points)" ON public.profiles;
CREATE POLICY "Users can update own profile (no points)" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (points IS DISTINCT FROM (SELECT p.points FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (last_points_at IS DISTINCT FROM (SELECT p.last_points_at FROM public.profiles p WHERE p.user_id = auth.uid()))
);

-- Update secure_add_points to set last_points_at
CREATE OR REPLACE FUNCTION public.secure_add_points(p_points integer, p_origin text, p_mission_id uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_user_id uuid;
  v_prev_points integer;
  v_max_mission_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_points <= 0 OR p_points > 10000 THEN RAISE EXCEPTION 'Invalid points value'; END IF;

  IF p_mission_id IS NOT NULL THEN
    SELECT m.points INTO v_max_mission_points FROM public.missions AS m WHERE m.id = p_mission_id AND m.is_active = true;
    IF FOUND AND p_points > v_max_mission_points THEN p_points := v_max_mission_points; END IF;
  END IF;

  SELECT p.points INTO v_prev_points FROM public.profiles AS p WHERE p.user_id = v_user_id;

  UPDATE public.profiles AS p SET points = p.points + p_points, last_points_at = now(), updated_at = now() WHERE p.user_id = v_user_id;

  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id, notes)
  VALUES (v_user_id, p_origin, v_prev_points, p_points, v_prev_points + p_points, p_mission_id, p_notes);

  RETURN jsonb_build_object('success', true, 'points_added', p_points, 'new_total', v_prev_points + p_points);
END;
$$;

-- Update complete_mission_with_points to set last_points_at
CREATE OR REPLACE FUNCTION public.complete_mission_with_points(p_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_user_id uuid;
  v_mission public.missions%ROWTYPE;
  v_existing_id uuid;
  v_prev_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT m.* INTO v_mission FROM public.missions AS m WHERE m.id = p_mission_id AND m.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mission not found'; END IF;

  SELECT um.id INTO v_existing_id FROM public.user_missions AS um WHERE um.user_id = v_user_id AND um.mission_id = p_mission_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('completed', false, 'already_completed', true, 'mission_id', p_mission_id, 'points_awarded', 0, 'status', 'already_completed');
  END IF;

  SELECT p.points INTO v_prev_points FROM public.profiles AS p WHERE p.user_id = v_user_id;

  INSERT INTO public.user_missions (user_id, mission_id, status) VALUES (v_user_id, p_mission_id, 'completed');

  UPDATE public.profiles AS p SET points = p.points + COALESCE(v_mission.points, 0), last_points_at = now(), updated_at = now() WHERE p.user_id = v_user_id;

  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id)
  VALUES (v_user_id, 'mission', v_prev_points, COALESCE(v_mission.points, 0), v_prev_points + COALESCE(v_mission.points, 0), p_mission_id);

  RETURN jsonb_build_object('completed', true, 'already_completed', false, 'mission_id', p_mission_id, 'points_awarded', COALESCE(v_mission.points, 0), 'status', 'completed');
END;
$$;

-- Update change_mission_approval_status to set last_points_at
CREATE OR REPLACE FUNCTION public.change_mission_approval_status(p_user_mission_id uuid, p_new_status text, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_mission_points INTEGER;
  v_admin_id UUID;
  v_admin_name TEXT;
  v_admin_email TEXT;
  v_point_delta INTEGER := 0;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.has_role(v_admin_id, 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT name, email INTO v_admin_name, v_admin_email FROM public.profiles WHERE user_id = v_admin_id;

  SELECT um.status, um.user_id, m.points INTO v_current_status, v_user_id, v_mission_points
  FROM public.user_missions um JOIN public.missions m ON m.id = um.mission_id WHERE um.id = p_user_mission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF v_current_status = p_new_status THEN RAISE EXCEPTION 'Status is already %', p_new_status; END IF;

  IF p_new_status = 'approved' AND v_current_status != 'approved' THEN v_point_delta := v_mission_points;
  ELSIF v_current_status = 'approved' AND p_new_status != 'approved' THEN v_point_delta := -v_mission_points;
  END IF;

  UPDATE public.user_missions SET status = p_new_status WHERE id = p_user_mission_id;

  IF v_point_delta != 0 THEN
    UPDATE public.profiles SET points = GREATEST(points + v_point_delta, 0), last_points_at = now(), updated_at = now() WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.approval_audit_log (user_mission_id, previous_status, new_status, admin_id, admin_name, admin_email, notes)
  VALUES (p_user_mission_id, v_current_status, p_new_status, v_admin_id, v_admin_name, v_admin_email, p_notes);
END;
$$;

-- Update complete_registration to set last_points_at
CREATE OR REPLACE FUNCTION public.complete_registration(p_user_id uuid, p_name text, p_phone text DEFAULT NULL, p_company text DEFAULT NULL, p_role text DEFAULT NULL, p_city text DEFAULT NULL, p_avatar_id text DEFAULT NULL, p_avatar_emoji text DEFAULT NULL, p_points integer DEFAULT 0, p_registration_type text DEFAULT 'quick', p_accepted_terms boolean DEFAULT false, p_accepted_marketing boolean DEFAULT false, p_mission_slugs text[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  m RECORD;
  v_mission_slugs text[];
  v_total_points integer := 0;
  v_is_easter_egg boolean := false;
  v_text_pattern text := '^[a-zA-ZÀ-ÿ\s]+$';
  v_city_pattern text := '^[a-zA-ZÀ-ÿ\s/]+$';
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
  IF p_name !~ v_text_pattern THEN RAISE EXCEPTION 'Nome contém caracteres não permitidos'; END IF;
  IF p_company IS NOT NULL AND trim(p_company) != '' AND p_company !~ v_text_pattern THEN RAISE EXCEPTION 'Empresa contém caracteres não permitidos'; END IF;
  IF p_role IS NOT NULL AND trim(p_role) != '' AND p_role !~ v_text_pattern THEN RAISE EXCEPTION 'Cargo contém caracteres não permitidos'; END IF;
  IF p_city IS NOT NULL AND trim(p_city) != '' AND p_city !~ v_city_pattern THEN RAISE EXCEPTION 'Cidade contém caracteres não permitidos'; END IF;

  IF p_registration_type = 'complete' THEN v_mission_slugs := ARRAY['cadastro-simples', 'cadastro-completo'];
  ELSE v_mission_slugs := ARRAY['cadastro-simples']; END IF;

  IF p_avatar_id IS NOT NULL THEN
    SELECT is_easter_egg INTO v_is_easter_egg FROM public.avatars WHERE slug = p_avatar_id AND is_active = true;
    IF v_is_easter_egg = true THEN v_mission_slugs := array_append(v_mission_slugs, 'easter-egg-avatar'); END IF;
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_total_points FROM public.missions WHERE slug = ANY(v_mission_slugs) AND is_active = true;

  UPDATE public.profiles SET
    name = p_name, phone = p_phone, company = p_company, role = p_role, city = p_city,
    avatar_id = p_avatar_id, avatar_emoji = p_avatar_emoji, points = v_total_points,
    registration_type = p_registration_type, accepted_terms = p_accepted_terms,
    accepted_marketing = p_accepted_marketing, last_points_at = CASE WHEN v_total_points > 0 THEN now() ELSE NULL END,
    updated_at = now()
  WHERE user_id = p_user_id;

  FOR m IN SELECT id FROM public.missions WHERE slug = ANY(v_mission_slugs) AND is_active = true LOOP
    INSERT INTO public.user_missions (user_id, mission_id) VALUES (p_user_id, m.id) ON CONFLICT DO NOTHING;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'complete_registration error for user %: % %', p_user_id, SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Não foi possível processar a solicitação';
END;
$$;

-- Update admin_reset_user to clear last_points_at appropriately
CREATE OR REPLACE FUNCTION public.admin_reset_user(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  preserved_points integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COALESCE(SUM(m.points), 0) INTO preserved_points
  FROM public.user_missions um JOIN public.missions m ON m.id = um.mission_id
  WHERE um.user_id = target_user_id AND m.slug IN ('cadastro-simples', 'cadastro-completo') AND um.status = 'completed';

  DELETE FROM public.user_missions WHERE user_id = target_user_id AND mission_id NOT IN (SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo'));
  DELETE FROM public.user_quizzes WHERE user_id = target_user_id;
  DELETE FROM public.golden_pass_redemptions WHERE user_id = target_user_id;

  UPDATE public.profiles SET points = preserved_points, last_points_at = CASE WHEN preserved_points > 0 THEN now() ELSE NULL END, updated_at = now() WHERE user_id = target_user_id;
END;
$$;

-- Update admin_reset_all_users
CREATE OR REPLACE FUNCTION public.admin_reset_all_users()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  DELETE FROM public.user_missions WHERE mission_id NOT IN (SELECT id FROM public.missions WHERE slug IN ('cadastro-simples', 'cadastro-completo'));
  DELETE FROM public.user_quizzes;
  DELETE FROM public.golden_pass_redemptions;

  UPDATE public.profiles p SET points = COALESCE(sub.total, 0), last_points_at = CASE WHEN COALESCE(sub.total, 0) > 0 THEN now() ELSE NULL END, updated_at = now()
  FROM (SELECT um.user_id, SUM(m.points) AS total FROM public.user_missions um JOIN public.missions m ON m.id = um.mission_id WHERE m.slug IN ('cadastro-simples', 'cadastro-completo') AND um.status = 'completed' GROUP BY um.user_id) sub
  WHERE p.user_id = sub.user_id;

  UPDATE public.profiles SET points = 0, last_points_at = NULL, updated_at = now()
  WHERE user_id NOT IN (SELECT um.user_id FROM public.user_missions um JOIN public.missions m ON m.id = um.mission_id WHERE m.slug IN ('cadastro-simples', 'cadastro-completo'));
END;
$$;

-- Recreate ranking_public view with last_points_at
DROP VIEW IF EXISTS public.ranking_public;
CREATE VIEW public.ranking_public WITH (security_invoker = off) AS
SELECT user_id, name, points, avatar_emoji, avatar_id, registration_type, max_points_reached_at, last_points_at
FROM public.profiles
WHERE points > 0
ORDER BY points DESC, last_points_at ASC NULLS LAST;
