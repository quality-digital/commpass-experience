
-- Function to reset a single user's points and missions (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.profiles SET points = 0, updated_at = now() WHERE user_id = target_user_id;
  DELETE FROM public.user_missions WHERE user_id = target_user_id;
  DELETE FROM public.user_quizzes WHERE user_id = target_user_id;
END;
$$;

-- Function to reset ALL users' points and missions (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_all_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.profiles SET points = 0, updated_at = now();
  DELETE FROM public.user_missions;
  DELETE FROM public.user_quizzes;
END;
$$;
