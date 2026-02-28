-- ============================================
-- Equipe Financeira 2.0 — Schedules (Cron)
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela agent_schedules
CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective_template TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  filter_context JSONB,
  email_recipients TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_schedules_active ON agent_schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_schedules_team_id ON agent_schedules(team_id);

-- 3. Trigger updated_at
DROP TRIGGER IF EXISTS trg_agent_schedules_updated_at ON agent_schedules;
CREATE TRIGGER trg_agent_schedules_updated_at
  BEFORE UPDATE ON agent_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_schedules_select" ON agent_schedules;
CREATE POLICY "agent_schedules_select" ON agent_schedules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

DROP POLICY IF EXISTS "agent_schedules_insert" ON agent_schedules;
CREATE POLICY "agent_schedules_insert" ON agent_schedules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

DROP POLICY IF EXISTS "agent_schedules_update" ON agent_schedules;
CREATE POLICY "agent_schedules_update" ON agent_schedules
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

DROP POLICY IF EXISTS "agent_schedules_delete" ON agent_schedules;
CREATE POLICY "agent_schedules_delete" ON agent_schedules
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
