DROP VIEW IF EXISTS public.ranking_public;

CREATE VIEW public.ranking_public
WITH (security_invoker = true)
AS
SELECT
  user_id,
  name,
  avatar_id,
  avatar_emoji,
  points,
  registration_type,
  max_points_reached_at
FROM public.profiles
WHERE auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR true;