-- =====================================================
-- VERIFICAR SE RLS FOI REALMENTE DESABILITADO
-- =====================================================

-- =====================================================
-- IMPORTANTE: O que importa é rowsecurity = FALSE
-- As políticas podem aparecer em pg_policies mas não
-- são aplicadas se rowsecurity = false
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SE RLS ESTÁ DESABILITADO (O QUE IMPORTA!)
-- =====================================================

SELECT
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity THEN '❌ RLS ATIVO (ainda filtra)'
    ELSE '✅ RLS DESABILITADO (não filtra)'
  END as status_real
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions'
  )
ORDER BY tablename;

-- ✅ TODAS devem ter rowsecurity = FALSE
-- Se alguma tiver TRUE, o RLS ainda está ativo!

-- =====================================================
-- 2. CONTAR REGISTROS VISÍVEIS (SEM FILTRO RLS)
-- =====================================================

-- Se RLS foi desabilitado, deve ver TODOS os registros
SELECT COUNT(*) as total_visivel_agora FROM transactions;

-- ✅ Deve retornar 125.631 (todos os registros)
-- ❌ Se retornar menos: RLS ainda está ativo OU há filtro no código

-- =====================================================
-- 3. TESTAR QUERY DRE (sem filtro)
-- =====================================================

SELECT
  scenario,
  year_month,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- ✅ Deve retornar dados de TODOS os cenários
-- ✅ Deve executar rápido (< 2 segundos)

-- =====================================================
-- 4. SE AINDA HOUVER FILTRO: Remover políticas
-- =====================================================

-- Se rowsecurity = FALSE mas ainda há filtro,
-- vamos REMOVER as políticas completamente:

-- Listar políticas de transactions
SELECT policyname
FROM pg_policies
WHERE tablename = 'transactions';

-- Para remover todas (use os nomes retornados acima):
-- DROP POLICY IF EXISTS "nome_da_politica_1" ON transactions;
-- DROP POLICY IF EXISTS "nome_da_politica_2" ON transactions;
-- ... etc

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- rowsecurity = FALSE em todas as tabelas
-- COUNT(*) = 125.631
-- get_dre_summary retorna dados rapidamente
-- =====================================================
