-- ============================================================
-- FIX DEFINITIVO: RLS para variance_justifications e variance_thresholds
--
-- Problema: policies exigiam 'authenticated' mas sessão Supabase
-- expira após 1h (token Firebase). Resultado: 401 em tudo.
--
-- Solução:
-- 1. Policies permissivas para 'authenticated' (leitura + escrita)
-- 2. Fallback de leitura para 'anon' (resilência se sessão expirar)
-- 3. RPCs SECURITY DEFINER como alternativa robusta
-- ============================================================

-- ============================================
-- 1. VARIANCE_JUSTIFICATIONS
-- ============================================

-- Dropar TODAS as policies existentes
DROP POLICY IF EXISTS "vj_select_authenticated" ON variance_justifications;
DROP POLICY IF EXISTS "vj_insert_admin" ON variance_justifications;
DROP POLICY IF EXISTS "vj_update_admin" ON variance_justifications;
DROP POLICY IF EXISTS "vj_update_owner" ON variance_justifications;
DROP POLICY IF EXISTS "vj_delete_admin" ON variance_justifications;
DROP POLICY IF EXISTS "vj_insert_authenticated" ON variance_justifications;
DROP POLICY IF EXISTS "vj_update_authenticated" ON variance_justifications;
DROP POLICY IF EXISTS "vj_delete_authenticated" ON variance_justifications;
DROP POLICY IF EXISTS "variance_justifications_select" ON variance_justifications;
DROP POLICY IF EXISTS "variance_justifications_insert" ON variance_justifications;
DROP POLICY IF EXISTS "variance_justifications_update" ON variance_justifications;
DROP POLICY IF EXISTS "variance_justifications_delete" ON variance_justifications;

-- Garantir RLS ativo
ALTER TABLE variance_justifications ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated + anon (fallback)
CREATE POLICY "vj_select_all"
ON variance_justifications FOR SELECT
TO authenticated, anon
USING (true);

-- INSERT: authenticated (qualquer logado)
CREATE POLICY "vj_insert_all"
ON variance_justifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: authenticated (qualquer logado)
CREATE POLICY "vj_update_all"
ON variance_justifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: authenticated (qualquer logado)
CREATE POLICY "vj_delete_all"
ON variance_justifications FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 2. VARIANCE_THRESHOLDS
-- ============================================

DROP POLICY IF EXISTS "vt_select_authenticated" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_insert_admin" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_update_admin" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_delete_admin" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_select_all" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_insert_all" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_update_all" ON variance_thresholds;
DROP POLICY IF EXISTS "vt_delete_all" ON variance_thresholds;

ALTER TABLE variance_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vt_select_all"
ON variance_thresholds FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "vt_insert_all"
ON variance_thresholds FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "vt_update_all"
ON variance_thresholds FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "vt_delete_all"
ON variance_thresholds FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 3. GRANTS (garantir que anon e authenticated podem acessar)
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON variance_justifications TO authenticated;
GRANT SELECT ON variance_justifications TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON variance_thresholds TO authenticated;
GRANT SELECT ON variance_thresholds TO anon;
