-- ============================================
-- decision_audit_trail — Rastreabilidade de Decisões
-- Suporte ao Decision Governance Model v1.0
-- ============================================

CREATE TABLE IF NOT EXISTS decision_audit_trail (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID,
  run_id           UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  action_type      TEXT NOT NULL CHECK (action_type IN (
    'analysis', 'optimization', 'forecast', 'schedule',
    'override', 'weight_change', 'approval', 'rejection'
  )),
  input_snapshot   JSONB,
  output_snapshot  JSONB,
  model_version    TEXT,
  performed_by     TEXT NOT NULL,
  justification    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_org
  ON decision_audit_trail(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_run_id
  ON decision_audit_trail(run_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type
  ON decision_audit_trail(action_type);

CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at
  ON decision_audit_trail(created_at DESC);

-- RLS
ALTER TABLE decision_audit_trail ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas admin
CREATE POLICY "audit_trail_select_admin" ON decision_audit_trail
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Escrita: service_role (backend insere via supabaseAdmin)
-- Registros de auditoria são imutáveis — sem UPDATE/DELETE para authenticated
CREATE POLICY "audit_trail_insert_service" ON decision_audit_trail
  FOR INSERT TO authenticated
  USING (false)
  WITH CHECK (false);

-- Comentários
COMMENT ON TABLE decision_audit_trail IS 'Registro imutável de decisões — governança formal';
COMMENT ON COLUMN decision_audit_trail.action_type IS 'Tipo: analysis, optimization, forecast, schedule, override, weight_change, approval, rejection';
COMMENT ON COLUMN decision_audit_trail.input_snapshot IS 'Dados de entrada no momento da decisão (plano proposto, score, etc.)';
COMMENT ON COLUMN decision_audit_trail.output_snapshot IS 'Resultado da decisão (aprovação, rejeição, override com justificativa)';
COMMENT ON COLUMN decision_audit_trail.model_version IS 'Versão do modelo matemático no momento da decisão';
