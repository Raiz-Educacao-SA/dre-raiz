-- ============================================================
-- COMPARAÇÃO COMPLETA: DRE_FABRIC vs TRANSACTIONS
-- ============================================================
-- Gera as 4 classificações com agrupamento por chave_id
-- Data: 2026-02-04
-- ============================================================

-- ============================================================
-- PARTE 1: RESUMO POR STATUS
-- ============================================================

SELECT '📊 RESUMO POR STATUS' as relatorio;

WITH
-- Agrupar e somar valores do DRE_FABRIC por chave_id
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    COUNT(*) as qtd_registros
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
-- Agrupar e somar valores do TRANSACTIONS por chave_id
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total,
    COUNT(*) as qtd_registros
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
-- Comparação com as 4 classificações
comparacao AS (
  SELECT
    COALESCE(df.chave_id, t.chave_id) as chave_id,
    ROUND(df.valor_total::NUMERIC, 2) as soma_dre_fabric,
    ROUND(t.amount_total::NUMERIC, 2) as soma_transactions,
    ROUND((COALESCE(t.amount_total, 0) - COALESCE(df.valor_total, 0))::NUMERIC, 2) as diferenca,

    -- As 4 classificações
    CASE
      -- 1. Existe em ambas com valores IGUAIS
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2) THEN
        '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'

      -- 2. Existe em ambas com valores DIFERENTES
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2) THEN
        '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'

      -- 3. Existe APENAS no TRANSACTIONS
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        '3. SO TEM NA TRANSACTIONS'

      -- 4. Existe APENAS no DRE_FABRIC
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        '4. SO TEM NA DRE_FABRIC'

      ELSE '❓ OUTRO'
    END as status,

    df.qtd_registros as qtd_reg_dre,
    t.qtd_registros as qtd_reg_trans

  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)

-- Resumo consolidado
SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual,
  ROUND(SUM(COALESCE(soma_dre_fabric, 0))::NUMERIC, 2) as total_dre_fabric,
  ROUND(SUM(COALESCE(soma_transactions, 0))::NUMERIC, 2) as total_transactions,
  ROUND(SUM(COALESCE(diferenca, 0))::NUMERIC, 2) as diferenca_total
FROM comparacao
GROUP BY status
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END;

-- ============================================================
-- PARTE 2: DETALHES - PRIMEIROS 20 DE CADA STATUS
-- ============================================================

SELECT '📋 AMOSTRA: Primeiros 20 registros' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    COUNT(*) as qtd_registros
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total,
    COUNT(*) as qtd_registros
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
comparacao AS (
  SELECT
    COALESCE(df.chave_id, t.chave_id) as chave_id,
    ROUND(df.valor_total::NUMERIC, 2) as soma_dre_fabric,
    ROUND(t.amount_total::NUMERIC, 2) as soma_transactions,
    ROUND((COALESCE(t.amount_total, 0) - COALESCE(df.valor_total, 0))::NUMERIC, 2) as diferenca,
    CASE
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2) THEN
        '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2) THEN
        '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        '3. SO TEM NA TRANSACTIONS'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        '4. SO TEM NA DRE_FABRIC'
      ELSE '❓ OUTRO'
    END as status,
    df.qtd_registros as qtd_reg_dre,
    t.qtd_registros as qtd_reg_trans
  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)
SELECT
  status,
  chave_id,
  soma_dre_fabric,
  soma_transactions,
  diferenca,
  qtd_reg_dre,
  qtd_reg_trans
FROM comparacao
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(diferenca, 0)) DESC
LIMIT 20;

-- ============================================================
-- PARTE 3: TOP 10 MAIORES DIFERENÇAS (STATUS 2)
-- ============================================================

