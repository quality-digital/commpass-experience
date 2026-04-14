
CREATE OR REPLACE FUNCTION public.complete_quiz_mission(p_mission_id uuid, p_score integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid;
  v_mission public.missions%ROWTYPE;
  v_existing_id uuid;
  v_prev_points integer;
  v_actual_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Get mission and validate it's a quiz type
  SELECT m.* INTO v_mission FROM public.missions AS m WHERE m.id = p_mission_id AND m.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mission not found'; END IF;
  IF v_mission.type != 'quiz' THEN RAISE EXCEPTION 'Mission is not a quiz'; END IF;

  -- Prevent duplicate completion
  SELECT um.id INTO v_existing_id FROM public.user_missions AS um WHERE um.user_id = v_user_id AND um.mission_id = p_mission_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('completed', false, 'already_completed', true, 'mission_id', p_mission_id, 'points_awarded', 0);
  END IF;

  -- Cap score: min 0, max mission.points
  v_actual_points := GREATEST(0, LEAST(p_score, v_mission.points));

  SELECT p.points INTO v_prev_points FROM public.profiles AS p WHERE p.user_id = v_user_id;

  -- Record mission completion
  INSERT INTO public.user_missions (user_id, mission_id, status) VALUES (v_user_id, p_mission_id, 'completed');

  -- Add actual quiz score to profile
  UPDATE public.profiles AS p SET points = p.points + v_actual_points, last_points_at = CASE WHEN v_actual_points > 0 THEN now() ELSE p.last_points_at END, updated_at = now() WHERE p.user_id = v_user_id;

  -- Audit log with real score
  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id, notes)
  VALUES (v_user_id, 'quiz', v_prev_points, v_actual_points, v_prev_points + v_actual_points, p_mission_id,
          'Quiz score: ' || v_actual_points || '/' || v_mission.points);

  RETURN jsonb_build_object('completed', true, 'already_completed', false, 'mission_id', p_mission_id, 'points_awarded', v_actual_points);
END;
$$;
