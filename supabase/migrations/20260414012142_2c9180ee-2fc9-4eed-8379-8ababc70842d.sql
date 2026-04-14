WITH ranked_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, mission_id ORDER BY completed_at ASC, id ASC) AS rn
  FROM public.user_missions
)
DELETE FROM public.user_missions um
USING ranked_duplicates d
WHERE um.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_missions_user_id_mission_id_unique_idx
ON public.user_missions (user_id, mission_id);

CREATE OR REPLACE FUNCTION public.complete_mission_with_points(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_mission public.missions%ROWTYPE;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_mission
  FROM public.missions
  WHERE id = p_mission_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  SELECT id
  INTO v_existing_id
  FROM public.user_missions
  WHERE user_id = v_user_id
    AND mission_id = p_mission_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'completed', false,
      'already_completed', true,
      'mission_id', p_mission_id,
      'points_awarded', 0,
      'status', 'already_completed'
    );
  END IF;

  INSERT INTO public.user_missions (user_id, mission_id, status)
  VALUES (v_user_id, p_mission_id, 'completed');

  UPDATE public.profiles
  SET points = points + COALESCE(v_mission.points, 0),
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'completed', true,
    'already_completed', false,
    'mission_id', p_mission_id,
    'points_awarded', COALESCE(v_mission.points, 0),
    'status', 'completed'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'completed', false,
      'already_completed', true,
      'mission_id', p_mission_id,
      'points_awarded', 0,
      'status', 'already_completed'
    );
END;
$$;