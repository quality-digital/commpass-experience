ALTER TABLE public.missions DROP CONSTRAINT missions_type_check;

UPDATE public.missions SET type = 'social,presencial' WHERE id = '92948df9-6d3e-4a52-a0d1-079c543ba805';