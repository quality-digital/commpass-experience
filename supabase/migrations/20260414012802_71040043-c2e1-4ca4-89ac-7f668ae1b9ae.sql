DROP VIEW IF EXISTS public.ranking_public;

CREATE VIEW public.ranking_public
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.name,
  p.avatar_id,
  p.avatar_emoji,
  p.points,
  p.registration_type,
  p.max_points_reached_at
FROM public.profiles AS p;