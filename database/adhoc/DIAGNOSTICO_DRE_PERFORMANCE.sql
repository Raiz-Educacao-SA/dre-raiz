-- =====================================================
-- DIAGNÓSTICO: Performance do DRE
-- =====================================================

-- 1. Ver quantos registros em cada tabela
SELECT 'transactions' as tabela, COUNT(*) as total FROM transactions
UNION ALL
SELECT 'transactions_orcado' as tabela, COUNT(*) as total FROM transactions_orcado
UNION ALL
SELECT 'transactions_ano_anterior' as tabela, COUNT(*) as total FROM transactions_ano_anterior;

-- 2. Ver distribuição por cenário em cada tabela
SELECT 'transactions' as tabela, scenario, COUNT(*) as total
FROM transactions
GROUP BY scenario
UNION ALL
SELECT 'transactions_orcado' as tabela, scenario, COUNT(*) as total
FROM transactions_orcado
GROUP BY scenario
UNION ALL
SELECT 'transactions_ano_anterior' as tabela, scenario, COUNT(*) as total
FROM transactions_ano_anterior
GROUP BY scenario
ORDER BY tabela, scenario;

-- 3. Ver índices existentes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('transactions', 'transactions_orcado', 'transactions_ano_anterior')
ORDER BY tablename, indexname;

-- 4. Testar query de UMA tabela apenas (transactions)
SELECT COUNT(*) as total_linhas
FROM (
  SELECT
    COALESCE(scenario, 'Real') as scenario,
    conta_contabil,
    substring(date::text, 1, 7) as year_month,
    tag01,
    tag02,
    tag03,
    type,
    SUM(amount) as total_amount,
    COUNT(*) as tx_count
  FROM transactions
  WHERE date::text >= '2026-01-01'
    AND date::text <= '2026-12-31'
  GROUP BY
    COALESCE(scenario, 'Real'),
    conta_contabil,
    substring(date::text, 1, 7),
    tag01, tag02, tag03, type
) as sub;

-- 5. Verificar se tabelas de cenários têm dados
SELECT
  'transactions_orcado' as tabela,
  MIN(date::text) as data_min,
  MAX(date::text) as data_max,
  COUNT(*) as total
FROM transactions_orcado
UNION ALL
SELECT
  'transactions_ano_anterior' as tabela,
  MIN(date::text) as data_min,
  MAX(date::text) as data_max,
  COUNT(*) as total
FROM transactions_ano_anterior;
