
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read all profiles for ranking" ON public.profiles;

-- Create a secure public ranking view with ONLY non-sensitive fields
CREATE OR REPLACE VIEW public.ranking_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  name,
  avatar_emoji,
  avatar_id,
  points,
  registration_type
FROM public.profiles
ORDER BY points DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.ranking_public TO authenticated;
