
CREATE TABLE public.golden_pass_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  prize text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.golden_pass_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own redemptions"
ON public.golden_pass_redemptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own redemptions"
ON public.golden_pass_redemptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all redemptions"
ON public.golden_pass_redemptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
