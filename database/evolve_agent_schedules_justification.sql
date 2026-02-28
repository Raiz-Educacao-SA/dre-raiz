-- ============================================
-- Evolução: agent_schedules — campo justification
-- Suporte ao Decision Governance Model v1.0
-- ============================================

ALTER TABLE agent_schedules
  ADD COLUMN IF NOT EXISTS justification TEXT;

-- Constraint: justificativa obrigatória ao desativar (is_active = false)
ALTER TABLE agent_schedules
  ADD CONSTRAINT chk_schedule_justification_on_deactivation
  CHECK (is_active = true OR (justification IS NOT NULL AND length(justification) >= 30));

COMMENT ON COLUMN agent_schedules.justification IS 'Justificativa obrigatória (min 30 chars) ao desativar agendamento';
