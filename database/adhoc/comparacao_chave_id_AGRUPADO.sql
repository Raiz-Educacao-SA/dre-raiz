-- ============================================
-- COMPARAÇÃO COM AGRUPAMENTO: dre_fabric VS transactions
-- ============================================
-- Agrupa por chave_id e SOMA todos os valores
-- Versão atualizada: 2026-02-03
-- ============================================

-- ============================================
-- PARTE 1: ANÁLISE COMPARATIVA DETALHADA
-- ============================================

SELECT '📊 ANÁLISE COMPARATIVA COM AGRUPAMENTO' as relatorio;

WITH
-- Agrupar e somar valores do DRE_FABRIC
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    COUNT(*) as qtd_registros,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    STRING_AGG(DISTINCT complemento, ' | ') as descricoes
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
-- Agrupar e somar valores do TRANSACTIONS
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total,
    COUNT(*) as qtd_registros,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    STRING_AGG(DISTINCT description, ' | ') as descricoes
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
-- Comparação
comparacao AS (
  SELECT
    COALESCE(df.chave_id, t.chave_id) as chave_id,

    -- Valores SOMADOS
    ROUND(df.valor_total::NUMERIC, 2) as soma_dre_fabric,
    ROUND(t.amount_total::NUMERIC, 2) as soma_transactions,

    -- Diferença
    ROUND((t.amount_total - df.valor_total)::NUMERIC, 2) as diferenca_valor,

    -- Percentual de diferença
    CASE
      WHEN df.valor_total IS NOT NULL AND t.amount_total IS NOT NULL AND df.valor_total != 0 THEN
        ROUND(ABS((df.valor_total - t.amount_total) / df.valor_total) * 100, 2)
      ELSE NULL
    END as percentual_diferenca,

    -- Status
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

    -- Quantidades de registros
    df.qtd_registros as qtd_registros_df,
    t.qtd_registros as qtd_registros_t,

    -- Detalhes
    df.filiais as filiais_df,
    t.filiais as filiais_t,
    df.tipos as tipos_df,
    t.tipos as tipos_t,
    LEFT(df.descricoes, 50) as desc_df,
    LEFT(t.descricoes, 50) as desc_t

  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)
SELECT
  status,
  chave_id,
  soma_dre_fabric,
  soma_transactions,
  diferenca_valor,
  percentual_diferenca,
  qtd_registros_df,
  qtd_registros_t,
  filiais_df,
  tipos_df,
  desc_df
FROM comparacao
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(diferenca_valor, 0)) DESC
LIMIT 100;

-- ============================================
-- PARTE 2: RESUMO POR STATUS
-- ============================================

SELECT '📊 RESUMO POR STATUS' as relatorio;

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
),
comparacao AS (
  SELECT
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
    df.valor_total,
    t.amount_total,
    COALESCE(t.amount_total, 0) - COALESCE(df.valor_total, 0) as diferenca
  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)
SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual,
  ROUND(SUM(COALESCE(valor_total, 0))::NUMERIC, 2) as soma_dre_fabric,
  ROUND(SUM(COALESCE(amount_total, 0))::NUMERIC, 2) as soma_transactions,
  ROUND(SUM(diferenca)::NUMERIC, 2) as soma_diferencas
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

-- ============================================
-- PARTE 3: TOTAIS GERAIS
-- ============================================

SELECT '💰 TOTAIS GERAIS' as relatorio;

WITH
df_totais AS (
  SELECT
    COUNT(DISTINCT chave_id) as chaves_unicas,
    COUNT(*) as total_registros,
    SUM(valor) as soma_valores
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
),
t_totais AS (
  SELECT
    COUNT(DISTINCT chave_id) as chaves_unicas,
    COUNT(*) as total_registros,
    SUM(amount) as soma_valores
  FROM transactions
  WHERE chave_id IS NOT NULL
)
SELECT
  df.chaves_unicas as chaves_unicas_df,
  df.total_registros as registros_df,
  ROUND(df.soma_valores::NUMERIC, 2) as soma_valores_df,

  t.chaves_unicas as chaves_unicas_t,
  t.total_registros as registros_t,
  ROUND(t.soma_valores::NUMERIC, 2) as soma_valores_t,

  df.chaves_unicas - t.chaves_unicas as diferenca_chaves,
  ROUND((df.soma_valores - t.soma_valores)::NUMERIC, 2) as diferenca_valores
