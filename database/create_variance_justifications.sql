-- ══════════════════════════════════════════════════════════════
-- Variance Justifications — Cobrança de Desvios DRE
-- Criado em: 2026-03-03
-- ══════════════════════════════════════════════════════════════

-- 1. Tabela principal: variance_justifications
CREATE TABLE IF NOT EXISTS variance_justifications (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year_month      text NOT NULL,
  marca           text NOT NULL,
  tag0            text NOT NULL,
  tag01           text NOT NULL,
  tag02           text,
  tag03           text,
  comparison_type text NOT NULL CHECK (comparison_type IN ('orcado', 'a1')),
  real_value      numeric NOT NULL DEFAULT 0,
  compare_value   numeric NOT NULL DEFAULT 0,
  variance_abs    numeric NOT NULL DEFAULT 0,
  variance_pct    numeric,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','notified','justified','approved','rejected')),
  owner_email     text,
  owner_name      text,
  justification   text,
  action_plan     text,
  ai_summary      text,
  ai_summary_at   timestamptz,
  justified_at    timestamptz,
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_note     text,
  notified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint (COALESCE para NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_variance_justification
  ON variance_justifications (
    year_month, marca, tag0, tag01,
    COALESCE(tag02, ''), COALESCE(tag03, ''),
    comparison_type
  );

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vj_year_month ON variance_justifications (year_month);
CREATE INDEX IF NOT EXISTS idx_vj_marca ON variance_justifications (marca);
CREATE INDEX IF NOT EXISTS idx_vj_status ON variance_justifications (status);
CREATE INDEX IF NOT EXISTS idx_vj_owner ON variance_justifications (owner_email);
CREATE INDEX IF NOT EXISTS idx_vj_comparison ON variance_justifications (comparison_type);

-- 2. Tabela de thresholds (config editável)
CREATE TABLE IF NOT EXISTS variance_thresholds (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marca           text,
  tag0            text,
  min_abs_value   numeric NOT NULL DEFAULT 0,
  min_pct_value   numeric NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vj_updated_at ON variance_justifications;
CREATE TRIGGER trg_vj_updated_at
  BEFORE UPDATE ON variance_justifications
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 4. RLS — variance_justifications
ALTER TABLE variance_justifications ENABLE ROW LEVEL SECURITY;

-- Select: todos os autenticados
DROP POLICY IF EXISTS vj_select_authenticated ON variance_justifications;
CREATE POLICY vj_select_authenticated ON variance_justifications
  FOR SELECT TO authenticated
  USING (true);

-- Insert: apenas admin
DROP POLICY IF EXISTS vj_insert_admin ON variance_justifications;
CREATE POLICY vj_insert_admin ON variance_justifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Update admin: pode alterar tudo
DROP POLICY IF EXISTS vj_update_admin ON variance_justifications;
CREATE POLICY vj_update_admin ON variance_justifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Update pacoteiro: pode atualizar justification e action_plan nas suas linhas
DROP POLICY IF EXISTS vj_update_owner ON variance_justifications;
CREATE POLICY vj_update_owner ON variance_justifications
  FOR UPDATE TO authenticated
  USING (owner_email = auth.email())
  WITH CHECK (owner_email = auth.email());

-- Delete: apenas admin
DROP POLICY IF EXISTS vj_delete_admin ON variance_justifications;
CREATE POLICY vj_delete_admin ON variance_justifications
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 5. RLS — variance_thresholds
ALTER TABLE variance_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vt_select_authenticated ON variance_thresholds;
CREATE POLICY vt_select_authenticated ON variance_thresholds
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS vt_insert_admin ON variance_thresholds;
CREATE POLICY vt_insert_admin ON variance_thresholds
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS vt_update_admin ON variance_thresholds;
CREATE POLICY vt_update_admin ON variance_thresholds
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS vt_delete_admin ON variance_thresholds;
CREATE POLICY vt_delete_admin ON variance_thresholds
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 6. Habilitar Realtime em variance_justifications
ALTER PUBLICATION supabase_realtime ADD TABLE variance_justifications;

-- ══════════════════════════════════════════════════════════════
-- Verificação
-- ══════════════════════════════════════════════════════════════
SELECT 'variance_justifications' AS tabela, COUNT(*) FROM variance_justifications
UNION ALL
SELECT 'variance_thresholds', COUNT(*) FROM variance_thresholds;
