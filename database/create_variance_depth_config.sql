-- Configuracao de profundidade de justificativa por tag01
-- Permite definir ate que nivel cada centro de custo gera justificativas
-- depth: 1=tag01, 2=tag02, 3=marca (default: 2 = tag02)

CREATE TABLE IF NOT EXISTS variance_depth_config (
  id SERIAL PRIMARY KEY,
  tag0 TEXT,                    -- NULL = todos os tag0
  tag01 TEXT NOT NULL,          -- centro de custo
  depth INTEGER NOT NULL DEFAULT 2 CHECK (depth BETWEEN 1 AND 3),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tag0, tag01)
);

-- Index para lookup rapido
CREATE INDEX IF NOT EXISTS idx_vdc_tag01 ON variance_depth_config (tag01);
CREATE INDEX IF NOT EXISTS idx_vdc_active ON variance_depth_config (active) WHERE active = true;

-- RLS
ALTER TABLE variance_depth_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variance_depth_config_select" ON variance_depth_config
  FOR SELECT USING (true);

CREATE POLICY "variance_depth_config_admin" ON variance_depth_config
  FOR ALL USING (auth.email() IN (
    SELECT email FROM users WHERE role = 'admin'
  ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_vdc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vdc_updated_at
  BEFORE UPDATE ON variance_depth_config
  FOR EACH ROW EXECUTE FUNCTION update_vdc_updated_at();

-- Comentarios
COMMENT ON TABLE variance_depth_config IS 'Config de profundidade de justificativa por centro de custo';
COMMENT ON COLUMN variance_depth_config.depth IS '1=tag01 (centro custo), 2=tag02 (segmento), 3=marca';
COMMENT ON COLUMN variance_depth_config.tag0 IS 'Filtro opcional por grupo DRE (NULL=todos)';
