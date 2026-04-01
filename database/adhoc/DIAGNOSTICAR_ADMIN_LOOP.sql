-- =====================================================
-- DIAGNÓSTICO: Por que Admin fica em LOOP
-- =====================================================
-- Problema: Usuário carrega em 7s, Admin fica em loop
-- Hipótese: Admin SEM filtros RLS carrega TODOS os dados
-- =====================================================

-- =====================================================
-- TESTE 1: Ver quantos dados o Admin vê (SEM filtros)
-- =====================================================

-- Contar TOTAL de registros (sem filtro RLS)
SELECT COUNT(*) as total_sem_filtro FROM transactions;

-- Contar por ano
SELECT
  SUBSTRING(date::text, 1, 4) as ano,
  COUNT(*) as registros
FROM transactions
GROUP BY SUBSTRING(date::text, 1, 4)
ORDER BY ano DESC;

-- =====================================================
-- TESTE 2: Simular query do Admin (PIOR CASO)
-- =====================================================

-- Query que o Admin executa (sem filtros RLS)
-- Timeout configurado para 30 segundos
SET statement_timeout = '30s';

EXPLAIN ANALYZE
SELECT
  scenario,
  conta_contabil,
  year_month,
  tag0,
  tag01,
  tag02,
  tag03,
  tipo,
  total_amount,
  tx_count
FROM get_dre_summary('2026-01', '2026-12')
LIMIT 100;

-- Se der ERRO: timeout expired → query demora > 30s
-- Se der OK: verificar "Execution Time"

-- =====================================================
-- TESTE 3: Ver tamanho do resultado agregado
-- =====================================================

SELECT
  scenario,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total_valor
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario;

-- ✅ Se retornar rápido: agregação está OK
-- ❌ Se demorar > 30s: agregação é o problema

-- =====================================================
-- TESTE 4: Verificar se RLS está aplicado ao Admin
-- =====================================================

-- Ver role do usuário atual
SELECT current_user, current_role;

-- Ver se há políticas RLS ativas
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  CASE WHEN qual IS NOT NULL THEN 'Tem filtro' ELSE 'Sem filtro' END as tem_filtro
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- =====================================================
-- TESTE 5: Testar query com LIMIT (para Admin)
-- =====================================================

-- Query limitada (apenas últimos 3 meses)
SELECT
  scenario,
  year_month,
  COUNT(*) as linhas
FROM get_dre_summary('2026-10', '2026-12')  -- Apenas 3 meses
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- ✅ Se carregar rápido: problema é volume de dados
-- ❌ Se ainda demorar: problema é outra coisa

-- =====================================================
-- TESTE 6: Ver se há queries travadas
-- =====================================================

SELECT
  pid,
  usename,
  state,
  query_start,
  NOW() - query_start as duracao,
  LEFT(query, 100) as query_inicio
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- Se aparecer query com duração > 30s:
-- SELECT pg_cancel_backend(PID);  -- Cancelar query

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Se TESTE 2 der timeout → Admin precisa de cache ou limite
-- Se TESTE 3 demorar → Agregação é o problema
-- Se TESTE 5 funcionar → Limitar período padrão do Admin
-- =====================================================
