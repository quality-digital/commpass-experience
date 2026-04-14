
CREATE OR REPLACE FUNCTION public.secure_add_points(p_points integer, p_origin text, p_mission_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_prev_points integer;
  v_mission_points integer;
  v_actual_points integer;
  v_valid_origins text[] := ARRAY['mission', 'qr_code', 'quiz', 'admin', 'roulette', 'registration'];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Validate origin
  IF p_origin IS NULL OR NOT (p_origin = ANY(v_valid_origins)) THEN
    RAISE EXCEPTION 'Invalid origin';
  END IF;

  -- For mission-based origins, mission_id is required
  IF p_mission_id IS NULL THEN
    RAISE EXCEPTION 'Mission ID is required';
  END IF;

  -- Get mission points from database (single source of truth)
  SELECT m.points INTO v_mission_points
  FROM public.missions AS m
  WHERE m.id = p_mission_id AND m.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found or inactive';
  END IF;

  -- Prevent duplicate completion
  IF EXISTS (
    SELECT 1 FROM public.user_missions AS um
    WHERE um.user_id = v_user_id AND um.mission_id = p_mission_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_completed', 'points_added', 0);
  END IF;

  -- Use mission points from database, NEVER from client
  v_actual_points := v_mission_points;

  IF v_actual_points <= 0 OR v_actual_points > 10000 THEN
    RAISE EXCEPTION 'Invalid points value';
  END IF;

  SELECT p.points INTO v_prev_points FROM public.profiles AS p WHERE p.user_id = v_user_id;

  UPDATE public.profiles AS p SET points = p.points + v_actual_points, last_points_at = now(), updated_at = now() WHERE p.user_id = v_user_id;

  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id, notes)
  VALUES (v_user_id, p_origin, v_prev_points, v_actual_points, v_prev_points + v_actual_points, p_mission_id, p_notes);

  RETURN jsonb_build_object('success', true, 'points_added', v_actual_points, 'new_total', v_prev_points + v_actual_points);
END;
$function$;
