-- ============================================
-- COMPARAÇÃO FINAL: dre_fabric.chave_id VS transactions.chave_id
-- ============================================
-- Compara os IDs e valores entre as tabelas
-- CORRIGIDO: Usando chave_id em AMBAS as tabelas
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- ANÁLISE COMPARATIVA COMPLETA
-- ============================================

SELECT '📊 ANÁLISE COMPARATIVA DETALHADA' as relatorio;

WITH comparacao AS (
  SELECT
    -- IDs
    df.chave_id as id_fabric,
    t.chave_id as id_transactions,

    -- Valores
    df.valor as valor_fabric,
    t.amount as valor_transactions,

    -- Diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        ROUND((df.valor - t.amount)::NUMERIC, 2)
      ELSE NULL
    END as diferenca_valor,

    -- Percentual de diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL AND df.valor != 0 THEN
        ROUND(ABS((df.valor - t.amount) / df.valor) * 100, 2)
      ELSE NULL
    END as percentual_diferenca,

    -- Status
    CASE
      -- Existe em ambas com VALORES IGUAIS
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'

      -- Existe em ambas com VALORES DIFERENTES
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'

      -- Existe apenas em TRANSACTIONS
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        '3. SO TEM NA TRANSACTIONS'

      -- Existe apenas no FABRIC
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        '4. SO TEM NA DRE_FABRIC'

      ELSE '❓ OUTRO'
    END as status,

    -- Dados adicionais
    df.complemento as descricao_fabric,
    t.description as descricao_transactions,
    df.filial as filial_fabric,
    t.filial as filial_transactions,
    df.type as type_fabric,
    t.type as type_transactions

  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL
)
SELECT
  status,
  id_fabric,
  id_transactions,
  valor_fabric,
  valor_transactions,
  diferenca_valor,
  percentual_diferenca,
  LEFT(descricao_fabric, 30) as desc_fabric,
  LEFT(descricao_transactions, 30) as desc_transactions,
  filial_fabric,
  type_fabric,
  type_transactions
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
LIMIT 100;  -- Primeiros 100 registros (remova LIMIT para ver todos)

-- ============================================
-- RESUMO POR STATUS
-- ============================================

SELECT '📊 RESUMO POR STATUS' as relatorio;

WITH comparacao AS (
  SELECT
    CASE
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        '3. SO TEM NA TRANSACTIONS'
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        '4. SO TEM NA DRE_FABRIC'
      ELSE '❓ OUTRO'
    END as status,
    df.valor as valor_fabric,
    t.amount as valor_transactions,
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        df.valor - t.amount
      ELSE 0
    END as diferenca
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL
)
SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual,
  ROUND(SUM(COALESCE(valor_fabric, 0))::NUMERIC, 2) as soma_valor_fabric,
  ROUND(SUM(COALESCE(valor_transactions, 0))::NUMERIC, 2) as soma_valor_transactions,
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
-- TOTAIS GERAIS
-- ============================================

SELECT '💰 TOTAIS GERAIS' as relatorio;

SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as total_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_transactions,
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as diferenca_registros,

  ROUND((SELECT SUM(valor) FROM dre_fabric WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_fabric,
  ROUND((SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_transactions,
  ROUND((
    (SELECT SUM(valor) FROM dre_fabric WHERE chave_id IS NOT NULL) -
    (SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)
  )::NUMERIC, 2) as diferenca_valores;

-- ============================================
-- TOP 20 COM MAIOR DIFERENÇA DE VALOR
-- ============================================

SELECT '💸 TOP 20 COM MAIOR DIFERENÇA DE VALOR' as relatorio;

SELECT
  df.chave_id,
  df.valor as valor_fabric,
  t.amount as valor_transactions,
  ROUND((df.valor - t.amount)::NUMERIC, 2) as diferenca,
  ROUND(ABS((df.valor - t.amount) / NULLIF(df.valor, 0)) * 100, 2) as perc_diferenca,
  LEFT(df.complemento, 40) as descricao,
  df.filial,
  df.type
FROM dre_fabric df
INNER JOIN transactions t ON df.chave_id = t.chave_id
WHERE df.chave_id IS NOT NULL
  AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
ORDER BY ABS(df.valor - t.amount) DESC
LIMIT 20;

-- ============================================
-- TOP 20 QUE FALTAM EM TRANSACTIONS
-- ============================================

SELECT '❌ TOP 20 QUE FALTAM EM TRANSACTIONS' as relatorio;

SELECT
  df.chave_id,
  df.valor,
  LEFT(df.complemento, 40) as descricao,
  df.conta,
  df.filial,
  df.cia as marca,
  df.type,
  df.anomes
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave_id = t.chave_id
WHERE df.chave_id IS NOT NULL
  AND t.chave_id IS NULL
ORDER BY ABS(df.valor) DESC
LIMIT 20;

-- ============================================
-- TOP 20 EXTRAS EM TRANSACTIONS (se houver)
-- ============================================

SELECT '🔍 TOP 20 EXTRAS EM TRANSACTIONS (Não existem no Fabric)' as relatorio;

SELECT
  t.chave_id,
  t.amount as valor,
  LEFT(t.description, 40) as descricao,
  t.category,
  t.filial,
  t.marca,
  t.type,
  t.date
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE t.chave_id IS NOT NULL
  AND df.chave_id IS NULL
ORDER BY ABS(t.amount) DESC
LIMIT 20;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

SELECT '🔍 VERIFICAÇÃO DE INTEGRIDADE' as relatorio;

-- Duplicatas em transactions
SELECT
  'Duplicatas em transactions' as verificacao,
  COUNT(*) as total_chaves_duplicadas,
  COALESCE(SUM(qtd), 0) as total_registros_duplicados
FROM (
  SELECT chave_id, COUNT(*) as qtd
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
  HAVING COUNT(*) > 1
) dup;

-- Duplicatas em dre_fabric
SELECT
  'Duplicatas em dre_fabric' as verificacao,
  COUNT(*) as total_chaves_duplicadas,
  COALESCE(SUM(qtd), 0) as total_registros_duplicados
FROM (
  SELECT chave_id, COUNT(*) as qtd
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
  HAVING COUNT(*) > 1
) dup;

-- ============================================
-- DISTRIBUIÇÃO POR FILIAL (Faltantes)
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR FILIAL - REGISTROS FALTANTES' as relatorio;

SELECT
  df.filial,
  COUNT(*) as qtd_faltante,
  ROUND(SUM(df.valor)::NUMERIC, 2) as soma_valores,
  ROUND(COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM dre_fabric df2
    LEFT JOIN transactions t2 ON df2.chave_id = t2.chave_id
    WHERE df2.chave_id IS NOT NULL AND t2.chave_id IS NULL
  ), 2) as percentual_do_total_faltante
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave_id = t.chave_id
WHERE df.chave_id IS NOT NULL
  AND t.chave_id IS NULL
GROUP BY df.filial
ORDER BY qtd_faltante DESC
LIMIT 20;

-- ============================================
-- DISTRIBUIÇÃO POR TIPO (Faltantes)
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR TIPO - REGISTROS FALTANTES' as relatorio;

SELECT
  df.type,
  COUNT(*) as qtd_faltante,
  ROUND(SUM(df.valor)::NUMERIC, 2) as soma_valores,
  ROUND(COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM dre_fabric df2
    LEFT JOIN transactions t2 ON df2.chave_id = t2.chave_id
    WHERE df2.chave_id IS NOT NULL AND t2.chave_id IS NULL
  ), 2) as percentual_do_total_faltante
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave_id = t.chave_id
WHERE df.chave_id IS NOT NULL
  AND t.chave_id IS NULL
GROUP BY df.type
ORDER BY qtd_faltante DESC;

-- ============================================
-- AÇÕES RECOMENDADAS
-- ============================================

SELECT '🎯 AÇÕES RECOMENDADAS' as relatorio;

WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE df.chave_id IS NOT NULL AND t.chave_id IS NULL) as faltam,
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
    ) as diferentes,
    COUNT(*) FILTER (
      WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2)
    ) as ok
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
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
      '4. 🔧 Executar sincronização: SELECT * FROM sync_dre_fabric_to_transactions(NULL);'
    ELSE
      '4. 🎉 Tudo sincronizado perfeitamente!'
  END as acao_4
FROM stats;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT
  '✅ COMPARAÇÃO COMPLETA EXECUTADA!' as status,
  'Mapeamento: dre_fabric.chave_id = transactions.chave_id' as mapeamento,
  'Comparando chave_id e valores (dre_fabric.valor vs transactions.amount)' as comparacao;
