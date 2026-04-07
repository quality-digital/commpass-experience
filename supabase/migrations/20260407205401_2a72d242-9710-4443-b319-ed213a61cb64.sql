
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('prize_name', 'Nome do Prêmio', 'Nome do prêmio exibido na aba de Prêmios'),
  ('prize_value', 'R$ 12.000', 'Valor do prêmio exibido na aba de Prêmios'),
  ('prize_rules', 'A premiação ocorrerá ao final do evento. Os vencedores serão contatados por e-mail. É necessário cadastro completo para receber o prêmio. Consulte os termos completos na seção de Termos de Uso.', 'Regras da premiação exibidas na aba de Prêmios')
ON CONFLICT DO NOTHING;
