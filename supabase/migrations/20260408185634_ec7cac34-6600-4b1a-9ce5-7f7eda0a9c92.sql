
-- 1. Fix quiz_questions: replace open policy with authenticated-only (still needed for quiz flow)
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON public.quiz_questions;

CREATE POLICY "Authenticated users can read quiz questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix mission-photos storage: scope uploads to user folder
DROP POLICY IF EXISTS "Users can upload mission photos" ON storage.objects;

CREATE POLICY "Users can upload own mission photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Add UPDATE policy scoped to owner
CREATE POLICY "Users can update own mission photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mission-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Add DELETE policy for owner and admins
CREATE POLICY "Users can delete own mission photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mission-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
