-- ============================================
-- Tabela: tributos_config
-- Alíquotas de tributos por marca, filial e tipo de receita
-- Executar no Supabase SQL Editor
-- ============================================

-- 1) Tabela
CREATE TABLE IF NOT EXISTS tributos_config (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marca         text NOT NULL,
  filial        text NOT NULL,
  tipo_receita  text NOT NULL,
  pis_cofins    numeric(8,4) NOT NULL DEFAULT 0,
  iss           numeric(8,4) NOT NULL DEFAULT 0,
  paa           numeric(8,4) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_tributos_marca_filial_tipo UNIQUE (marca, filial, tipo_receita)
);

-- 2) Trigger updated_at automático
CREATE OR REPLACE FUNCTION trg_tributos_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tributos_config_updated ON tributos_config;
CREATE TRIGGER trg_tributos_config_updated
  BEFORE UPDATE ON tributos_config
  FOR EACH ROW EXECUTE FUNCTION trg_tributos_config_updated_at();

-- 3) RLS
ALTER TABLE tributos_config ENABLE ROW LEVEL SECURITY;

-- Select: todos autenticados
CREATE POLICY "tributos_config_select"
  ON tributos_config FOR SELECT
  TO authenticated
  USING (true);

-- Insert: apenas admin
CREATE POLICY "tributos_config_insert"
  ON tributos_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Update: apenas admin
CREATE POLICY "tributos_config_update"
  ON tributos_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Delete: apenas admin
CREATE POLICY "tributos_config_delete"
  ON tributos_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tributos_config;

-- 5) Índice para queries por marca+filial
CREATE INDEX IF NOT EXISTS idx_tributos_config_marca_filial
  ON tributos_config (marca, filial);
