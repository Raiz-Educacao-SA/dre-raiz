-- Fix RLS para transactions_orcado e transactions_ano_anterior
-- Problema: update/delete silenciosamente bloqueados (0 rows) porque
-- as tabelas têm RLS habilitado mas SEM policies de UPDATE/DELETE.
-- Padrão do projeto: policies sem TO + GRANT ALL para authenticated, anon.

-- ═══════════════════════════════════════════════════
-- 1. transactions_orcado
-- ═══════════════════════════════════════════════════
ALTER TABLE transactions_orcado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_orcado_select" ON transactions_orcado;
DROP POLICY IF EXISTS "transactions_orcado_insert" ON transactions_orcado;
DROP POLICY IF EXISTS "transactions_orcado_update" ON transactions_orcado;
DROP POLICY IF EXISTS "transactions_orcado_delete" ON transactions_orcado;

CREATE POLICY "transactions_orcado_select" ON transactions_orcado
  FOR SELECT USING (true);

CREATE POLICY "transactions_orcado_insert" ON transactions_orcado
  FOR INSERT WITH CHECK (true);

CREATE POLICY "transactions_orcado_update" ON transactions_orcado
  FOR UPDATE USING (true);

CREATE POLICY "transactions_orcado_delete" ON transactions_orcado
  FOR DELETE USING (true);

GRANT ALL ON transactions_orcado TO authenticated, anon;

-- ═══════════════════════════════════════════════════
-- 2. transactions_ano_anterior
-- ═══════════════════════════════════════════════════
ALTER TABLE transactions_ano_anterior ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_ano_anterior_select" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "transactions_ano_anterior_insert" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "transactions_ano_anterior_update" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "transactions_ano_anterior_delete" ON transactions_ano_anterior;

CREATE POLICY "transactions_ano_anterior_select" ON transactions_ano_anterior
  FOR SELECT USING (true);

CREATE POLICY "transactions_ano_anterior_insert" ON transactions_ano_anterior
  FOR INSERT WITH CHECK (true);

CREATE POLICY "transactions_ano_anterior_update" ON transactions_ano_anterior
  FOR UPDATE USING (true);

CREATE POLICY "transactions_ano_anterior_delete" ON transactions_ano_anterior
  FOR DELETE USING (true);

GRANT ALL ON transactions_ano_anterior TO authenticated, anon;

-- ═══════════════════════════════════════════════════
-- Verificação
-- ═══════════════════════════════════════════════════
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('transactions_orcado', 'transactions_ano_anterior')
ORDER BY tablename, cmd;
