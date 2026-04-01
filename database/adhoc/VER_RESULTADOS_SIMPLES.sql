-- ================================================================================
-- VER RESULTADOS DA COMPARAÇÃO - VERSÃO SIMPLIFICADA
-- ================================================================================

-- ================================================================================
-- 1. RESUMO GERAL (MAIS IMPORTANTE!)
-- ================================================================================

SELECT
  '📊 RESUMO GERAL' as titulo;

SELECT
  data_execucao,
  total_registros,

  -- Valores iguais
  qtd_valores_iguais,
  perc_valores_iguais || '%' as taxa_valores_iguais,

  -- Valores diferentes
  qtd_valores_diferentes,
  perc_valores_diferentes || '%' as taxa_valores_diferentes,

  -- Só em TRANSACTIONS
  qtd_so_transactions,
  perc_so_transactions || '%' as taxa_so_transactions,

  -- Só em DRE_FABRIC
  qtd_so_dre_fabric,
  perc_so_dre_fabric || '%' as taxa_so_dre_fabric,

  -- Financeiro
  'R$ ' || TO_CHAR(soma_df_valor, 'FM999,999,999.00') as total_dre_fabric,
  'R$ ' || TO_CHAR(soma_t_amount, 'FM999,999,999.00') as total_transactions,
  'R$ ' || TO_CHAR(ABS(diferenca_total), 'FM999,999,999.00') as diferenca_total,

  -- Status final
  CASE
    WHEN qtd_valores_diferentes = 0 AND qtd_so_dre_fabric = 0 THEN '✅ PERFEITO - 100% Sincronizado'
    WHEN perc_valores_iguais >= 99 THEN '✅ EXCELENTE - >99% Sincronizado'
    WHEN perc_valores_iguais >= 95 THEN '⚠️ BOM - >95% Sincronizado'
    WHEN perc_valores_iguais >= 90 THEN '⚠️ REGULAR - >90% Sincronizado'
    ELSE '❌ CRÍTICO - <90% Sincronizado'
  END as avaliacao

FROM vw_ultimo_resumo;

-- ================================================================================
-- 2. BREAKDOWN POR STATUS
-- ================================================================================

SELECT
  '📋 DETALHAMENTO POR STATUS' as titulo;

SELECT
  status,
  COUNT(*) as quantidade,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) || '%' as percentual,
  'R$ ' || TO_CHAR(SUM(COALESCE(df_valor, t_amount, 0)), 'FM999,999,999.00') as valor_total
FROM vw_ultima_comparacao
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
-- 3. CONTADORES SIMPLES
-- ================================================================================

SELECT
  '🔢 TOTAIS' as titulo;

SELECT
  'Valores iguais' as categoria,
  COUNT(*) as quantidade
FROM vw_ultima_comparacao
WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'

UNION ALL

SELECT
  'Valores diferentes' as categoria,
  COUNT(*) as quantidade
FROM vw_ultima_comparacao
WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'

UNION ALL

SELECT
  'Só em TRANSACTIONS' as categoria,
  COUNT(*) as quantidade
FROM vw_ultima_comparacao
WHERE status = '3. SO TEM NA TRANSACTIONS'

UNION ALL

SELECT
  'Só em DRE_FABRIC' as categoria,
  COUNT(*) as quantidade
FROM vw_ultima_comparacao
WHERE status = '4. SO TEM NA DRE_FABRIC';

-- ================================================================================
-- 4. VERIFICAR QUAIS COLUNAS EXISTEM NA VIEW
-- ================================================================================

SELECT
  '📋 COLUNAS DISPONÍVEIS NA VIEW' as titulo;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'vw_ultima_comparacao'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================================
-- 5. AMOSTRA DE 5 REGISTROS (TODOS OS CAMPOS)
-- ================================================================================

SELECT
  '📄 AMOSTRA DE DADOS (5 registros)' as titulo;

SELECT *
FROM vw_ultima_comparacao
LIMIT 5;

-- ================================================================================
-- FIM
-- ================================================================================
