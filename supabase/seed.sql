-- Seed: cargos
INSERT INTO cargos (nome, cor, ordem) VALUES
  ('Venerável Mestre',     '#f59e0b', 1),
  ('1º Vigilante',         '#3b82f6', 2),
  ('2º Vigilante',         '#8b5cf6', 3),
  ('Orador',               '#10b981', 4),
  ('Secretário',           '#06b6d4', 5),
  ('Tesoureiro',           '#f97316', 6),
  ('Chanceler',            '#ec4899', 7),
  ('Mestre de Cerimônias', '#84cc16', 8),
  ('Hospitaleiro',         '#14b8a6', 9),
  ('Diácono',              '#a78bfa', 10),
  ('Guarda do Templo',     '#64748b', 11),
  ('Mestre',               '#eab308', 12),
  ('Companheiro',          '#22c55e', 13),
  ('Aprendiz',             '#94a3b8', 14)
ON CONFLICT DO NOTHING;
