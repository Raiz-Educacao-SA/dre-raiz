-- ============================================
-- COMPARAÇÃO CORRIGIDA: dre_fabric.chave VS transactions.chave_id
-- ============================================
-- Compara os IDs e valores entre as tabelas
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- VERIFICAR NOME DAS COLUNAS
-- ============================================

SELECT '🔍 VERIFICAR COLUNAS EXISTENTES' as info;

-- Ver colunas do dre_fabric
SELECT
  'dre_fabric' as tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name IN ('chave', 'chave_id')
ORDER BY column_name;

-- Ver colunas do transactions
SELECT
  'transactions' as tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('chave', 'chave_id')
ORDER BY column_name;

-- ============================================
-- ANÁLISE COMPARATIVA COMPLETA
-- ============================================
-- IMPORTANTE: Ajuste df.chave para df.chave_id se necessário!

SELECT '📊 ANÁLISE COMPARATIVA DETALHADA' as relatorio;

WITH comparacao AS (
  SELECT
    -- IDs
    df.chave as id_fabric,           -- ⚠️ AJUSTE: Se a coluna for chave_id, mude para df.chave_id
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
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        '✅ OK'

      -- Existe em ambas com VALORES DIFERENTES
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        '⚠️ VALOR DIFERENTE'

      -- Existe apenas no FABRIC
      WHEN df.chave IS NOT NULL AND t.chave_id IS NULL THEN
        '❌ FALTA EM TRANSACTIONS'

      -- Existe apenas em TRANSACTIONS
      WHEN df.chave IS NULL AND t.chave_id IS NOT NULL THEN
        '🔍 EXTRA EM TRANSACTIONS'

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
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id  -- ⚠️ AJUSTE: Se for chave_id, mude aqui também
  WHERE df.chave IS NOT NULL OR t.chave_id IS NOT NULL
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
    WHEN '❌ FALTA EM TRANSACTIONS' THEN 1
    WHEN '⚠️ VALOR DIFERENTE' THEN 2
    WHEN '✅ OK' THEN 3
    WHEN '🔍 EXTRA EM TRANSACTIONS' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(diferenca_valor, 0)) DESC
LIMIT 100;  -- Limitar para não sobrecarregar (remova o LIMIT se quiser ver tudo)

-- ============================================
-- RESUMO POR STATUS
-- ============================================

SELECT '📊 RESUMO POR STATUS' as relatorio;

WITH comparacao AS (
  SELECT
    CASE
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        '✅ OK'
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        '⚠️ VALOR DIFERENTE'
      WHEN df.chave IS NOT NULL AND t.chave_id IS NULL THEN
        '❌ FALTA EM TRANSACTIONS'
      WHEN df.chave IS NULL AND t.chave_id IS NOT NULL THEN
        '🔍 EXTRA EM TRANSACTIONS'
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
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id  -- ⚠️ AJUSTE aqui também
  WHERE df.chave IS NOT NULL OR t.chave_id IS NOT NULL
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
    WHEN '❌ FALTA EM TRANSACTIONS' THEN 1
    WHEN '⚠️ VALOR DIFERENTE' THEN 2
    WHEN '✅ OK' THEN 3
    WHEN '🔍 EXTRA EM TRANSACTIONS' THEN 4
    ELSE 5
  END;

-- ============================================
-- TOTAIS GERAIS
-- ============================================

SELECT '💰 TOTAIS GERAIS' as relatorio;

SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL) as total_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_transactions,
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as diferenca_registros,

  ROUND((SELECT SUM(valor) FROM dre_fabric WHERE chave IS NOT NULL)::NUMERIC, 2) as soma_fabric,
  ROUND((SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_transactions,
  ROUND((
    (SELECT SUM(valor) FROM dre_fabric WHERE chave IS NOT NULL) -
    (SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)
  )::NUMERIC, 2) as diferenca_valores;

-- ============================================
-- TOP 20 COM MAIOR DIFERENÇA DE VALOR
-- ============================================

SELECT '💸 TOP 20 COM MAIOR DIFERENÇA DE VALOR' as relatorio;

SELECT
  df.chave as chave_id,
  df.valor as valor_fabric,
  t.amount as valor_transactions,
  ROUND((df.valor - t.amount)::NUMERIC, 2) as diferenca,
  ROUND(ABS((df.valor - t.amount) / NULLIF(df.valor, 0)) * 100, 2) as perc_diferenca,
  LEFT(df.complemento, 40) as descricao,
  df.filial,
  df.type
FROM dre_fabric df
INNER JOIN transactions t ON df.chave = t.chave_id  -- ⚠️ AJUSTE aqui também
WHERE df.chave IS NOT NULL
  AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
ORDER BY ABS(df.valor - t.amount) DESC
LIMIT 20;

-- ============================================
-- TOP 20 QUE FALTAM EM TRANSACTIONS
-- ============================================

SELECT '❌ TOP 20 QUE FALTAM EM TRANSACTIONS' as relatorio;

SELECT
  df.chave as chave_id,
  df.valor,
  LEFT(df.complemento, 40) as descricao,
  df.conta,
  df.filial,
  df.cia as marca,
  df.type,
  df.anomes
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave = t.chave_id  -- ⚠️ AJUSTE aqui também
WHERE df.chave IS NOT NULL
  AND t.chave_id IS NULL
ORDER BY ABS(df.valor) DESC
LIMIT 20;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

SELECT '🔍 VERIFICAÇÃO DE INTEGRIDADE' as relatorio;

-- Verificar se há chave_id duplicado em transactions
SELECT
  'Duplicatas em transactions' as verificacao,
  COUNT(*) as total_duplicatas
FROM (
  SELECT chave_id, COUNT(*) as qtd
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
  HAVING COUNT(*) > 1
) dup;

-- Verificar se há chave duplicado em dre_fabric
SELECT
  'Duplicatas em dre_fabric' as verificacao,
  COUNT(*) as total_duplicatas
FROM (
  SELECT chave, COUNT(*) as qtd
  FROM dre_fabric
  WHERE chave IS NOT NULL
  GROUP BY chave
  HAVING COUNT(*) > 1
) dup;

-- ============================================
-- AÇÕES RECOMENDADAS
-- ============================================

SELECT '🎯 AÇÕES RECOMENDADAS' as relatorio;

WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE df.chave IS NOT NULL AND t.chave_id IS NULL) as faltam,
    COUNT(*) FILTER (
      WHERE df.chave IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
    ) as diferentes
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id  -- ⚠️ AJUSTE aqui também
)
SELECT
  CASE
    WHEN faltam > 0 THEN
      '1. ❌ Sincronizar ' || faltam || ' registros faltantes'
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
    WHEN faltam > 0 OR diferentes > 0 THEN
      '3. 🔧 Executar: SELECT * FROM sync_dre_fabric_to_transactions(NULL);'
    ELSE
      '3. ✅ Tudo sincronizado!'
  END as acao_3
FROM stats;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT
  '✅ COMPARAÇÃO COMPLETA!' as status,
  'Baseado em dre_fabric.chave = transactions.chave_id' as mapeamento;

-- ============================================
-- OBSERVAÇÃO IMPORTANTE
-- ============================================

/*
⚠️ ATENÇÃO:

Esta query assume que:
- dre_fabric.chave = transactions.chave_id

Se no seu dre_fabric a coluna se chama CHAVE_ID (não CHAVE):
→ Substitua todas as ocorrências de "df.chave" por "df.chave_id"
→ Use Find & Replace: "df.chave" → "df.chave_id"

Para verificar o nome correto:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'dre_fabric' AND column_name LIKE '%chave%';
*/
