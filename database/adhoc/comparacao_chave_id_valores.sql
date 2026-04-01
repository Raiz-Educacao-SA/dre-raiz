-- ============================================
-- ANÁLISE COMPARATIVA: dre_fabric vs transactions
-- ============================================
-- Compara chave_id e valores entre as duas tabelas
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- QUERY PRINCIPAL: Análise Detalhada
-- ============================================

WITH analise AS (
  SELECT
    -- Identificação
    COALESCE(df.chave, t.chave_id) as chave_id,

    -- Valores
    df.valor as valor_fabric,
    t.amount as valor_transactions,

    -- Diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        ROUND((df.valor - t.amount)::NUMERIC, 2)
      ELSE NULL
    END as diferenca,

    -- Status da comparação
    CASE
      -- Caso 1: Chave existe em ambas as tabelas COM VALORES IGUAIS
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        '✅ OK - VALORES IGUAIS'

      -- Caso 2: Chave existe em ambas as tabelas MAS COM VALORES DIFERENTES
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        '⚠️ VALOR DIFERENTE'

      -- Caso 3: Chave existe no FABRIC mas NÃO existe em TRANSACTIONS
      WHEN df.chave IS NOT NULL AND t.chave_id IS NULL THEN
        '❌ FALTA INCLUIR'

      -- Caso 4: Chave existe em TRANSACTIONS mas NÃO existe no FABRIC (improvável)
      WHEN df.chave IS NULL AND t.chave_id IS NOT NULL THEN
        '🔍 EXTRA EM TRANSACTIONS'

      ELSE '❓ OUTRO'
    END as status,

    -- Dados adicionais para análise
    df.complemento as descricao_fabric,
    t.description as descricao_transactions,
    df.filial as filial_fabric,
    t.filial as filial_transactions,
    df.updated_at as atualizado_fabric,
    t.updated_at as atualizado_transactions

  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id
  WHERE df.chave IS NOT NULL OR t.chave_id IS NOT NULL  -- Excluir registros sem chave
)
SELECT
  status,
  chave_id,
  valor_fabric,
  valor_transactions,
  diferenca,
  LEFT(descricao_fabric, 40) as descricao_fabric,
  LEFT(descricao_transactions, 40) as descricao_transactions,
  filial_fabric,
  atualizado_fabric,
  atualizado_transactions
FROM analise
ORDER BY
  CASE status
    WHEN '❌ FALTA INCLUIR' THEN 1
    WHEN '⚠️ VALOR DIFERENTE' THEN 2
    WHEN '✅ OK - VALORES IGUAIS' THEN 3
    WHEN '🔍 EXTRA EM TRANSACTIONS' THEN 4
    ELSE 5
  END,
  chave_id;

-- ============================================
-- RESUMO EXECUTIVO
-- ============================================

SELECT '📊 RESUMO DA COMPARAÇÃO' as relatorio;

WITH analise_resumo AS (
  SELECT
    CASE
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2) THEN
        'OK_VALORES_IGUAIS'
      WHEN df.chave IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2) THEN
        'VALOR_DIFERENTE'
      WHEN df.chave IS NOT NULL AND t.chave_id IS NULL THEN
        'FALTA_INCLUIR'
      WHEN df.chave IS NULL AND t.chave_id IS NOT NULL THEN
        'EXTRA_EM_TRANSACTIONS'
      ELSE 'OUTRO'
    END as categoria,
    df.valor as valor_fabric,
    t.amount as valor_transactions
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id
  WHERE df.chave IS NOT NULL OR t.chave_id IS NOT NULL
)
SELECT
  categoria,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM analise_resumo), 2) as percentual,
  ROUND(SUM(COALESCE(valor_fabric, 0))::NUMERIC, 2) as soma_valor_fabric,
  ROUND(SUM(COALESCE(valor_transactions, 0))::NUMERIC, 2) as soma_valor_transactions
FROM analise_resumo
GROUP BY categoria
ORDER BY
  CASE categoria
    WHEN 'FALTA_INCLUIR' THEN 1
    WHEN 'VALOR_DIFERENTE' THEN 2
    WHEN 'OK_VALORES_IGUAIS' THEN 3
    WHEN 'EXTRA_EM_TRANSACTIONS' THEN 4
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
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as diferenca_quantidade,
  ROUND((SELECT SUM(valor) FROM dre_fabric WHERE chave IS NOT NULL)::NUMERIC, 2) as soma_valores_fabric,
  ROUND((SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)::NUMERIC, 2) as soma_valores_transactions,
  ROUND(
    (SELECT SUM(valor) FROM dre_fabric WHERE chave IS NOT NULL) -
    (SELECT SUM(amount) FROM transactions WHERE chave_id IS NOT NULL)
  ::NUMERIC, 2) as diferenca_valores;

-- ============================================
-- TOP 20 REGISTROS QUE FALTAM INCLUIR
-- ============================================

SELECT '❌ TOP 20 REGISTROS QUE FALTAM INCLUIR EM TRANSACTIONS' as relatorio;

SELECT
  df.chave as chave_id,
  df.valor,
  LEFT(df.complemento, 50) as descricao,
  df.conta,
  df.filial,
  df.cia as marca,
  df.type,
  df.created_at
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave = t.chave_id
WHERE df.chave IS NOT NULL
  AND t.chave_id IS NULL
ORDER BY ABS(df.valor) DESC
LIMIT 20;

-- ============================================
-- TOP 20 REGISTROS COM VALORES DIFERENTES
-- ============================================

SELECT '⚠️ TOP 20 REGISTROS COM VALORES DIFERENTES' as relatorio;

SELECT
  df.chave as chave_id,
  df.valor as valor_fabric,
  t.amount as valor_transactions,
  ROUND((df.valor - t.amount)::NUMERIC, 2) as diferenca,
  ROUND(ABS((df.valor - t.amount) / NULLIF(df.valor, 0)) * 100, 2) as percentual_diferenca,
  LEFT(df.complemento, 40) as descricao_fabric,
  LEFT(t.description, 40) as descricao_transactions,
  df.filial,
  df.updated_at as atualizado_fabric,
  t.updated_at as atualizado_transactions
FROM dre_fabric df
INNER JOIN transactions t ON df.chave = t.chave_id
WHERE df.chave IS NOT NULL
  AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
ORDER BY ABS(df.valor - t.amount) DESC
LIMIT 20;

-- ============================================
-- DISTRIBUIÇÃO POR FILIAL (Faltantes)
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR FILIAL - REGISTROS FALTANTES' as relatorio;

SELECT
  df.filial,
  COUNT(*) as quantidade_faltante,
  ROUND(SUM(df.valor)::NUMERIC, 2) as soma_valores_faltantes
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave = t.chave_id
WHERE df.chave IS NOT NULL
  AND t.chave_id IS NULL
GROUP BY df.filial
ORDER BY quantidade_faltante DESC
LIMIT 20;

-- ============================================
-- DISTRIBUIÇÃO POR TIPO (Faltantes)
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR TIPO - REGISTROS FALTANTES' as relatorio;

SELECT
  df.type,
  COUNT(*) as quantidade_faltante,
  ROUND(SUM(df.valor)::NUMERIC, 2) as soma_valores_faltantes,
  ROUND(COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM dre_fabric df2
    LEFT JOIN transactions t2 ON df2.chave = t2.chave_id
    WHERE df2.chave IS NOT NULL AND t2.chave_id IS NULL
  ), 2) as percentual_do_total
FROM dre_fabric df
LEFT JOIN transactions t ON df.chave = t.chave_id
WHERE df.chave IS NOT NULL
  AND t.chave_id IS NULL
GROUP BY df.type
ORDER BY quantidade_faltante DESC;

-- ============================================
-- VERIFICAÇÃO DE DUPLICATAS
-- ============================================

SELECT '🔍 VERIFICAR DUPLICATAS EM CHAVE_ID' as relatorio;

-- Duplicatas no dre_fabric
SELECT
  'dre_fabric' as tabela,
  chave,
  COUNT(*) as quantidade
FROM dre_fabric
WHERE chave IS NOT NULL
GROUP BY chave
HAVING COUNT(*) > 1
ORDER BY quantidade DESC
LIMIT 10;

-- Duplicatas em transactions
SELECT
  'transactions' as tabela,
  chave_id,
  COUNT(*) as quantidade
FROM transactions
WHERE chave_id IS NOT NULL
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY quantidade DESC
LIMIT 10;

-- ============================================
-- AÇÕES RECOMENDADAS
-- ============================================

SELECT '🎯 AÇÕES RECOMENDADAS' as relatorio;

WITH estatisticas AS (
  SELECT
    COUNT(*) FILTER (
      WHERE df.chave IS NOT NULL AND t.chave_id IS NULL
    ) as faltam_incluir,
    COUNT(*) FILTER (
      WHERE df.chave IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
    ) as valores_diferentes,
    COUNT(*) FILTER (
      WHERE df.chave IS NOT NULL AND t.chave_id IS NOT NULL
      AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2)
    ) as valores_ok
  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave = t.chave_id
)
SELECT
  CASE
    WHEN faltam_incluir > 0 THEN
      '1. ❌ Executar sincronização: ' || faltam_incluir || ' registros faltando'
    ELSE
      '1. ✅ Nenhum registro faltando'
  END as acao_1,
  CASE
    WHEN valores_diferentes > 0 THEN
      '2. ⚠️ Atualizar valores: ' || valores_diferentes || ' registros com valores diferentes'
    ELSE
      '2. ✅ Todos os valores estão corretos'
  END as acao_2,
  CASE
    WHEN valores_ok > 0 THEN
      '3. ✅ Manter: ' || valores_ok || ' registros estão corretos'
    ELSE
      '3. ⚠️ Nenhum registro correto encontrado'
  END as acao_3
FROM estatisticas;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT
  '✅ ANÁLISE COMPLETA EXECUTADA!' as status,
  'Revise os relatórios acima para entender a situação' as proxima_acao;

-- ============================================
-- COMO USAR OS RESULTADOS
-- ============================================

/*
📋 INTERPRETAÇÃO DOS RESULTADOS:

1️⃣ RESUMO DA COMPARAÇÃO:
   - OK_VALORES_IGUAIS: Registros sincronizados corretamente ✅
   - VALOR_DIFERENTE: Registros desatualizados ⚠️
   - FALTA_INCLUIR: Registros que precisam ser inseridos ❌
   - EXTRA_EM_TRANSACTIONS: Registros só em transactions (improvável) 🔍

2️⃣ TOTAIS GERAIS:
   - Mostra diferença de quantidade e valores entre as tabelas
   - Se diferenca_valores != 0, há inconsistências

3️⃣ TOP 20 FALTANTES:
   - Lista os principais registros que precisam ser incluídos
   - Ordenados por valor (maiores primeiro)

4️⃣ TOP 20 VALORES DIFERENTES:
   - Lista registros com valores divergentes
   - Mostra percentual de diferença

5️⃣ AÇÕES RECOMENDADAS:
   - Resume o que precisa ser feito

🔧 PRÓXIMOS PASSOS:

Se houver registros FALTANTES ou DIFERENTES:
→ Executar: SELECT * FROM sync_dre_fabric_to_transactions(NULL);

Se houver DUPLICATAS:
→ Investigar e limpar duplicatas antes de sincronizar
*/