SELECT '💸 TOP 10 MAIORES DIFERENÇAS' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  df.chave_id,
  ROUND(df.valor_total::NUMERIC, 2) as dre_fabric,
  ROUND(t.amount_total::NUMERIC, 2) as transactions,
  ROUND((t.amount_total - df.valor_total)::NUMERIC, 2) as diferenca,
  ROUND(ABS((t.amount_total - df.valor_total) / NULLIF(df.valor_total, 0)) * 100, 2) as perc_diferenca
FROM dre_fabric_agrupado df
INNER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
WHERE ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2)
ORDER BY ABS(t.amount_total - df.valor_total) DESC
LIMIT 10;

-- ============================================================
-- PARTE 4: TOP 10 QUE FALTAM NO TRANSACTIONS (STATUS 4)
-- ============================================================

SELECT '❌ TOP 10 QUE FALTAM NO TRANSACTIONS' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  df.chave_id,
  ROUND(df.valor_total::NUMERIC, 2) as valor_dre_fabric
FROM dre_fabric_agrupado df
LEFT JOIN transactions t ON df.chave_id = t.chave_id
WHERE t.chave_id IS NULL
ORDER BY ABS(df.valor_total) DESC
LIMIT 10;

-- ============================================================
-- PARTE 5: TOP 10 EXTRAS NO TRANSACTIONS (STATUS 3)
-- ============================================================

SELECT '🔍 TOP 10 EXTRAS NO TRANSACTIONS' as relatorio;

WITH
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  t.chave_id,
  ROUND(t.amount_total::NUMERIC, 2) as valor_transactions
FROM transactions_agrupado t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE df.chave_id IS NULL
ORDER BY ABS(t.amount_total) DESC
LIMIT 10;

-- ============================================================
-- PARTE 6: TOTAIS GERAIS
-- ============================================================

SELECT '💰 TOTAIS GERAIS' as relatorio;

SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE chave_id IS NOT NULL) as chaves_unicas_dre,
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as chaves_unicas_trans,
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as total_registros_dre,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_registros_trans,
  ROUND((SELECT SUM(valor) FROM dre_fabric WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_valores_dre,
  ROUND((SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_valores_trans;

-- ============================================================
-- PARTE 7: AÇÕES RECOMENDADAS
-- ============================================================

SELECT '🎯 AÇÕES RECOMENDADAS' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT chave_id, SUM(valor) as valor_total
  FROM dre_fabric WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
transactions_agrupado AS (
  SELECT chave_id, SUM(amount) as amount_total
  FROM transactions WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
stats AS (
  SELECT
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2)
    ) as ok,
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2)
    ) as diferentes,
    COUNT(*) FILTER (WHERE df.chave_id IS NULL AND t.chave_id IS NOT NULL) as extras,
    COUNT(*) FILTER (WHERE df.chave_id IS NOT NULL AND t.chave_id IS NULL) as faltam,
    COUNT(*) as total
  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)
SELECT
  ok as registros_ok,
  diferentes as com_valores_diferentes,
  faltam as faltam_no_transactions,
  extras as extras_no_transactions,
  total as total_chaves_unicas,
  ROUND(ok::NUMERIC / NULLIF(total, 0) * 100, 2) as percentual_ok,
  CASE
    WHEN faltam > 0 THEN '1. 🔧 Sincronizar ' || faltam || ' chaves que só existem no DRE_FABRIC'
    ELSE '1. ✅ Nenhuma chave faltando'
  END as acao_1,
  CASE
    WHEN diferentes > 0 THEN '2. ⚠️ Atualizar ' || diferentes || ' chaves com valores diferentes'
    ELSE '2. ✅ Todos os valores estão corretos'
  END as acao_2,
  CASE
    WHEN extras > 0 THEN '3. 🔍 Revisar ' || extras || ' chaves extras no TRANSACTIONS'
    ELSE '3. ✅ Nenhuma chave extra'
  END as acao_3
FROM stats;

-- ============================================================
-- FIM DA COMPARAÇÃO
-- ============================================================

SELECT '✅ COMPARAÇÃO COMPLETA EXECUTADA!' as status;
