-- ============================================
-- Tabela: pdd_contas
-- Contas (tag0 + tag01) que entram no cálculo de PDD
-- ============================================

CREATE TABLE IF NOT EXISTS pdd_contas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag0 TEXT NOT NULL,
  tag01 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pdd_contas_unico UNIQUE (tag0, tag01)
);

COMMENT ON TABLE pdd_contas IS 'Contas selecionadas para base de cálculo de PDD';

-- RLS
ALTER TABLE pdd_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdd_contas_select" ON pdd_contas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pdd_contas_insert_admin" ON pdd_contas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "pdd_contas_delete_admin" ON pdd_contas
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );
