-- =====================================================
-- VALIDAÇÃO COMPLETA - Testar todas as correções
-- =====================================================

-- =====================================================
-- TESTE 1: Verificar índices em tag0_map
-- =====================================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tag0_map'
ORDER BY indexname;

-- ✅ Deve aparecer: idx_tag0_map_tag1_norm_lower

-- =====================================================
-- TESTE 2: Verificar RLS nas tabelas
-- =====================================================

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '🔴 HABILITADO' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'transactions%'
ORDER BY tablename;

-- ✅ transactions → HABILITADO (OK, queremos filtrar)
-- ✅ transactions_orcado → DESABILITADO (OK, sem filtro)
-- ✅ transactions_ano_anterior → DESABILITADO (OK, sem filtro)

-- =====================================================
-- TESTE 3: Testar performance da DRE Summary
-- =====================================================

-- Medir tempo de execução
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  scenario,
  year_month,
  tag0,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month, tag0
ORDER BY scenario, year_month;

-- ✅ Execution Time deve ser < 5 segundos
-- ✅ Deve usar índice idx_tag0_map_tag1_norm_lower

-- =====================================================
-- TESTE 4: Testar UNION das 3 tabelas
-- =====================================================

SELECT
  'transactions' as origem,
  COUNT(*) as total_registros,
  SUM(amount) as total_valor
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-12-31'

UNION ALL

SELECT
  'transactions_orcado' as origem,
  COUNT(*) as total_registros,
  SUM(amount) as total_valor
FROM transactions_orcado
WHERE date >= '2026-01-01' AND date <= '2026-12-31'

UNION ALL

SELECT
  'transactions_ano_anterior' as origem,
  COUNT(*) as total_registros,
  SUM(amount) as total_valor
FROM transactions_ano_anterior
WHERE date >= '2026-01-01' AND date <= '2026-12-31';

-- ✅ Deve retornar dados das 3 tabelas (sem erro)
-- ✅ Se alguma tabela retornar 0, verificar se há dados lá

-- =====================================================
-- TESTE 5: Testar query simples em cada tabela
-- =====================================================

-- Transactions (principal)
SELECT COUNT(*) as total_transactions FROM transactions;

-- Transactions Orçado
SELECT COUNT(*) as total_orcado FROM transactions_orcado;

-- Transactions Ano Anterior
SELECT COUNT(*) as total_ano_anterior FROM transactions_ano_anterior;

-- ✅ Nenhuma deve dar erro de RLS

-- =====================================================
-- TESTE 6: Testar filtros da DRE (com permissões)
-- =====================================================

-- Simular usuário com permissões restritas
SET ROLE authenticated;

SELECT
  scenario,
  year_month,
  COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- ✅ Deve retornar dados de TODOS os cenários
-- ✅ Não deve filtrar por RLS (RLS desabilitado em cenários)

-- Voltar ao role normal
RESET ROLE;

-- =====================================================
-- TESTE 7: Verificar plan da query com JOIN
-- =====================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  t.tag01,
  tm.tag0,
  COUNT(*) as total
FROM transactions t
LEFT JOIN tag0_map tm
  ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.date >= '2026-01-01'
  AND t.date <= '2026-12-31'
GROUP BY t.tag01, tm.tag0
LIMIT 10;

-- ✅ Deve usar "Index Scan using idx_tag0_map_tag1_norm_lower"
-- ✅ NÃO deve aparecer "Seq Scan on tag0_map"

-- =====================================================
-- RESULTADO ESPERADO FINAL
-- =====================================================
-- ✅ Todos os índices criados
-- ✅ RLS desabilitado em tabelas de cenários
-- ✅ UNION funciona sem erro
-- ✅ DRE Summary executa em < 5 segundos
-- ✅ JOIN usa índice (não full table scan)
-- =====================================================

-- =====================================================
-- PRÓXIMO PASSO: Testar no navegador
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R) no navegador
-- 2. Abrir DRE Gerencial
-- 3. Selecionar período (2026-01 a 2026-12)
-- 4. Aguardar carregamento (deve ser < 10 segundos)
-- 5. Ir na guia Lançamentos
-- 6. Clicar "Buscar Dados" (deve ser rápido)
-- 7. (OPCIONAL) Clicar "Buscar Tudo" (vai demorar mais, mas não deve travar)
-- =====================================================
