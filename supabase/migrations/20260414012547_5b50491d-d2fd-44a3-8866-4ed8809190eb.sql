CREATE OR REPLACE FUNCTION public.complete_registration(p_user_id uuid, p_name text, p_phone text DEFAULT NULL::text, p_company text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_avatar_id text DEFAULT NULL::text, p_avatar_emoji text DEFAULT NULL::text, p_points integer DEFAULT 0, p_registration_type text DEFAULT 'quick'::text, p_accepted_terms boolean DEFAULT false, p_accepted_marketing boolean DEFAULT false, p_mission_slugs text[] DEFAULT '{}'::text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m RECORD;
  v_mission_slugs text[];
  v_total_points integer := 0;
  v_is_easter_egg boolean := false;
  v_text_pattern text := '^[a-zA-ZÀ-ÿ\s]+$';
  v_city_pattern text := '^[a-zA-ZÀ-ÿ\s/]+$';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Dados inválidos';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Dados inválidos';
  END IF;

  IF p_name !~ v_text_pattern THEN
    RAISE EXCEPTION 'Nome contém caracteres não permitidos';
  END IF;

  IF p_company IS NOT NULL AND trim(p_company) != '' AND p_company !~ v_text_pattern THEN
    RAISE EXCEPTION 'Empresa contém caracteres não permitidos';
  END IF;

  IF p_role IS NOT NULL AND trim(p_role) != '' AND p_role !~ v_text_pattern THEN
    RAISE EXCEPTION 'Cargo contém caracteres não permitidos';
  END IF;

  IF p_city IS NOT NULL AND trim(p_city) != '' AND p_city !~ v_city_pattern THEN
    RAISE EXCEPTION 'Cidade contém caracteres não permitidos';
  END IF;

  IF p_registration_type = 'complete' THEN
    v_mission_slugs := ARRAY['cadastro-simples', 'cadastro-completo'];
  ELSE
    v_mission_slugs := ARRAY['cadastro-simples'];
  END IF;

  IF p_avatar_id IS NOT NULL THEN
    SELECT is_easter_egg INTO v_is_easter_egg
    FROM public.avatars
    WHERE slug = p_avatar_id AND is_active = true;

    IF v_is_easter_egg = true THEN
      v_mission_slugs := array_append(v_mission_slugs, 'easter-egg-avatar');
    END IF;
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.missions
  WHERE slug = ANY(v_mission_slugs) AND is_active = true;

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

  FOR m IN SELECT id FROM public.missions WHERE slug = ANY(v_mission_slugs) AND is_active = true
  LOOP
    INSERT INTO public.user_missions (user_id, mission_id)
    VALUES (p_user_id, m.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'complete_registration error for user %: % %', p_user_id, SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Não foi possível processar a solicitação';
END;
$$;