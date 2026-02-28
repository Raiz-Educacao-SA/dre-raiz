-- ============================================
-- Equipe Financeira 2.0 — Alerts
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela agent_alerts
CREATE TABLE IF NOT EXISTS agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  message TEXT NOT NULL,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_by TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_alerts_run_id ON agent_alerts(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_severity ON agent_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_not_dismissed ON agent_alerts(is_dismissed) WHERE is_dismissed = false;

-- 3. RLS
ALTER TABLE agent_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_alerts_select" ON agent_alerts;
CREATE POLICY "agent_alerts_select" ON agent_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs ar
      WHERE ar.id = agent_alerts.run_id
      AND (ar.started_by = auth.email()
           OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "agent_alerts_insert" ON agent_alerts;
CREATE POLICY "agent_alerts_insert" ON agent_alerts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

DROP POLICY IF EXISTS "agent_alerts_update" ON agent_alerts;
CREATE POLICY "agent_alerts_update" ON agent_alerts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));
