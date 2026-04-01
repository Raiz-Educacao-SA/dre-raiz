-- =====================================================
-- TESTE DEFINITIVO: Contar registros por usuário
-- =====================================================
-- Vai mostrar se RLS foi realmente removido
-- =====================================================

-- =====================================================
-- 1. STATUS GERAL
-- =====================================================

SELECT '=== STATUS GERAL ===' as etapa;

-- Políticas restantes
SELECT
  'Políticas RLS' as tipo,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA'
    ELSE '❌ AINDA EXISTEM'
  END as status
FROM pg_policies
WHERE schemaname = 'public';

-- Tabelas com RLS ativo
SELECT
  'Tabelas com RLS' as tipo,
  COUNT(*) as quantidade,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA'
    ELSE '❌ AINDA EXISTEM'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- =====================================================
-- 2. CONTAGEM TOTAL (sem usuário conectado)
-- =====================================================

SELECT '=== CONTAGEM TOTAL ===' as etapa;

SELECT
  COUNT(*) as total_registros,
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente,
  COUNT(DISTINCT marca) as total_marcas,
  COUNT(DISTINCT nome_filial) as total_filiais
FROM transactions;

-- ✅ Deve mostrar 125.631 registros
-- ✅ Deve mostrar TODAS as marcas/filiais

-- =====================================================
-- 3. AGRUPAR POR MARCA (teste de filtro)
-- =====================================================

SELECT '=== REGISTROS POR MARCA ===' as etapa;

SELECT
  marca,
  COUNT(*) as total_registros,
  COUNT(DISTINCT nome_filial) as filiais
FROM transactions
GROUP BY marca
ORDER BY marca;

-- ✅ Deve mostrar TODAS as marcas
-- Se aparecer só 1 marca = ainda está filtrado

-- =====================================================
-- 4. TESTE ESPECÍFICO: Usuário normal vê tudo?
-- =====================================================

SELECT '=== TESTE RPC get_dre_summary ===' as etapa;

SELECT
  scenario,
  COUNT(DISTINCT tag01) as total_tags,
  COUNT(DISTINCT conta_contabil) as total_contas,
  SUM(tx_count) as total_transacoes,
  SUM(total_amount) as valor_total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario
ORDER BY scenario;

-- ✅ Deve mostrar dados de TODOS os cenários
-- ✅ Valores devem ser grandes (milhões)
-- Se valores pequenos = ainda filtrado

-- =====================================================
-- 5. VERIFICAR SE HÁ FUNÇÃO get_user_permissions
-- =====================================================

SELECT '=== FUNÇÕES DE PERMISSÃO ===' as etapa;

SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name ILIKE '%permission%'
    OR routine_name ILIKE '%user%'
    OR routine_name ILIKE '%filter%'
  )
ORDER BY routine_name;

-- Se aparecer função get_user_permissions = pode estar filtrando

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ 0 políticas RLS
-- ✅ 0 tabelas com RLS ativo
-- ✅ 125.631 registros visíveis
-- ✅ Múltiplas marcas visíveis (RAIZ, SABIN, etc)
-- ✅ Valores grandes (milhões)
-- =====================================================
