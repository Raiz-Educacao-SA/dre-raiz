-- ============================================
-- Evolução: decision_models — colunas de governança
-- Suporte ao Decision Governance Model v1.0
-- ============================================

-- Novos campos para rastreabilidade de alterações
ALTER TABLE decision_models
  ADD COLUMN IF NOT EXISTS changed_by TEXT,
  ADD COLUMN IF NOT EXISTS justification TEXT,
  ADD COLUMN IF NOT EXISTS previous_values JSONB,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backtesting_result TEXT;

-- Constraint: justificativa obrigatória com mínimo 30 caracteres para novos registros
-- (não aplicável retroativamente a registros existentes)
ALTER TABLE decision_models DROP CONSTRAINT IF EXISTS chk_justification_length;
ALTER TABLE decision_models
  ADD CONSTRAINT chk_justification_length
  CHECK (justification IS NULL OR length(justification) >= 30);

-- Comentários
COMMENT ON COLUMN decision_models.changed_by IS 'Email do responsável pela alteração';
COMMENT ON COLUMN decision_models.justification IS 'Motivo da alteração (mínimo 30 caracteres)';
COMMENT ON COLUMN decision_models.previous_values IS 'Snapshot JSONB dos valores anteriores à alteração';
COMMENT ON COLUMN decision_models.approved_by IS 'Email do aprovador executivo';
COMMENT ON COLUMN decision_models.approved_at IS 'Data/hora da aprovação formal';
COMMENT ON COLUMN decision_models.backtesting_result IS 'Resumo do backtesting realizado antes da alteração';
