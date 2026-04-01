-- ================================================================================
-- DIAGNÓSTICO DE CONTAGEM DE REGISTROS
-- ================================================================================
-- Este script investiga a diferença entre as contagens esperadas e reais
-- ================================================================================

SELECT '📊 CONTAGEM BÁSICA DE REGISTROS' as secao;

-- Contagem total em cada tabela
SELECT
  'dre_fabric' as tabela,
  COUNT(*) as total_registros,
  COUNT(chave_id) as total_com_chave_id,
  COUNT(*) - COUNT(chave_id) as total_sem_chave_id,
  COUNT(DISTINCT chave_id) as chaves_unicas
FROM dre_fabric;

SELECT
  'transactions' as tabela,
  COUNT(*) as total_registros,
  COUNT(chave_id) as total_com_chave_id,
  COUNT(*) - COUNT(chave_id) as total_sem_chave_id,
  COUNT(DISTINCT chave_id) as chaves_unicas
FROM transactions;

-- ================================================================================
-- VERIFICAR DUPLICATAS
-- ================================================================================

SELECT '🔍 VERIFICANDO DUPLICATAS EM DRE_FABRIC' as secao;

SELECT
  'dre_fabric' as tabela,
  COUNT(*) as total_chaves_duplicadas,
  SUM(qtd) as total_registros_duplicados,
  SUM(qtd) - COUNT(*) as registros_extras
FROM (
  SELECT chave_id, COUNT(*) as qtd
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
  HAVING COUNT(*) > 1
) dup;

-- Top 10 chaves mais duplicadas no dre_fabric
SELECT
  chave_id,
  COUNT(*) as vezes_duplicada,
  STRING_AGG(DISTINCT filial, ', ') as filiais,
  STRING_AGG(DISTINCT type, ', ') as tipos
FROM dre_fabric
WHERE chave_id IS NOT NULL
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

SELECT '🔍 VERIFICANDO DUPLICATAS EM TRANSACTIONS' as secao;

SELECT
  'transactions' as tabela,
  COUNT(*) as total_chaves_duplicadas,
  SUM(qtd) as total_registros_duplicados,
  SUM(qtd) - COUNT(*) as registros_extras
FROM (
  SELECT chave_id, COUNT(*) as qtd
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
  HAVING COUNT(*) > 1
) dup;

-- Top 10 chaves mais duplicadas no transactions
SELECT
  chave_id,
  COUNT(*) as vezes_duplicada,
  STRING_AGG(DISTINCT filial, ', ') as filiais,
  STRING_AGG(DISTINCT type, ', ') as tipos
FROM transactions
WHERE chave_id IS NOT NULL
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ================================================================================
-- CONTAGEM DO FULL OUTER JOIN
-- ================================================================================

SELECT '🔗 CONTAGEM COM FULL OUTER JOIN (ATUAL)' as secao;

-- Contagem como está sendo feita atualmente
SELECT
  COUNT(*) as total_registros_join,
  COUNT(DISTINCT COALESCE(df.chave_id, t.chave_id)) as chaves_unicas_join,
  COUNT(*) - COUNT(DISTINCT COALESCE(df.chave_id, t.chave_id)) as diferenca
FROM dre_fabric df
FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL;

-- ================================================================================
-- ANÁLISE DETALHADA DA DIFERENÇA
-- ================================================================================

SELECT '📈 ANÁLISE DETALHADA' as secao;

