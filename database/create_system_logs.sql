-- ============================================
-- system_logs — Logging estruturado persistente
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  context        TEXT NOT NULL,
  level          TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message        TEXT NOT NULL,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_org_level
  ON system_logs(organization_id, level);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at
  ON system_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_context
  ON system_logs(context);

-- RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas admin
CREATE POLICY "system_logs_select_admin" ON system_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Escrita: service_role (backend insere via supabaseAdmin)
-- Authenticated users não podem inserir/modificar logs
CREATE POLICY "system_logs_insert_service" ON system_logs
  FOR INSERT TO authenticated
  USING (false)
  WITH CHECK (false);

-- Cleanup automático: logs > 90 dias (descomentar se pg_cron disponível)
-- SELECT cron.schedule('cleanup-system-logs', '0 3 * * *',
--   $$DELETE FROM system_logs WHERE created_at < now() - interval '90 days'$$
-- );
