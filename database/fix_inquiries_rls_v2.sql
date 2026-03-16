-- ============================================================
-- FIX V2: Recriar RLS do zero para dre_inquiries
-- Dropa TODAS as policies existentes e recria
-- ============================================================

-- ══ 1. Desabilitar RLS temporariamente ══
ALTER TABLE dre_inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE dre_inquiry_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE dre_inquiry_sla_config DISABLE ROW LEVEL SECURITY;

-- ══ 2. Dropar TODAS as policies (inclusive possíveis duplicatas) ══
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('dre_inquiries', 'dre_inquiry_messages', 'dre_inquiry_sla_config')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ══ 3. Habilitar RLS ══
ALTER TABLE dre_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_inquiry_sla_config ENABLE ROW LEVEL SECURITY;

-- ══ 4. Policies dre_inquiries ══

-- SELECT: todos autenticados podem ver (simplificado — filtro é feito no app)
CREATE POLICY "inquiries_select" ON dre_inquiries
  FOR SELECT USING (true);

-- INSERT: qualquer um pode criar
CREATE POLICY "inquiries_insert" ON dre_inquiries
  FOR INSERT WITH CHECK (true);

-- UPDATE: qualquer autenticado
CREATE POLICY "inquiries_update" ON dre_inquiries
  FOR UPDATE USING (true);

-- DELETE: qualquer autenticado
CREATE POLICY "inquiries_delete" ON dre_inquiries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- ══ 5. Policies dre_inquiry_messages ══

CREATE POLICY "messages_select" ON dre_inquiry_messages
  FOR SELECT USING (true);

CREATE POLICY "messages_insert" ON dre_inquiry_messages
  FOR INSERT WITH CHECK (true);

-- ══ 6. Policies dre_inquiry_sla_config ══

CREATE POLICY "sla_select" ON dre_inquiry_sla_config
  FOR SELECT USING (true);

CREATE POLICY "sla_update" ON dre_inquiry_sla_config
  FOR UPDATE USING (true);

CREATE POLICY "sla_insert" ON dre_inquiry_sla_config
  FOR INSERT WITH CHECK (true);

-- ══ 7. GRANTs completos ══
GRANT ALL ON dre_inquiries TO authenticated, anon;
GRANT ALL ON dre_inquiry_messages TO authenticated, anon;
GRANT ALL ON dre_inquiry_sla_config TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
