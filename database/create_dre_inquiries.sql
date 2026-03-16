-- ============================================================
-- SOLICITAÇÕES DE ANÁLISE DRE — Q&A / Accountability
-- Rodar no Supabase SQL Editor (na ordem)
-- ============================================================

-- 1. Tabela principal de solicitações
CREATE TABLE IF NOT EXISTS dre_inquiries (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Pergunta
  subject         text NOT NULL,
  question        text NOT NULL,
  priority        text NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('normal', 'urgent')),

  -- Participantes
  requester_email text NOT NULL,
  requester_name  text NOT NULL,
  assignee_email  text NOT NULL,
  assignee_name   text NOT NULL,

  -- Contexto DRE (snapshot dos filtros)
  filter_hash     text NOT NULL,
  filter_context  jsonb NOT NULL,

  -- Snapshot de valores-chave da DRE no momento da criação
  dre_snapshot    jsonb,

  -- Status
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',
                      'answered',
                      'approved',
                      'rejected',
                      'reopened',
                      'expired',
                      'closed'
                    )),

  -- SLA
  sla_deadline_at timestamptz,
  sla_breached    boolean NOT NULL DEFAULT false,
  sla_reminded    boolean NOT NULL DEFAULT false,

  -- Reatribuição
  original_assignee_email text,
  reassigned_by   text,
  reassigned_at   timestamptz,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inq_requester  ON dre_inquiries (requester_email);
CREATE INDEX IF NOT EXISTS idx_inq_assignee   ON dre_inquiries (assignee_email);
CREATE INDEX IF NOT EXISTS idx_inq_status     ON dre_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inq_sla        ON dre_inquiries (sla_deadline_at) WHERE NOT sla_breached;
CREATE INDEX IF NOT EXISTS idx_inq_created    ON dre_inquiries (created_at DESC);

-- 2. Mensagens (thread / chat)
CREATE TABLE IF NOT EXISTS dre_inquiry_messages (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id      bigint NOT NULL REFERENCES dre_inquiries(id) ON DELETE CASCADE,

  author_email    text NOT NULL,
  author_name     text NOT NULL,
  message         text NOT NULL,
  message_type    text NOT NULL DEFAULT 'response'
                    CHECK (message_type IN (
                      'question',
                      'response',
                      'counter',
                      'approval',
                      'rejection',
                      'system'
                    )),

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inqm_inquiry ON dre_inquiry_messages (inquiry_id, created_at);

-- 3. Configuração de SLA
CREATE TABLE IF NOT EXISTS dre_inquiry_sla_config (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  priority        text NOT NULL UNIQUE CHECK (priority IN ('normal', 'urgent')),
  deadline_hours  integer NOT NULL DEFAULT 48,
  reminder_hours  integer NOT NULL DEFAULT 24,
  escalate_to     text,
  active          boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO dre_inquiry_sla_config (priority, deadline_hours, reminder_hours)
VALUES
  ('normal', 48, 24),
  ('urgent', 24, 6)
ON CONFLICT (priority) DO NOTHING;

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inq_updated_at ON dre_inquiries;
CREATE TRIGGER trg_inq_updated_at
  BEFORE UPDATE ON dre_inquiries
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 5. RLS — dre_inquiries
ALTER TABLE dre_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY inq_select ON dre_inquiries
  FOR SELECT TO authenticated, anon
  USING (
    requester_email = (SELECT email FROM users WHERE email = auth.email())
    OR assignee_email = (SELECT email FROM users WHERE email = auth.email())
    OR original_assignee_email = (SELECT email FROM users WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role IN ('admin', 'manager'))
  );

CREATE POLICY inq_insert ON dre_inquiries
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY inq_update ON dre_inquiries
  FOR UPDATE TO authenticated, anon
  USING (
    requester_email = (SELECT email FROM users WHERE email = auth.email())
    OR assignee_email = (SELECT email FROM users WHERE email = auth.email())
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY inq_delete ON dre_inquiries
  FOR DELETE TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- 6. RLS — dre_inquiry_messages
ALTER TABLE dre_inquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY inqm_select ON dre_inquiry_messages
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM dre_inquiries i
      WHERE i.id = inquiry_id
      AND (
        i.requester_email = (SELECT email FROM users WHERE email = auth.email())
        OR i.assignee_email = (SELECT email FROM users WHERE email = auth.email())
        OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role IN ('admin', 'manager'))
      )
    )
  );

CREATE POLICY inqm_insert ON dre_inquiry_messages
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- 7. RLS — dre_inquiry_sla_config
ALTER TABLE dre_inquiry_sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_select ON dre_inquiry_sla_config
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY sla_modify ON dre_inquiry_sla_config
  FOR ALL TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- 8. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON dre_inquiries TO authenticated, anon;
GRANT SELECT, INSERT ON dre_inquiry_messages TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON dre_inquiry_sla_config TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
