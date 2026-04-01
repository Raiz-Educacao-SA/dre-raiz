-- =====================================================
-- LISTAR TODAS AS POLÍTICAS RLS
-- =====================================================

-- =====================================================
-- 1. TABELAS COM RLS HABILITADO
-- =====================================================

SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '🔴 HABILITADO' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- =====================================================
-- 2. TODAS AS POLÍTICAS RLS (DETALHADO)
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as condicao_filtro
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. CONTAR POLÍTICAS POR TABELA
-- =====================================================

SELECT
  tablename,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY total_politicas DESC, tablename;

-- =====================================================
-- 4. VER SE TRANSACTIONS TEM RLS
-- =====================================================

SELECT
  tablename,
  rowsecurity as rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'transactions_orcado', 'transactions_ano_anterior', 'users', 'permissions')
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Vai mostrar TODAS as tabelas e políticas RLS
-- Se RLS ainda está ativo após DISABLE, algo está errado
-- Pode ter múltiplas políticas que precisam ser removidas
-- =====================================================
