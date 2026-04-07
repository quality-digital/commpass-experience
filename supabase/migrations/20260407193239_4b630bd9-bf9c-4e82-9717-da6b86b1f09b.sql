
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
SET search_path = public
AS $$
DECLARE
  m RECORD;
BEGIN
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
    points = p_points,
    registration_type = p_registration_type,
    accepted_terms = p_accepted_terms,
    accepted_marketing = p_accepted_marketing,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert completed missions
  FOR m IN SELECT id FROM public.missions WHERE slug = ANY(p_mission_slugs)
  LOOP
    INSERT INTO public.user_missions (user_id, mission_id)
    VALUES (p_user_id, m.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
