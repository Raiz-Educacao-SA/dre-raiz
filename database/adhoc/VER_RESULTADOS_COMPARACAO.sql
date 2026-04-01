-- ================================================================================
-- VER RESULTADOS DA COMPARAÇÃO DRE_FABRIC vs TRANSACTIONS
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
-- 3. TOP 10 DIVERGÊNCIAS DE VALOR (SE HOUVER)
-- ================================================================================

SELECT
  '⚠️ TOP 10 MAIORES DIVERGÊNCIAS DE VALOR' as titulo;

SELECT
  chave_id,
  'R$ ' || TO_CHAR(df_valor, 'FM999,999,999.00') as valor_dre_fabric,
  'R$ ' || TO_CHAR(t_amount, 'FM999,999,999.00') as valor_transactions,
  'R$ ' || TO_CHAR(ABS(diferenca_valor), 'FM999,999,999.00') as diferenca,
  percentual_diferenca || '%' as perc_diferenca,
  df_descricao as descricao,
  df_filial as filial,
  df_type as tipo
FROM vw_ultima_comparacao
WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
ORDER BY ABS(diferenca_valor) DESC
LIMIT 10;

-- ================================================================================
-- 4. REGISTROS SÓ NO DRE_FABRIC (SE HOUVER)
-- ================================================================================

SELECT
  '🔴 REGISTROS SÓ NO DRE_FABRIC (NÃO SINCRONIZADOS)' as titulo;

SELECT
  COUNT(*) as quantidade_total,
  'R$ ' || TO_CHAR(SUM(df_valor), 'FM999,999,999.00') as valor_total
FROM vw_ultima_comparacao
WHERE status = '4. SO TEM NA DRE_FABRIC';

-- Amostra dos 10 primeiros
SELECT
  chave_id,
  'R$ ' || TO_CHAR(df_valor, 'FM999,999,999.00') as valor,
  df_data as data,
  df_descricao as descricao,
  df_filial as filial,
  df_type as tipo,
  df_conta as conta
FROM vw_ultima_comparacao
WHERE status = '4. SO TEM NA DRE_FABRIC'
ORDER BY ABS(df_valor) DESC
LIMIT 10;

-- ================================================================================
-- 5. REGISTROS SÓ NO TRANSACTIONS (SE HOUVER)
-- ================================================================================

SELECT
  '🔵 REGISTROS SÓ NO TRANSACTIONS' as titulo;

SELECT
  COUNT(*) as quantidade_total,
  'R$ ' || TO_CHAR(SUM(t_amount), 'FM999,999,999.00') as valor_total
FROM vw_ultima_comparacao
WHERE status = '3. SO TEM NA TRANSACTIONS';

-- Amostra dos 10 primeiros
SELECT
  chave_id,
  'R$ ' || TO_CHAR(t_amount, 'FM999,999,999.00') as valor,
  t_date as data,
  t_description as descricao,
  t_filial as filial,
  t_type as tipo,
  t_category as categoria
FROM vw_ultima_comparacao
WHERE status = '3. SO TEM NA TRANSACTIONS'
ORDER BY ABS(t_amount) DESC
LIMIT 10;

-- ================================================================================
-- 6. ANÁLISE POR FILIAL (SE HOUVER DIVERGÊNCIAS)
-- ================================================================================

SELECT
  '🏢 ANÁLISE POR FILIAL' as titulo;

