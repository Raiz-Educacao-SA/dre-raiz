-- =====================================================
-- DESABILITAR RLS PARA TESTE
-- =====================================================
-- ⚠️ ATENÇÃO: Isso remove TODAS as restrições!
-- ⚠️ Executar apenas para TESTE
-- ⚠️ REABILITAR depois do teste
-- =====================================================

-- =====================================================
-- DESABILITAR RLS em transactions
-- =====================================================

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAR STATUS
-- =====================================================

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '🔴 HABILITADO' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE tablename = 'transactions';

-- ✅ Deve mostrar: DESABILITADO

-- =====================================================
-- AGORA TESTE NO NAVEGADOR:
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como Admin
-- 3. Abrir DRE Gerencial
-- 4. Aguardar...
--
-- ✅ Se carregar RÁPIDO: Problema é RLS
-- ❌ Se ainda ficar lento: Problema é outro
-- =====================================================
