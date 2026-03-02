-- ============================================
-- Tabela: share_pdd
-- Percentual de PDD (Provisão para Devedores Duvidosos) por Marca
-- ============================================

CREATE TABLE IF NOT EXISTS share_pdd (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marca TEXT NOT NULL UNIQUE,
  valor NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentário na tabela
COMMENT ON TABLE share_pdd IS 'Percentual de PDD por marca';
COMMENT ON COLUMN share_pdd.marca IS 'Código da marca (ex: AP, CGS, MT)';
COMMENT ON COLUMN share_pdd.valor IS 'Percentual de PDD (ex: 5.00 = 5%)';

-- RLS
ALTER TABLE share_pdd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_pdd_select" ON share_pdd
  FOR SELECT USING (true);

CREATE POLICY "share_pdd_insert_admin" ON share_pdd
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "share_pdd_update_admin" ON share_pdd
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "share_pdd_delete_admin" ON share_pdd
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_share_pdd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_share_pdd_updated_at
  BEFORE UPDATE ON share_pdd
  FOR EACH ROW
  EXECUTE FUNCTION update_share_pdd_updated_at();

-- Dados iniciais
INSERT INTO share_pdd (marca, valor) VALUES
  ('AP',   5.00),
  ('CGS',  2.50),
  ('CLV',  1.00),
  ('GEU',  5.00),
  ('GT',   0.50),
  ('MT',  11.00),
  ('QI',   2.50),
  ('SAP',  1.00),
  ('SD',   0.10),
  ('SP',   0.50)
ON CONFLICT (marca) DO UPDATE SET valor = EXCLUDED.valor;