WITH contagens AS (
  SELECT
    -- Contagem no dre_fabric
    (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE chave_id IS NOT NULL) as df_chaves_unicas,
    (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as df_total,

    -- Contagem no transactions
    (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as t_chaves_unicas,
    (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as t_total,

    -- Contagem do FULL OUTER JOIN
    (SELECT COUNT(*)
     FROM dre_fabric df
     FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
     WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL) as join_total,

    -- Chaves únicas no join
    (SELECT COUNT(DISTINCT COALESCE(df.chave_id, t.chave_id))
     FROM dre_fabric df
     FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
     WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL) as join_chaves_unicas
)
SELECT
  df_total as registros_dre_fabric,
  df_chaves_unicas as chaves_unicas_df,
  df_total - df_chaves_unicas as duplicatas_df,

  t_total as registros_transactions,
  t_chaves_unicas as chaves_unicas_t,
  t_total - t_chaves_unicas as duplicatas_t,

  join_total as total_no_join,
  join_chaves_unicas as chaves_unicas_join,

  -- Análise da diferença
  join_total - df_total as diferenca_vs_df,
  join_total - t_total as diferenca_vs_transactions,

  CASE
    WHEN join_total = df_total + t_total - join_chaves_unicas THEN '✅ Esperado com duplicatas'
    WHEN join_total > df_total THEN '⚠️ Há registros extras (duplicatas ou extras no TRANSACTIONS)'
    ELSE '❓ Verificar lógica'
  END as diagnostico
FROM contagens;

-- ================================================================================
-- REGISTROS EXTRAS NO TRANSACTIONS
-- ================================================================================

SELECT '🔍 REGISTROS QUE SÓ EXISTEM NO TRANSACTIONS' as secao;

SELECT
  COUNT(*) as registros_so_transactions,
  COUNT(DISTINCT t.chave_id) as chaves_unicas_so_transactions
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE t.chave_id IS NOT NULL
  AND df.chave_id IS NULL;

-- Exemplo dos primeiros 10
SELECT
  t.chave_id,
  t.amount,
  t.filial,
  t.type
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
WHERE t.chave_id IS NOT NULL
  AND df.chave_id IS NULL
LIMIT 10;

-- ================================================================================
-- ANÁLISE POR STATUS (COMO DEVERIA SER)
-- ================================================================================

SELECT '📊 DISTRIBUIÇÃO CORRETA (SEM DUPLICATAS)' as secao;

WITH comparacao_unica AS (
  SELECT DISTINCT ON (COALESCE(df.chave_id, t.chave_id))
    COALESCE(df.chave_id, t.chave_id) as chave_id,
    df.valor,
    t.amount,
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
    END as status
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL
  ORDER BY COALESCE(df.chave_id, t.chave_id), df.valor DESC NULLS LAST
)
SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM comparacao_unica
GROUP BY status
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END;

-- ================================================================================
-- RECOMENDAÇÃO
-- ================================================================================

SELECT '💡 RECOMENDAÇÃO' as secao;

WITH analise AS (
  SELECT
    (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as df_total,
    (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE chave_id IS NOT NULL) as df_unicas,
    (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as t_total,
    (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as t_unicas
)
SELECT
  CASE
    WHEN df_total > df_unicas OR t_total > t_unicas THEN
      '⚠️ HÁ DUPLICATAS: Use DISTINCT ON ou GROUP BY para eliminar duplicatas'
    ELSE
      '✅ Sem duplicatas: A lógica atual está correta'
  END as recomendacao,

  df_total - df_unicas as duplicatas_df,
  t_total - t_unicas as duplicatas_transactions,

  CASE
    WHEN df_total > df_unicas THEN
      'Corrigir: Use SELECT DISTINCT ON (chave_id) ou GROUP BY chave_id no dre_fabric'
    ELSE
      'OK: Sem duplicatas no dre_fabric'
  END as acao_df,

  CASE
    WHEN t_total > t_unicas THEN
      'Corrigir: Use SELECT DISTINCT ON (chave_id) ou GROUP BY chave_id no transactions'
    ELSE
      'OK: Sem duplicatas no transactions'
  END as acao_transactions
FROM analise;

-- ================================================================================
-- FIM DO DIAGNÓSTICO
-- ================================================================================

SELECT '✅ DIAGNÓSTICO CONCLUÍDO!' as status;
