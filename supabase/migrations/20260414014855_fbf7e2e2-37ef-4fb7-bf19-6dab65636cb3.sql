-- 1. Create points audit log table
CREATE TABLE public.points_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  origin text NOT NULL, -- 'mission', 'quiz', 'admin', 'golden_pass', 'registration', 'reset'
  previous_points integer NOT NULL,
  points_added integer NOT NULL,
  new_points integer NOT NULL,
  mission_id uuid NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.points_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit logs"
ON public.points_audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own audit logs"
ON public.points_audit_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct insert/update/delete for regular users — only backend functions
CREATE POLICY "Only backend functions can insert"
ON public.points_audit_log FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE INDEX idx_points_audit_user ON public.points_audit_log (user_id, created_at DESC);

-- 2. Block direct points updates via RLS
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (no points)"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND points IS NOT DISTINCT FROM (SELECT p.points FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 3. Update complete_mission_with_points to log audit
CREATE OR REPLACE FUNCTION public.complete_mission_with_points(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_mission public.missions%ROWTYPE;
  v_existing_id uuid;
  v_prev_points integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT m.* INTO v_mission
  FROM public.missions AS m
  WHERE m.id = p_mission_id
    AND m.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  SELECT um.id INTO v_existing_id
  FROM public.user_missions AS um
  WHERE um.user_id = v_user_id
    AND um.mission_id = p_mission_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('completed', false, 'already_completed', true, 'mission_id', p_mission_id, 'points_awarded', 0, 'status', 'already_completed');
  END IF;

  -- Get current points
  SELECT p.points INTO v_prev_points
  FROM public.profiles AS p
  WHERE p.user_id = v_user_id;

  -- Insert mission completion
  INSERT INTO public.user_missions (user_id, mission_id, status)
  VALUES (v_user_id, p_mission_id, 'completed');

  -- Update points
  UPDATE public.profiles AS p
  SET points = p.points + COALESCE(v_mission.points, 0), updated_at = now()
  WHERE p.user_id = v_user_id;

  -- Audit log
  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id)
  VALUES (v_user_id, 'mission', v_prev_points, COALESCE(v_mission.points, 0), v_prev_points + COALESCE(v_mission.points, 0), p_mission_id);

  RETURN jsonb_build_object('completed', true, 'already_completed', false, 'mission_id', p_mission_id, 'points_awarded', COALESCE(v_mission.points, 0), 'status', 'completed');
END;
$$;

-- 4. Create a generic secure add_points RPC for cases like quiz, golden pass
CREATE OR REPLACE FUNCTION public.secure_add_points(p_points integer, p_origin text, p_mission_id uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_prev_points integer;
  v_max_mission_points integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_points <= 0 OR p_points > 10000 THEN
    RAISE EXCEPTION 'Invalid points value';
  END IF;

  -- If mission_id provided, validate points match mission definition
  IF p_mission_id IS NOT NULL THEN
    SELECT m.points INTO v_max_mission_points
    FROM public.missions AS m
    WHERE m.id = p_mission_id AND m.is_active = true;

    IF FOUND AND p_points > v_max_mission_points THEN
      p_points := v_max_mission_points; -- Cap to mission max
    END IF;
  END IF;

  SELECT p.points INTO v_prev_points
  FROM public.profiles AS p
  WHERE p.user_id = v_user_id;

  UPDATE public.profiles AS p
  SET points = p.points + p_points, updated_at = now()
  WHERE p.user_id = v_user_id;

  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id, notes)
  VALUES (v_user_id, p_origin, v_prev_points, p_points, v_prev_points + p_points, p_mission_id, p_notes);

  RETURN jsonb_build_object('success', true, 'points_added', p_points, 'new_total', v_prev_points + p_points);
END;
$$;