FROM df_totais df, t_totais t;

-- ============================================
-- PARTE 4: TOP 20 MAIORES DIFERENÇAS
-- ============================================

SELECT '💸 TOP 20 MAIORES DIFERENÇAS DE VALOR' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    COUNT(*) as qtd_registros,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT complemento, ' | ') as descricoes
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
)
SELECT
  df.chave_id,
  ROUND(df.valor_total::NUMERIC, 2) as soma_dre_fabric,
  ROUND(t.amount_total::NUMERIC, 2) as soma_transactions,
  ROUND((t.amount_total - df.valor_total)::NUMERIC, 2) as diferenca,
  ROUND(ABS((df.valor_total - t.amount_total) / NULLIF(df.valor_total, 0)) * 100, 2) as perc_diferenca,
  df.qtd_registros as qtd_reg_df,
  t.qtd_registros as qtd_reg_t,
  df.filiais,
  LEFT(df.descricoes, 60) as descricao
FROM dre_fabric_agrupado df
INNER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
WHERE ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2)
ORDER BY ABS(df.valor_total - t.amount_total) DESC
LIMIT 20;

-- ============================================
-- PARTE 5: TOP 20 QUE FALTAM EM TRANSACTIONS
-- ============================================

SELECT '❌ TOP 20 QUE FALTAM EM TRANSACTIONS' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    COUNT(*) as qtd_registros,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    STRING_AGG(DISTINCT complemento, ' | ') as descricoes
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  df.chave_id,
  ROUND(df.valor_total::NUMERIC, 2) as soma_valor,
  df.qtd_registros,
  df.filiais,
  df.tipos,
  LEFT(df.descricoes, 60) as descricao
FROM dre_fabric_agrupado df
LEFT JOIN transactions t ON df.chave_id = t.chave_id
WHERE t.chave_id IS NULL
ORDER BY ABS(df.valor_total) DESC
LIMIT 20;

-- ============================================
-- PARTE 6: TOP 20 EXTRAS EM TRANSACTIONS
-- ============================================

SELECT '🔍 TOP 20 EXTRAS EM TRANSACTIONS' as relatorio;

WITH
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total,
    COUNT(*) as qtd_registros,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    STRING_AGG(DISTINCT description, ' | ') as descricoes
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  t.chave_id,
  ROUND(t.amount_total::NUMERIC, 2) as soma_valor,
  t.qtd_registros,
  t.filiais,
  t.tipos,
  LEFT(t.descricoes, 60) as descricao
FROM transactions_agrupado t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE df.chave_id IS NULL
ORDER BY ABS(t.amount_total) DESC
LIMIT 20;

-- ============================================
-- PARTE 7: AÇÕES RECOMENDADAS
-- ============================================

SELECT '🎯 AÇÕES RECOMENDADAS' as relatorio;

WITH
dre_fabric_agrupado AS (
  SELECT chave_id, SUM(valor) as valor_total
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
transactions_agrupado AS (
  SELECT chave_id, SUM(amount) as amount_total
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
stats AS (
  SELECT
    COUNT(*) FILTER (WHERE df.chave_id IS NOT NULL AND t.chave_id IS NULL) as faltam,
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2)
    ) as diferentes,
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2)
    ) as ok
  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
)
SELECT
  CASE
    WHEN faltam > 0 THEN
      '1. 🔧 Sincronizar ' || faltam || ' registros que só existem no DRE_FABRIC'
    ELSE
      '1. ✅ Nenhum registro faltando'
  END as acao_1,
  CASE
    WHEN diferentes > 0 THEN
      '2. ⚠️ Atualizar ' || diferentes || ' registros com valores diferentes'
    ELSE
      '2. ✅ Todos os valores estão corretos'
  END as acao_2,
  CASE
    WHEN ok > 0 THEN
      '3. ✅ Manter ' || ok || ' registros que já estão corretos'
    ELSE
      '3. ⚠️ Nenhum registro correto encontrado'
  END as acao_3,
  CASE
    WHEN faltam > 0 OR diferentes > 0 THEN
      '4. 🔧 Total a corrigir: ' || (faltam + diferentes) || ' chaves'
    ELSE
      '4. 🎉 Tudo sincronizado perfeitamente!'
  END as acao_4
FROM stats;

-- ============================================
-- FIM
-- ============================================

SELECT '✅ ANÁLISE COMPLETA COM AGRUPAMENTO EXECUTADA!' as status;
