CREATE OR REPLACE FUNCTION public.fill_user_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_name IS NULL OR NEW.user_email IS NULL THEN
    SELECT name, email INTO NEW.user_name, NEW.user_email
    FROM public.profiles
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;