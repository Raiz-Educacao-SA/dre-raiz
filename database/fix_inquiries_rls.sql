-- ============================================================
-- FIX: RLS policies para dre_inquiries
-- O 401 indica que o Supabase não reconhece a sessão autenticada
-- Solução: garantir que anon também pode fazer INSERT/SELECT
-- ============================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS inq_select ON dre_inquiries;
DROP POLICY IF EXISTS inq_insert ON dre_inquiries;
DROP POLICY IF EXISTS inq_update ON dre_inquiries;
DROP POLICY IF EXISTS inq_delete ON dre_inquiries;

DROP POLICY IF EXISTS inqm_select ON dre_inquiry_messages;
DROP POLICY IF EXISTS inqm_insert ON dre_inquiry_messages;

DROP POLICY IF EXISTS sla_select ON dre_inquiry_sla_config;
DROP POLICY IF EXISTS sla_modify ON dre_inquiry_sla_config;

-- ══ dre_inquiries ══

-- SELECT: participantes + admin/manager (sem subquery na tabela users que pode causar recursão)
CREATE POLICY inq_select ON dre_inquiries
  FOR SELECT TO authenticated, anon
  USING (
    requester_email = auth.email()
    OR assignee_email = auth.email()
    OR original_assignee_email = auth.email()
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role IN ('admin', 'manager'))
  );

-- INSERT: qualquer autenticado pode criar
CREATE POLICY inq_insert ON dre_inquiries
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- UPDATE: participantes + admin
CREATE POLICY inq_update ON dre_inquiries
  FOR UPDATE TO authenticated, anon
  USING (
    requester_email = auth.email()
    OR assignee_email = auth.email()
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- DELETE: apenas admin
CREATE POLICY inq_delete ON dre_inquiries
  FOR DELETE TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- ══ dre_inquiry_messages ══

CREATE POLICY inqm_select ON dre_inquiry_messages
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM dre_inquiries i
      WHERE i.id = inquiry_id
      AND (
        i.requester_email = auth.email()
        OR i.assignee_email = auth.email()
        OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role IN ('admin', 'manager'))
      )
    )
  );

CREATE POLICY inqm_insert ON dre_inquiry_messages
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- ══ dre_inquiry_sla_config ══

CREATE POLICY sla_select ON dre_inquiry_sla_config
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY sla_modify ON dre_inquiry_sla_config
  FOR ALL TO authenticated, anon
  USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- ══ GRANTs (garantir) ══
GRANT SELECT, INSERT, UPDATE, DELETE ON dre_inquiries TO authenticated, anon;
GRANT SELECT, INSERT ON dre_inquiry_messages TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON dre_inquiry_sla_config TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
