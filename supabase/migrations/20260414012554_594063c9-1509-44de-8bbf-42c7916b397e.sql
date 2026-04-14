CREATE OR REPLACE FUNCTION public.change_mission_approval_status(p_user_mission_id uuid, p_new_status text, p_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT name, email INTO v_admin_name, v_admin_email
  FROM public.profiles WHERE user_id = v_admin_id;

  SELECT um.status, um.user_id, m.points
  INTO v_current_status, v_user_id, v_mission_points
  FROM public.user_missions um
  JOIN public.missions m ON m.id = um.mission_id
  WHERE um.id = p_user_mission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'Status is already %', p_new_status;
  END IF;

  IF p_new_status = 'approved' AND v_current_status != 'approved' THEN
    v_point_delta := v_mission_points;
  ELSIF v_current_status = 'approved' AND p_new_status != 'approved' THEN
    v_point_delta := -v_mission_points;
  END IF;

  UPDATE public.user_missions
  SET status = p_new_status
  WHERE id = p_user_mission_id;

  IF v_point_delta != 0 THEN
    UPDATE public.profiles
    SET points = GREATEST(points + v_point_delta, 0), updated_at = now()
    WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.approval_audit_log (user_mission_id, previous_status, new_status, admin_id, admin_name, admin_email, notes)
  VALUES (p_user_mission_id, v_current_status, p_new_status, v_admin_id, v_admin_name, v_admin_email, p_notes);
END;
$$;