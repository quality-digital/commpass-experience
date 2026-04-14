
DROP POLICY IF EXISTS "Users can upload own mission photos" ON storage.objects;

CREATE POLICY "Users can upload own mission photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
