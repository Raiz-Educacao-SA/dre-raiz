-- ================================================================================
-- TESTES PARA VALIDAR O AGRUPAMENTO
-- ================================================================================
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ================================================================================

-- ================================================================================
-- TESTE 1: Executar a comparação
-- ================================================================================

SELECT * FROM executar_comparacao_manual();

-- ================================================================================
-- TESTE 2: Ver o resumo geral
-- ================================================================================

SELECT * FROM vw_ultimo_resumo;

-- ================================================================================
-- TESTE 3: Ver primeiros 20 resultados
-- ================================================================================

SELECT
  chave_id,
  status,
  df_valor as soma_dre,
  t_amount as soma_trans,
  diferenca_valor
FROM vw_ultima_comparacao
LIMIT 20;

-- ================================================================================
-- TESTE 4: Distribuição por status
-- ================================================================================

SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
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
-- TESTE 5: Verificar contagens (validação)
-- ================================================================================

SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE chave_id IS NOT NULL) as chaves_unicas_df,
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as chaves_unicas_t,
  (SELECT COUNT(*) FROM vw_ultima_comparacao) as total_comparacao,
  (SELECT total_registros FROM vw_ultimo_resumo) as total_resumo;

-- ================================================================================
-- TESTE 6: Ver apenas problemas (top 20)
-- ================================================================================

SELECT
  chave_id,
  status,
  df_valor as soma_dre,
  t_amount as soma_trans,
  diferenca_valor,
  df_filial,
  df_type
FROM vw_problemas_ultima_comparacao
LIMIT 20;

-- ================================================================================
-- TESTE 7: Totais financeiros
-- ================================================================================

SELECT
  total_registros,
  qtd_valores_iguais,
  qtd_valores_diferentes,
  qtd_so_transactions,
  qtd_so_dre_fabric,
  perc_valores_iguais,
  soma_df_valor,
  soma_t_amount,
  diferenca_total
FROM vw_ultimo_resumo;

-- ================================================================================
-- TESTE 8: Verificar se há chaves duplicadas (não deveria ter)
-- ================================================================================

SELECT
  chave_id,
  COUNT(*) as vezes_aparece
FROM vw_ultima_comparacao
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Se retornar vazio = OK (sem duplicatas)
-- Se retornar registros = Problema (ainda há duplicatas)

-- ================================================================================
-- FIM DOS TESTES
-- ================================================================================
