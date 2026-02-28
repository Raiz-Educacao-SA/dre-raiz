-- ============================================
-- Decision Feedback - Adaptive Intelligence
-- Tabela de feedback para auto-aprendizado
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. TABELA PRINCIPAL
CREATE TABLE IF NOT EXISTS decision_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL DEFAULT 'default',
  run_id UUID,
  forecast_value NUMERIC,
  realized_value NUMERIC,
  optimization_expected_gain NUMERIC,
  optimization_realized_gain NUMERIC,
  score_at_time NUMERIC CHECK (score_at_time IS NULL OR (score_at_time >= 0 AND score_at_time <= 100)),
  model_version TEXT NOT NULL DEFAULT '1.0',
  decision_type TEXT NOT NULL DEFAULT 'general' CHECK (decision_type IN ('forecast', 'optimization', 'score', 'alert', 'general')),
  feedback_source TEXT NOT NULL DEFAULT 'auto' CHECK (feedback_source IN ('auto', 'manual', 'import')),
  reference_period TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_decision_feedback_org_id ON decision_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_run_id ON decision_feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_decision_type ON decision_feedback(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_created_at ON decision_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_org_type ON decision_feedback(organization_id, decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_org_created ON decision_feedback(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_org_type_created ON decision_feedback(organization_id, decision_type, created_at DESC);

-- 3. TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_decision_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decision_feedback_updated_at ON decision_feedback;
CREATE TRIGGER trg_decision_feedback_updated_at
  BEFORE UPDATE ON decision_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_feedback_updated_at();

-- 4. ROW LEVEL SECURITY
ALTER TABLE decision_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decision_feedback_select" ON decision_feedback;
CREATE POLICY "decision_feedback_select" ON decision_feedback
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "decision_feedback_insert" ON decision_feedback;
CREATE POLICY "decision_feedback_insert" ON decision_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "decision_feedback_update" ON decision_feedback;
CREATE POLICY "decision_feedback_update" ON decision_feedback
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "decision_feedback_delete" ON decision_feedback;
CREATE POLICY "decision_feedback_delete" ON decision_feedback
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 5. COMENTARIOS
COMMENT ON TABLE decision_feedback IS 'Feedback de decisoes para motor de auto-aprendizado. Registra previsao vs realizado para calibracao automatica.';
COMMENT ON COLUMN decision_feedback.organization_id IS 'Identificador da organizacao (multi-tenant ready)';
COMMENT ON COLUMN decision_feedback.run_id IS 'UUID do agent_run que originou a decisao (opcional)';
COMMENT ON COLUMN decision_feedback.forecast_value IS 'Valor previsto pelo forecastModel';
COMMENT ON COLUMN decision_feedback.realized_value IS 'Valor realizado (ground truth) apos o periodo';
COMMENT ON COLUMN decision_feedback.optimization_expected_gain IS 'Ganho esperado pelo optimizationEngine';
COMMENT ON COLUMN decision_feedback.optimization_realized_gain IS 'Ganho efetivamente realizado apos implementacao';
COMMENT ON COLUMN decision_feedback.score_at_time IS 'Health Score (0-100) no momento da decisao';
COMMENT ON COLUMN decision_feedback.model_version IS 'Versao do modelo de configuracao usado na decisao';
COMMENT ON COLUMN decision_feedback.decision_type IS 'Tipo: forecast, optimization, score, alert ou general';
COMMENT ON COLUMN decision_feedback.feedback_source IS 'Proveniencia: auto (cron), manual (admin), import (bulk)';
COMMENT ON COLUMN decision_feedback.reference_period IS 'Periodo financeiro de referencia (ex: 2026-01)';
