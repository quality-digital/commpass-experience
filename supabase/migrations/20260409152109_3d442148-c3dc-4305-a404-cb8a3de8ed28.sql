
-- Create approval audit log table
CREATE TABLE public.approval_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_mission_id UUID NOT NULL REFERENCES public.user_missions(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  admin_id UUID NOT NULL,
  admin_name TEXT,
  admin_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit logs"
  ON public.approval_audit_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_log_user_mission ON public.approval_audit_log(user_mission_id);

-- Transactional function: change status + adjust points + log audit
CREATE OR REPLACE FUNCTION public.change_mission_approval_status(
  p_user_mission_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Only admins
  v_admin_id := auth.uid();
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get admin info
  SELECT name, email INTO v_admin_name, v_admin_email
  FROM public.profiles WHERE user_id = v_admin_id;

  -- Get current submission info
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

  -- Calculate point delta
  -- If moving TO approved: add points
  -- If moving FROM approved: remove points
  IF p_new_status = 'approved' AND v_current_status != 'approved' THEN
    v_point_delta := v_mission_points;
  ELSIF v_current_status = 'approved' AND p_new_status != 'approved' THEN
    v_point_delta := -v_mission_points;
  END IF;

  -- Update status
  UPDATE public.user_missions
  SET status = p_new_status
  WHERE id = p_user_mission_id;

  -- Adjust points
  IF v_point_delta != 0 THEN
    UPDATE public.profiles
    SET points = GREATEST(points + v_point_delta, 0), updated_at = now()
    WHERE user_id = v_user_id;
  END IF;

  -- Log audit entry
  INSERT INTO public.approval_audit_log (user_mission_id, previous_status, new_status, admin_id, admin_name, admin_email, notes)
  VALUES (p_user_mission_id, v_current_status, p_new_status, v_admin_id, v_admin_name, v_admin_email, p_notes);
END;
$$;
