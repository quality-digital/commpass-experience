
-- App settings table
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('ranking_min_points', '500', 'Pontuação mínima para desbloquear o ranking'),
  ('golden_pass_min_points', '400', 'Pontuação mínima para desbloquear o Golden Pass');

-- Easter egg mission
INSERT INTO public.missions (slug, name, description, points, type, difficulty, sort_order, action, action_label) VALUES
  ('easter-egg-avatar', 'Easter Egg — Avatar Premiado', 'Missão secreta desbloqueada ao escolher o avatar premiado!', 300, 'digital', 'fácil', 99, NULL, NULL);

-- Golden Pass mission
INSERT INTO public.missions (slug, name, description, points, type, difficulty, sort_order, action, action_label, location) VALUES
  ('golden-pass', 'Golden Pass', 'Apresente seu Golden Pass no estande e escaneie o QR Code da roleta da sorte para ganhar pontos extras!', 200, 'presencial', 'difícil', 100, 'qr-camera', 'Escanear QR', 'Estande Principal');
