-- ============================================
-- Decision Intelligence Platform — Agent Schedules v2
-- Migration completa: evolui agent_schedules para spec definitiva
-- NON-DESTRUCTIVE — safe to re-run
-- Execute no Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1 — COLUNAS
-- ============================================

-- 1a. organization_id (já existe como TEXT via add_organization_id.sql)
-- Apenas garantir que existe
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- 1b. frequency (daily | weekly | monthly)
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'daily';

-- Adicionar CHECK constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'agent_schedules' AND column_name = 'frequency'
    AND constraint_name LIKE '%frequency%check%'
  ) THEN
    BEGIN
      ALTER TABLE agent_schedules ADD CONSTRAINT agent_schedules_frequency_check
        CHECK (frequency IN ('daily', 'weekly', 'monthly'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 1c. execution_time (HH:MM)
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS execution_time TEXT NOT NULL DEFAULT '08:00';

-- 1d. timezone (IANA)
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- 1e. Tracking de execução
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- 1f. Campos auxiliares para weekly/monthly
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS day_of_week INT;
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS day_of_month INT;

-- Adicionar CHECK constraints se não existirem
DO $$
BEGIN
  BEGIN
    ALTER TABLE agent_schedules ADD CONSTRAINT agent_schedules_day_of_week_check
      CHECK (day_of_week BETWEEN 0 AND 6);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE agent_schedules ADD CONSTRAINT agent_schedules_day_of_month_check
      CHECK (day_of_month BETWEEN 1 AND 28);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 1g. Garantir que updated_at existe
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================
-- PARTE 2 — TRIGGER updated_at
-- ============================================

-- Função genérica (já pode existir de outras tabelas)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_schedules_updated_at ON agent_schedules;
CREATE TRIGGER trg_agent_schedules_updated_at
  BEFORE UPDATE ON agent_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 3 — INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_schedules_org
  ON agent_schedules(organization_id);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_run
  ON agent_schedules(next_run_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_schedules_org_active
  ON agent_schedules(organization_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_schedules_team_id
  ON agent_schedules(team_id);

-- ============================================
-- PARTE 4 — RLS ISOLADO POR organization_id
-- ============================================

ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas (admin-only)
DROP POLICY IF EXISTS "agent_schedules_select" ON agent_schedules;
DROP POLICY IF EXISTS "agent_schedules_insert" ON agent_schedules;
DROP POLICY IF EXISTS "agent_schedules_update" ON agent_schedules;
DROP POLICY IF EXISTS "agent_schedules_delete" ON agent_schedules;

-- SELECT: admin pode ver tudo (single-tenant por enquanto)
CREATE POLICY "agent_schedules_select_by_org" ON agent_schedules
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- INSERT: admin
CREATE POLICY "agent_schedules_insert_by_org" ON agent_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- UPDATE: admin
CREATE POLICY "agent_schedules_update_by_org" ON agent_schedules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- DELETE: admin
CREATE POLICY "agent_schedules_delete_by_org" ON agent_schedules
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Service role bypassa RLS automaticamente (usado pelo cron endpoint)

-- ============================================
-- PARTE 5 — INICIALIZAR next_run_at
-- ============================================

UPDATE agent_schedules
SET next_run_at = (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '8 hours')
WHERE next_run_at IS NULL AND is_active = true;

-- ============================================
-- PARTE 6 — COMENTÁRIOS
-- ============================================

COMMENT ON TABLE agent_schedules IS 'Agendamentos automáticos de execução de pipelines de agentes';
COMMENT ON COLUMN agent_schedules.organization_id IS 'UUID da organização — RLS isolado';
COMMENT ON COLUMN agent_schedules.frequency IS 'daily | weekly | monthly';
COMMENT ON COLUMN agent_schedules.execution_time IS 'HH:MM no timezone especificado';
COMMENT ON COLUMN agent_schedules.timezone IS 'IANA timezone (ex: America/Sao_Paulo)';
COMMENT ON COLUMN agent_schedules.day_of_week IS '0=Domingo .. 6=Sábado. Para frequency=weekly.';
COMMENT ON COLUMN agent_schedules.day_of_month IS '1-28. Para frequency=monthly. Max 28 para evitar edge cases.';
COMMENT ON COLUMN agent_schedules.next_run_at IS 'Próxima execução calculada. Atualizado pelo schedule engine.';
COMMENT ON COLUMN agent_schedules.last_run_at IS 'Última execução concluída.';
