-- ============================================
-- Equipe Financeira 2.0 — Database Schema (Relacional)
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela team_agents (join)
CREATE TABLE IF NOT EXISTS team_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('plan', 'execute', 'consolidate')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (team_id, step_order),
  UNIQUE (team_id, agent_id, step_type)
);

-- 4. Tabela agent_runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  dre_data_snapshot JSONB,
  financial_summary JSONB,
  filter_context JSONB,
  consolidated_summary TEXT,
  admin_comment TEXT,
  started_by TEXT,
  started_by_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. Tabela agent_steps
CREATE TABLE IF NOT EXISTS agent_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_code TEXT NOT NULL,
  step_type TEXT NOT NULL
    CHECK (step_type IN ('plan', 'execute', 'consolidate')),
  step_order INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_data JSONB,
  output_data JSONB,
  raw_output TEXT,
  error_message TEXT,
  review_status TEXT DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'revision_requested')),
  review_comment TEXT,
  reviewed_by TEXT,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  model_used TEXT,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_order)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_runs_team_id ON agent_runs(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_by ON agent_runs(started_by);
CREATE INDEX IF NOT EXISTS idx_agent_steps_run_id ON agent_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status);
CREATE INDEX IF NOT EXISTS idx_agent_steps_run_status ON agent_steps(run_id, status);
CREATE INDEX IF NOT EXISTS idx_team_agents_team_id ON team_agents(team_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_agent_id ON team_agents(agent_id);

-- ============================================
-- Trigger updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agent_steps_updated_at ON agent_steps;
CREATE TRIGGER trg_agent_steps_updated_at
  BEFORE UPDATE ON agent_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Restritivo
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;

-- TEAMS: leitura pública (configuração), escrita admin
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teams_write" ON teams;
CREATE POLICY "teams_write" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- AGENTS: leitura pública (configuração), escrita admin
DROP POLICY IF EXISTS "agents_select" ON agents;
CREATE POLICY "agents_select" ON agents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "agents_write" ON agents;
CREATE POLICY "agents_write" ON agents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agents_update" ON agents;
CREATE POLICY "agents_update" ON agents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agents_delete" ON agents;
CREATE POLICY "agents_delete" ON agents
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- TEAM_AGENTS: leitura pública (configuração), escrita admin
DROP POLICY IF EXISTS "team_agents_select" ON team_agents;
CREATE POLICY "team_agents_select" ON team_agents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "team_agents_write" ON team_agents;
CREATE POLICY "team_agents_write" ON team_agents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "team_agents_update" ON team_agents;
CREATE POLICY "team_agents_update" ON team_agents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "team_agents_delete" ON team_agents;
CREATE POLICY "team_agents_delete" ON team_agents
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- AGENT_RUNS: admin vê tudo, outros veem só os próprios
DROP POLICY IF EXISTS "agent_runs_select" ON agent_runs;
CREATE POLICY "agent_runs_select" ON agent_runs
  FOR SELECT TO authenticated
  USING (
    started_by = auth.email()
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "agent_runs_insert" ON agent_runs;
CREATE POLICY "agent_runs_insert" ON agent_runs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agent_runs_update" ON agent_runs;
CREATE POLICY "agent_runs_update" ON agent_runs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agent_runs_delete" ON agent_runs;
CREATE POLICY "agent_runs_delete" ON agent_runs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- AGENT_STEPS: herda visibilidade do run pai
DROP POLICY IF EXISTS "agent_steps_select" ON agent_steps;
CREATE POLICY "agent_steps_select" ON agent_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs ar
      WHERE ar.id = agent_steps.run_id
      AND (ar.started_by = auth.email()
           OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "agent_steps_insert" ON agent_steps;
CREATE POLICY "agent_steps_insert" ON agent_steps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agent_steps_update" ON agent_steps;
CREATE POLICY "agent_steps_update" ON agent_steps
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
DROP POLICY IF EXISTS "agent_steps_delete" ON agent_steps;
CREATE POLICY "agent_steps_delete" ON agent_steps
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- ============================================
-- Seed: Agents
-- ============================================

INSERT INTO agents (code, name, role, description, avatar_color) VALUES
  ('alex',   'Alex',   'Supervisor',         'Analisa dados, distribui tarefas e consolida resultados.', '#8b5cf6'),
  ('bruna',  'Bruna',  'Qualidade de Dados', 'Detecta anomalias, campos ausentes e inconsistências.',    '#f59e0b'),
  ('carlos', 'Carlos', 'Performance',        'Analisa margens, tendências e indicadores financeiros.',    '#3b82f6')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Team Alpha
-- ============================================

INSERT INTO teams (name, description) VALUES
  ('Alpha', 'Equipe Financeira 2.0 — Análise automatizada do DRE com supervisão, qualidade de dados e performance.')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Seed: Team Alpha pipeline (4 steps)
-- ============================================

INSERT INTO team_agents (team_id, agent_id, step_order, step_type)
SELECT t.id, a.id, v.step_order, v.step_type
FROM (VALUES
  ('alex',   1, 'plan'),
  ('bruna',  2, 'execute'),
  ('carlos', 3, 'execute'),
  ('alex',   4, 'consolidate')
) AS v(agent_code, step_order, step_type)
JOIN teams t ON t.name = 'Alpha'
JOIN agents a ON a.code = v.agent_code
ON CONFLICT DO NOTHING;

-- ============================================
-- RPC: claim_next_pending_step (FOR UPDATE SKIP LOCKED)
-- ============================================

CREATE OR REPLACE FUNCTION claim_next_pending_step(p_run_id UUID)
RETURNS UUID AS $$
DECLARE
  v_step_id UUID;
BEGIN
  SELECT id INTO v_step_id
  FROM agent_steps
  WHERE run_id = p_run_id
    AND status = 'pending'
  ORDER BY step_order ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_step_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE agent_steps
  SET status = 'running', updated_at = now()
  WHERE id = v_step_id;

  RETURN v_step_id;
END;
$$ LANGUAGE plpgsql;
