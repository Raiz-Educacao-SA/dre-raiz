-- ============================================
-- Decision Intelligence Platform — Multi-Tenant Preparation
-- Adiciona organization_id às tabelas do agent-team
-- Execute no Supabase SQL Editor
-- ============================================

-- NOTA: Este script é NON-DESTRUCTIVE. Usa ALTER TABLE ADD COLUMN IF NOT EXISTS
-- e DEFAULT 'default' para não quebrar dados existentes.

-- 1. teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- 2. agent_runs
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- 3. agent_steps (herda org do run, mas ter coluna facilita queries diretas)
ALTER TABLE agent_steps ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- 4. agent_alerts
ALTER TABLE agent_alerts ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- 5. agent_schedules
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default';

-- decision_models já tem organization_id (create_decision_models.sql)

-- 6. Indexes por organization_id
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_org ON agent_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_steps_org ON agent_steps(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_org ON agent_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_org ON agent_schedules(organization_id);

-- 7. RLS policies com organization_id
-- NOTA: Não substituímos as policies existentes. Adicionamos policies adicionais
-- que serão ativadas quando multi-tenant estiver em uso.
-- A implementação atual usa 'default' para todas as orgs, então as policies
-- existentes continuam funcionando.

-- Exemplo de policy futura (descomentariar quando multi-tenant estiver ativo):
-- CREATE POLICY "agent_runs_org_isolation" ON agent_runs
--   FOR ALL TO authenticated
--   USING (
--     organization_id = (
--       SELECT organization_id FROM users WHERE email = auth.email()
--     )
--   );
