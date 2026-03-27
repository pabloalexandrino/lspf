CREATE TABLE cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6b7280',
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

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
  ('Aprendiz',             '#94a3b8', 14);

CREATE TABLE member_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES cargos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, cargo_id)
);

-- Migrate Henrique's cargo if exists
INSERT INTO member_cargos (member_id, cargo_id)
SELECT m.id, c.id
FROM members m, cargos c
WHERE m.nome ILIKE '%Henrique de Holanda%'
  AND c.nome = 'Venerável Mestre'
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can do everything on cargos"
  ON cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE member_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can do everything on member_cargos"
  ON member_cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);
