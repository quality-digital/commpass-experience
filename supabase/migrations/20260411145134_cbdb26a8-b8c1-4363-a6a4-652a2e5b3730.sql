
-- Roulette configuration (key-value for UI elements)
CREATE TABLE public.roulette_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text', -- 'text' or 'image'
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roulette config" ON public.roulette_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage roulette config" ON public.roulette_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_roulette_config_updated_at
  BEFORE UPDATE ON public.roulette_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default config
INSERT INTO public.roulette_config (key, value, type, description) VALUES
  ('title', 'ROLETA DE PRÊMIOS', 'text', 'Título principal'),
  ('subtitle', 'Preencha os dados do participante para liberar o jogo', 'text', 'Subtítulo'),
  ('email_label', 'E-MAIL', 'text', 'Label do campo de email'),
  ('email_placeholder', 'seu@email.com', 'text', 'Placeholder do email'),
  ('button_text', 'ACESSAR ROLETA', 'text', 'Texto do botão principal'),
  ('success_title', 'PARABÉNS!', 'text', 'Título de sucesso'),
  ('success_subtitle', 'VOCÊ GANHOU', 'text', 'Subtítulo de sucesso'),
  ('success_points_label', 'PONTOS', 'text', 'Label de pontos no resultado'),
  ('qr_instruction', 'Leia o QR code na sessão Golden Pass do nosso aplicativo e resgate sua recompensa!', 'text', 'Instrução do QR code'),
  ('new_session_button', 'NOVA SESSÃO', 'text', 'Botão nova sessão'),
  ('close_button', 'FECHAR', 'text', 'Botão fechar'),
  ('already_played_message', 'Você já participou da roleta. Obrigado!', 'text', 'Mensagem de bloqueio'),
  ('logo_primary', '', 'image', 'Logo principal (esquerda)'),
  ('logo_secondary', '', 'image', 'Logo secundário (direita)'),
  ('operator_password', 'admin123', 'text', 'Senha do operador para acessar configurações no totem');

-- Roulette prizes (wheel segments)
CREATE TABLE public.roulette_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  weight integer NOT NULL DEFAULT 1,
  color text NOT NULL DEFAULT '#FF6B35',
  icon_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active roulette prizes" ON public.roulette_prizes
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roulette prizes" ON public.roulette_prizes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_roulette_prizes_updated_at
  BEFORE UPDATE ON public.roulette_prizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default prizes (8 segments)
INSERT INTO public.roulette_prizes (label, value, weight, color, sort_order) VALUES
  ('1.000', 1000, 1, '#1a1a2e', 1),
  ('30', 30, 25, '#16213e', 2),
  ('50', 50, 20, '#0f3460', 3),
  ('500', 500, 3, '#1a1a2e', 4),
  ('30', 30, 25, '#16213e', 5),
  ('50', 50, 20, '#0f3460', 6),
  ('100', 100, 8, '#1a1a2e', 7),
  ('30', 30, 25, '#16213e', 8);

-- Roulette spins (QR codes generated)
CREATE TABLE public.roulette_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  prize_label text NOT NULL,
  prize_value integer NOT NULL DEFAULT 0,
  qr_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz,
  redeemed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a spin (public page)
CREATE POLICY "Anyone can insert roulette spins" ON public.roulette_spins
  FOR INSERT WITH CHECK (true);

-- Anyone can check if email already played (for blocking)
CREATE POLICY "Anyone can read spins by email" ON public.roulette_spins
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage all spins" ON public.roulette_spins
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can update spin status (for redemption)
CREATE POLICY "Authenticated users can redeem spins" ON public.roulette_spins
  FOR UPDATE TO authenticated
  USING (status = 'pending')
  WITH CHECK (status = 'redeemed');

-- Create index for email lookup (anti-fraud)
CREATE INDEX idx_roulette_spins_email ON public.roulette_spins (email);
CREATE INDEX idx_roulette_spins_qr_id ON public.roulette_spins (qr_id);

-- Storage bucket for roulette assets
INSERT INTO storage.buckets (id, name, public) VALUES ('roulette-assets', 'roulette-assets', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can read roulette assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'roulette-assets');

CREATE POLICY "Admins can manage roulette assets" ON storage.objects
  FOR ALL USING (bucket_id = 'roulette-assets' AND public.has_role(auth.uid(), 'admin'));
