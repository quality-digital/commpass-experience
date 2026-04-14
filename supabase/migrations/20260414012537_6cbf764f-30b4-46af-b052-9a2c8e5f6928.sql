CREATE OR REPLACE FUNCTION public.sync_quiz_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.missions (slug, name, description, points, type, difficulty, action, action_label, is_active, sort_order)
    VALUES (
      NEW.slug,
      NEW.title,
      NEW.description,
      NEW.max_points,
      'quiz',
      'médio',
      'quiz',
      'Iniciar Quiz',
      NEW.is_active,
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.missions)
    )
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.missions
    SET name = NEW.title,
        description = NEW.description,
        points = NEW.max_points,
        is_active = NEW.is_active,
        slug = NEW.slug,
        updated_at = now()
    WHERE slug = OLD.slug AND type = 'quiz';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.missions WHERE slug = OLD.slug AND type = 'quiz';
    RETURN OLD;
  END IF;
END;
$$;