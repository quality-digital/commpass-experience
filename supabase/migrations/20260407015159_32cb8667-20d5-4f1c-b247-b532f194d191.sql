
-- Add new columns to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to brand logos
CREATE POLICY "Brand logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow admins to manage brand logos
CREATE POLICY "Admins can manage brand logos"
ON storage.objects FOR ALL
USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
