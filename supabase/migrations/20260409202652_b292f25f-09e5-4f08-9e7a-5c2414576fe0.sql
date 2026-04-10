
-- Create avatars table
CREATE TABLE public.avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '👤',
  color TEXT NOT NULL DEFAULT 'from-gray-400 to-gray-500',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_easter_egg BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique sort_order
CREATE UNIQUE INDEX idx_avatars_sort_order ON public.avatars (sort_order) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Anyone can read active avatars
CREATE POLICY "Anyone can read active avatars"
ON public.avatars FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage avatars
CREATE POLICY "Admins can manage avatars"
ON public.avatars FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_avatars_updated_at
BEFORE UPDATE ON public.avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing avatars (NO bonus points anywhere)
INSERT INTO public.avatars (slug, name, description, emoji, color, sort_order, is_easter_egg) VALUES
  ('explorador', 'Explorador', 'O desbravador de novas fronteiras digitais', '🧭', 'from-blue-400 to-blue-500', 1, false),
  ('automacao', 'Automação', 'O mestre dos processos automatizados', '⚙️', 'from-indigo-400 to-indigo-500', 2, false),
  ('unicornio', 'Unicórnio', 'A startup dos sonhos que virou realidade', '🦄', 'from-pink-400 to-purple-500', 3, false),
  ('campeao', 'Campeão', 'O vencedor nato que conquista resultados', '🏆', 'from-yellow-400 to-amber-500', 4, false),
  ('shopper', 'Shopper', 'O especialista em experiência de compra', '🛒', 'from-green-400 to-emerald-500', 5, true),
  ('tech-wizard', 'Tech Wizard', 'O mago da tecnologia e inovação', '🧙', 'from-purple-400 to-violet-500', 6, false),
  ('flash-dev', 'Flash Dev', 'O desenvolvedor mais rápido do oeste', '⚡', 'from-orange-400 to-red-500', 7, false),
  ('dragao', 'Dragão', 'O guardião poderoso do ecossistema', '🐉', 'from-red-400 to-rose-500', 8, false),
  ('estrategista', 'Estrategista', 'O pensador que planeja cada movimento', '🎯', 'from-teal-400 to-cyan-500', 9, false);

-- Add onboarding content settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('onboarding_title', 'Cadastro Concluído!', 'Título exibido na tela de onboarding completo'),
  ('onboarding_subtitle', 'Você está a bordo!', 'Subtítulo exibido na tela de onboarding completo'),
  ('onboarding_message', 'Bem-vindo(a) ao VTEX Day, {name}!', 'Mensagem personalizada ({name} será substituído pelo nome do usuário)')
ON CONFLICT DO NOTHING;
