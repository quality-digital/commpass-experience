
-- 1. Allow all authenticated users to read profiles (needed for ranking)
CREATE POLICY "Authenticated users can read all profiles for ranking"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow users to read audit log entries for their own missions (rejection notes)
CREATE POLICY "Users can read own mission audit logs"
ON public.approval_audit_log
FOR SELECT
TO authenticated
USING (
  user_mission_id IN (
    SELECT id FROM public.user_missions WHERE user_id = auth.uid()
  )
);
