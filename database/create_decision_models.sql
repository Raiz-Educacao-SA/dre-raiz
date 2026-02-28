-- ============================================
-- Decision Intelligence Platform — Model Versioning
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela decision_models
-- Armazena versões de configuração do scoring model.
-- Apenas 1 registro pode ser active por organization.
CREATE TABLE IF NOT EXISTS decision_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  organization_id TEXT DEFAULT 'default',

  -- Score weights (base 100)
  base_score INT NOT NULL DEFAULT 100,
  penalty_confidence_threshold NUMERIC NOT NULL DEFAULT 80,
  penalty_confidence_factor NUMERIC NOT NULL DEFAULT 0.5,
  penalty_margin_factor NUMERIC NOT NULL DEFAULT 2,
  penalty_ebitda_fixed NUMERIC NOT NULL DEFAULT 5,
  penalty_high_priority_threshold INT NOT NULL DEFAULT 3,
  penalty_high_priority_fixed NUMERIC NOT NULL DEFAULT 5,
  penalty_conflicts_fixed NUMERIC NOT NULL DEFAULT 3,

  -- Classification thresholds
  classification_healthy INT NOT NULL DEFAULT 85,
  classification_attention INT NOT NULL DEFAULT 70,

  -- Alert thresholds
  alert_score_critical INT NOT NULL DEFAULT 70,
  alert_margin_gap NUMERIC NOT NULL DEFAULT 2,
  alert_high_priority_threshold INT NOT NULL DEFAULT 3,
  alert_conflicts_threshold INT NOT NULL DEFAULT 2,

  -- Optimization defaults
  optimization_fractions JSONB NOT NULL DEFAULT '[0.6, 0.7, 0.8, 0.9, 1.0]'::jsonb,
  optimization_max_cut_pct NUMERIC NOT NULL DEFAULT 0.1,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, version)
);

-- 2. Trigger updated_at
CREATE OR REPLACE FUNCTION update_decision_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decision_models_updated_at ON decision_models;
CREATE TRIGGER trg_decision_models_updated_at
  BEFORE UPDATE ON decision_models
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_models_updated_at();

-- 3. Ensure only 1 active model per organization
CREATE OR REPLACE FUNCTION ensure_single_active_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE decision_models
    SET is_active = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_active_model ON decision_models;
CREATE TRIGGER trg_single_active_model
  BEFORE INSERT OR UPDATE ON decision_models
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_model();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_decision_models_active
  ON decision_models(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_decision_models_org
  ON decision_models(organization_id);

-- 5. RLS
ALTER TABLE decision_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decision_models_select" ON decision_models;
CREATE POLICY "decision_models_select" ON decision_models
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "decision_models_write" ON decision_models;
CREATE POLICY "decision_models_write" ON decision_models
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- 6. Seed: default model v1.0
INSERT INTO decision_models (
  version, name, description, is_active, organization_id, created_by
) VALUES (
  '1.0', 'Default Model', 'Modelo padrão de scoring com penalidades fixas', true, 'default', 'system'
) ON CONFLICT (organization_id, version) DO NOTHING;