SELECT
  COALESCE(df_filial, t_filial) as filial,
  COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS') as ok,
  COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as divergentes,
  COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as so_dre,
  COUNT(*) as total,
  ROUND((COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS')::NUMERIC / COUNT(*) * 100), 2) || '%' as taxa_sucesso
FROM vw_ultima_comparacao
GROUP BY COALESCE(df_filial, t_filial)
ORDER BY divergentes DESC, so_dre DESC
LIMIT 20;

-- ================================================================================
-- 7. ANÁLISE POR TIPO (SE HOUVER DIVERGÊNCIAS)
-- ================================================================================

SELECT
  '📂 ANÁLISE POR TIPO' as titulo;

SELECT
  COALESCE(df_type, t_type) as tipo,
  COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS') as ok,
  COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as divergentes,
  COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as so_dre,
  COUNT(*) as total,
  ROUND((COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS')::NUMERIC / COUNT(*) * 100), 2) || '%' as taxa_sucesso
FROM vw_ultima_comparacao
GROUP BY COALESCE(df_type, t_type)
ORDER BY divergentes DESC, so_dre DESC
LIMIT 20;

-- ================================================================================
-- 8. HISTÓRICO DE EXECUÇÕES (ÚLTIMAS 5)
-- ================================================================================

SELECT
  '📜 HISTÓRICO DAS ÚLTIMAS 5 EXECUÇÕES' as titulo;

SELECT
  data_execucao,
  total_registros,
  perc_valores_iguais || '%' as taxa_sucesso,
  qtd_valores_diferentes as divergencias,
  qtd_so_dre_fabric as nao_sincronizados,
  tempo_execucao_ms || ' ms' as tempo,
  CASE
    WHEN qtd_valores_diferentes = 0 AND qtd_so_dre_fabric = 0 THEN '✅ Perfeito'
    WHEN qtd_valores_diferentes > 0 OR qtd_so_dre_fabric > 0 THEN '⚠️ Divergências'
    ELSE '❓ Verificar'
  END as situacao
FROM vw_historico_execucoes
LIMIT 5;

-- ================================================================================
-- MENSAGEM FINAL
-- ================================================================================

DO $$
DECLARE
  v_resumo RECORD;
BEGIN
  SELECT * INTO v_resumo FROM vw_ultimo_resumo;

  RAISE NOTICE '
================================================================================
📊 ANÁLISE COMPLETA DA COMPARAÇÃO
================================================================================

Total de registros comparados: %
Valores iguais: % (%%)
Valores diferentes: % (%%)
Só em TRANSACTIONS: % (%%)
Só em DRE_FABRIC: % (%%)

Avaliação: %

================================================================================
🎯 RECOMENDAÇÕES:
================================================================================

%

================================================================================
',
  v_resumo.total_registros,
  v_resumo.qtd_valores_iguais,
  v_resumo.perc_valores_iguais,
  v_resumo.qtd_valores_diferentes,
  v_resumo.perc_valores_diferentes,
  v_resumo.qtd_so_transactions,
  v_resumo.perc_so_transactions,
  v_resumo.qtd_so_dre_fabric,
  v_resumo.perc_so_dre_fabric,
  CASE
    WHEN v_resumo.qtd_valores_diferentes = 0 AND v_resumo.qtd_so_dre_fabric = 0 THEN '✅ PERFEITO'
    WHEN v_resumo.perc_valores_iguais >= 99 THEN '✅ EXCELENTE'
    WHEN v_resumo.perc_valores_iguais >= 95 THEN '⚠️ BOM'
    ELSE '⚠️ REQUER ATENÇÃO'
  END,
  CASE
    WHEN v_resumo.qtd_valores_diferentes = 0 AND v_resumo.qtd_so_dre_fabric = 0 THEN
      '✅ Sistema 100% sincronizado!
   Não há ações necessárias.'
    WHEN v_resumo.qtd_so_dre_fabric > 0 THEN
      '⚠️ Há registros em DRE_FABRIC que não foram sincronizados!

   Possíveis causas:
   1. Registros sem chave_id
   2. Registros sem type (não classificados)
   3. Erro na sincronização

   Ação recomendada:
   → Executar: SELECT * FROM sync_dre_fabric_to_transactions(NULL);
   → Verificar registros sem type em dre_fabric'
    WHEN v_resumo.qtd_valores_diferentes > 0 THEN
      '⚠️ Há divergências de valores!

   Ação recomendada:
   → Revisar TOP 10 divergências acima
   → Investigar causa raiz (conversão de valores, arredondamentos, etc.)'
    ELSE '✅ Sistema funcionando bem!'
  END;

END $$;

-- ================================================================================
-- FIM DA ANÁLISE
-- ================================================================================
