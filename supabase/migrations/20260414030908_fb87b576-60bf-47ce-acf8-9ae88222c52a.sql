INSERT INTO storage.buckets (id, name, public)
VALUES ('project-exports', 'project-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read project exports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert project exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-exports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project exports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-exports' AND public.has_role(auth.uid(), 'admin'));