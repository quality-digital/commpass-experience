CREATE POLICY "Anyone can read policy settings"
ON public.app_settings
FOR SELECT
TO public
USING (key IN ('privacy_policy', 'terms_of_use'));