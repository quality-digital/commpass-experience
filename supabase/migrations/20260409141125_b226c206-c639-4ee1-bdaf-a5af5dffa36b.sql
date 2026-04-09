
-- Create prizes table
CREATE TABLE public.prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_position UNIQUE (position)
);

-- Enable RLS
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage prizes"
ON public.prizes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read
CREATE POLICY "Authenticated users can read prizes"
ON public.prizes
FOR SELECT
TO authenticated
USING (true);

-- Public can read prizes (for ranking page)
CREATE POLICY "Anyone can read prizes"
ON public.prizes
FOR SELECT
TO anon
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_prizes_updated_at
BEFORE UPDATE ON public.prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for prize images
INSERT INTO storage.buckets (id, name, public) VALUES ('prize-images', 'prize-images', true);

-- Storage policies
CREATE POLICY "Prize images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'prize-images');

CREATE POLICY "Admins can upload prize images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prize images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prize images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));
