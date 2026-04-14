
-- Recreate ranking_public view without user_id exposure
DROP VIEW IF EXISTS public.ranking_public;

CREATE VIEW public.ranking_public
WITH (security_invoker = off)
AS
SELECT
  encode(sha256(p.user_id::text::bytea), 'hex') AS anon_id,
  split_part(p.name, ' ', 1) AS name,
  p.points,
  p.avatar_emoji,
  p.avatar_id,
  p.last_points_at,
  p.max_points_reached_at
FROM public.profiles p
WHERE p.points > 0
ORDER BY p.points DESC, p.last_points_at ASC NULLS LAST
LIMIT 50;
