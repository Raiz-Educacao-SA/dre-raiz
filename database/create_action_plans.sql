-- ============================================
-- action_plans — Planos de Ação 5W1H
-- Vinculados a variance_justifications (desvios)
-- ============================================

CREATE TABLE IF NOT EXISTS action_plans (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variance_justification_id bigint REFERENCES variance_justifications(id) ON DELETE SET NULL,

  -- Contexto denormalizado
  year_month      text NOT NULL,
  marca           text,
  tag0            text,
  tag01           text,
  tag02           text,
  comparison_type text NOT NULL DEFAULT 'orcado' CHECK (comparison_type IN ('orcado', 'a1')),

  -- Dados do desvio (snapshot no momento da criação)
  real_value      numeric,
  compare_value   numeric,
  variance_abs    numeric,
  variance_pct    numeric,

  -- 5W1H
  what            text NOT NULL,
  why             text NOT NULL,
  how             text,
  who_responsible text NOT NULL,
  who_email       text,
  deadline        date NOT NULL,
  expected_impact text,

  -- Status
  status          text NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'atrasado', 'cancelado')),

  -- Tracking
  justification   text,
  progress_note   text,
  completed_at    timestamptz,
  ai_generated    boolean NOT NULL DEFAULT false,

  -- Audit
  created_by      text NOT NULL,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ap_variance ON action_plans (variance_justification_id);
CREATE INDEX IF NOT EXISTS idx_ap_year_month ON action_plans (year_month);
CREATE INDEX IF NOT EXISTS idx_ap_marca ON action_plans (marca);
CREATE INDEX IF NOT EXISTS idx_ap_status ON action_plans (status);
CREATE INDEX IF NOT EXISTS idx_ap_deadline ON action_plans (deadline);

-- RLS
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_select ON action_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY ap_insert ON action_plans FOR INSERT TO authenticated WITH CHECK (auth.email() IS NOT NULL);
CREATE POLICY ap_update ON action_plans FOR UPDATE TO authenticated USING (
  created_by = auth.email()
  OR who_email = auth.email()
  OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role IN ('admin', 'manager'))
);
CREATE POLICY ap_delete ON action_plans FOR DELETE TO authenticated USING (
  created_by = auth.email()
  OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION trg_action_plans_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ap_updated_at
  BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION trg_action_plans_updated_at();

-- Auto-atrasado function (chamada via pg_cron diariamente)
CREATE OR REPLACE FUNCTION update_overdue_action_plans()
RETURNS void AS $$
BEGIN
  UPDATE action_plans
  SET status = 'atrasado', updated_at = now()
  WHERE status IN ('aberto', 'em_andamento')
    AND deadline < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE action_plans;
