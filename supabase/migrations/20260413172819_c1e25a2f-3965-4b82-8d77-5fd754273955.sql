
CREATE OR REPLACE FUNCTION public.complete_registration(
  p_user_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_avatar_id text DEFAULT NULL,
  p_avatar_emoji text DEFAULT NULL,
  p_points integer DEFAULT 0,
  p_registration_type text DEFAULT 'quick',
  p_accepted_terms boolean DEFAULT false,
  p_accepted_marketing boolean DEFAULT false,
  p_mission_slugs text[] DEFAULT '{}'
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m RECORD;
  v_mission_slugs text[];
  v_total_points integer := 0;
  v_is_easter_egg boolean := false;
BEGIN
  -- SECURITY: p_points and p_mission_slugs from the client are COMPLETELY IGNORED.

  -- Validate required input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Dados inválidos';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Dados inválidos';
  END IF;

  -- Determine missions based on registration type
  IF p_registration_type = 'complete' THEN
    v_mission_slugs := ARRAY['cadastro-simples', 'cadastro-completo'];
  ELSE
    v_mission_slugs := ARRAY['cadastro-simples'];
  END IF;

  -- Check if selected avatar is an easter egg
  IF p_avatar_id IS NOT NULL THEN
    SELECT is_easter_egg INTO v_is_easter_egg
    FROM public.avatars
    WHERE slug = p_avatar_id AND is_active = true;

    IF v_is_easter_egg = true THEN
      v_mission_slugs := array_append(v_mission_slugs, 'easter-egg-avatar');
    END IF;
  END IF;

  -- Calculate points from missions (server-side only)
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.missions
  WHERE slug = ANY(v_mission_slugs) AND is_active = true;

  -- Update the profile created by the trigger
  UPDATE public.profiles
  SET
    name = p_name,
    phone = p_phone,
    company = p_company,
    role = p_role,
    city = p_city,
    avatar_id = p_avatar_id,
    avatar_emoji = p_avatar_emoji,
    points = v_total_points,
    registration_type = p_registration_type,
    accepted_terms = p_accepted_terms,
    accepted_marketing = p_accepted_marketing,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert completed missions
  FOR m IN SELECT id FROM public.missions WHERE slug = ANY(v_mission_slugs) AND is_active = true
  LOOP
    INSERT INTO public.user_missions (user_id, mission_id)
    VALUES (p_user_id, m.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    -- Log internally but return generic message
    RAISE LOG 'complete_registration error for user %: % %', p_user_id, SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Não foi possível processar a solicitação';
END;
$function$;
