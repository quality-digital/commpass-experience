
-- Add status and photo_url columns to user_missions
ALTER TABLE public.user_missions 
  ADD COLUMN status text NOT NULL DEFAULT 'completed',
  ADD COLUMN photo_url text;

-- Allow admins to update any user_mission (for approvals)
CREATE POLICY "Admins can update all user missions"
ON public.user_missions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for mission photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mission-photos', 'mission-photos', true);

CREATE POLICY "Users can upload mission photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mission-photos');

CREATE POLICY "Anyone can view mission photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'mission-photos');
