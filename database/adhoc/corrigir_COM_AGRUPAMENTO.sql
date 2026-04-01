-- ================================================================================
-- CORREÇÃO: AGRUPAR POR CHAVE_ID E SOMAR VALORES
-- ================================================================================
-- Agrupa por chave_id e soma todos os valores para cada chave
-- ================================================================================

CREATE OR REPLACE FUNCTION executar_comparacao_dre_transactions()
RETURNS TABLE(
  resumo_id BIGINT,
  registros_inseridos INTEGER,
  tempo_execucao_ms INTEGER,
  mensagem TEXT
) AS $$
DECLARE
  v_data_execucao TIMESTAMP WITH TIME ZONE;
  v_inicio TIMESTAMP;
  v_fim TIMESTAMP;
  v_tempo_ms INTEGER;
  v_registros_inseridos INTEGER;
  v_resumo_id BIGINT;
BEGIN
  v_inicio := clock_timestamp();
  v_data_execucao := NOW();

  -- Limpar histórico antigo
  DELETE FROM comparacao_historico
  WHERE data_execucao < NOW() - INTERVAL '30 days';

  -- Inserir comparação COM AGRUPAMENTO E SOMA
  INSERT INTO comparacao_historico (
    data_execucao,
    chave_id,
    status,
    df_valor,
    df_filial,
    df_type,
    t_amount,
    t_filial,
    t_type,
    diferenca_valor,
    percentual_diferenca
  )
  -- CTE para AGRUPAR e SOMAR valores do DRE_FABRIC
  WITH dre_fabric_agrupado AS (
    SELECT
      chave_id,
      SUM(valor) as valor_total,
      STRING_AGG(DISTINCT filial, ', ') as filiais,
      STRING_AGG(DISTINCT type, ', ') as tipos,
      COUNT(*) as qtd_registros
    FROM dre_fabric
    WHERE chave_id IS NOT NULL
    GROUP BY chave_id
  ),
  -- CTE para AGRUPAR e SOMAR valores do TRANSACTIONS
  transactions_agrupado AS (
    SELECT
      chave_id,
      SUM(amount) as amount_total,
      STRING_AGG(DISTINCT filial, ', ') as filiais,
      STRING_AGG(DISTINCT type, ', ') as tipos,
      COUNT(*) as qtd_registros
    FROM transactions
    WHERE chave_id IS NOT NULL
    GROUP BY chave_id
  )
  SELECT
    v_data_execucao,
    COALESCE(df.chave_id, t.chave_id) as chave_id,

    -- Status baseado na SOMA dos valores
    CASE
      -- Existe em ambas com SOMA DE VALORES IGUAIS
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2) THEN
        '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'

      -- Existe em ambas com SOMA DE VALORES DIFERENTES
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
           AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2) THEN
        '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'

      -- Existe apenas em TRANSACTIONS
      WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN
        '3. SO TEM NA TRANSACTIONS'

      -- Existe apenas em DRE_FABRIC
      WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN
        '4. SO TEM NA DRE_FABRIC'

      ELSE '❓ OUTRO'
    END,

    -- SOMA dos valores
    ROUND(df.valor_total::NUMERIC, 2),
    df.filiais,  -- Todas as filiais concatenadas
    df.tipos,    -- Todos os tipos concatenados
    ROUND(t.amount_total::NUMERIC, 2),
    t.filiais,   -- Todas as filiais concatenadas
    t.tipos,     -- Todos os tipos concatenados

    -- Diferença entre as SOMAS
    CASE
      WHEN df.valor_total IS NOT NULL AND t.amount_total IS NOT NULL THEN
        ROUND((t.amount_total - df.valor_total)::NUMERIC, 2)
      ELSE NULL
    END,

    -- Percentual de diferença
    CASE
      WHEN df.valor_total IS NOT NULL AND t.amount_total IS NOT NULL AND df.valor_total != 0 THEN
        ROUND(ABS((df.valor_total - t.amount_total) / df.valor_total) * 100, 2)
      ELSE NULL
    END

  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id;

  GET DIAGNOSTICS v_registros_inseridos = ROW_COUNT;

  -- Inserir resumo
  INSERT INTO comparacao_resumo (
    data_execucao,
    total_registros,
    qtd_valores_iguais,
    qtd_valores_diferentes,
    qtd_so_transactions,
    qtd_so_dre_fabric,
    perc_valores_iguais,
    perc_valores_diferentes,
    perc_so_transactions,
    perc_so_dre_fabric,
    soma_df_valor,
    soma_t_amount,
    diferenca_total
  )
  SELECT
    v_data_execucao,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'),
    COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'),
    COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS'),
    COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC'),
    ROUND((COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND(SUM(COALESCE(df_valor, 0))::NUMERIC, 2),
    ROUND(SUM(COALESCE(t_amount, 0))::NUMERIC, 2),
    ROUND(SUM(COALESCE(diferenca_valor, 0))::NUMERIC, 2)
  FROM comparacao_historico
  WHERE data_execucao = v_data_execucao
  RETURNING id INTO v_resumo_id;

  v_fim := clock_timestamp();
  v_tempo_ms := EXTRACT(MILLISECONDS FROM (v_fim - v_inicio))::INTEGER;

  UPDATE comparacao_resumo
  SET tempo_execucao_ms = v_tempo_ms
  WHERE id = v_resumo_id;

  RETURN QUERY SELECT
    v_resumo_id,
    v_registros_inseridos,
    v_tempo_ms,
    FORMAT('✅ Comparação executada! %s chaves agrupadas em %s ms', v_registros_inseridos, v_tempo_ms);

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION executar_comparacao_dre_transactions() IS
  'Compara DRE_FABRIC vs TRANSACTIONS agrupando por chave_id e somando valores';

-- ================================================================================
-- ATUALIZAR SQL DE CONSULTA MANUAL (comparacao_chave_id_FINAL.sql)
-- ================================================================================

-- Use este SQL para consultas manuais com a mesma lógica:
/*

WITH
dre_fabric_agrupado AS (
  SELECT
    chave_id,
    SUM(valor) as valor_total,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    COUNT(*) as qtd_registros_df
  FROM dre_fabric
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
),
transactions_agrupado AS (
  SELECT
    chave_id,
    SUM(amount) as amount_total,
    STRING_AGG(DISTINCT filial, ', ') as filiais,
    STRING_AGG(DISTINCT type, ', ') as tipos,
    COUNT(*) as qtd_registros_t
  FROM transactions
  WHERE chave_id IS NOT NULL
  GROUP BY chave_id
)
SELECT
  COALESCE(df.chave_id, t.chave_id) as chave_id,

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

  -- Somas
  ROUND(df.valor_total::NUMERIC, 2) as soma_dre_fabric,
  ROUND(t.amount_total::NUMERIC, 2) as soma_transactions,
  ROUND((t.amount_total - df.valor_total)::NUMERIC, 2) as diferenca,

  -- Detalhes
  df.qtd_registros_df,
  t.qtd_registros_t,
  df.filiais as filiais_df,
  t.filiais as filiais_t,
  df.tipos as tipos_df,
  t.tipos as tipos_t

FROM dre_fabric_agrupado df
FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id
ORDER BY
  CASE
    WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
         AND ROUND(df.valor_total::NUMERIC, 2) = ROUND(t.amount_total::NUMERIC, 2) THEN 1
    WHEN df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
         AND ROUND(df.valor_total::NUMERIC, 2) != ROUND(t.amount_total::NUMERIC, 2) THEN 2
    WHEN df.chave_id IS NULL AND t.chave_id IS NOT NULL THEN 3
    WHEN df.chave_id IS NOT NULL AND t.chave_id IS NULL THEN 4
    ELSE 5
  END,
  ABS(COALESCE(t.amount_total - df.valor_total, 0)) DESC
LIMIT 100;

*/

-- ================================================================================
-- MENSAGEM
-- ================================================================================

SELECT '✅ FUNÇÃO CORRIGIDA COM AGRUPAMENTO!' as status;
SELECT '📊 Agora agrupa por chave_id e SOMA todos os valores' as info_1;
SELECT '🔢 Total esperado: número de chaves únicas distintas em ambas tabelas' as info_2;
SELECT '🔄 Execute: SELECT * FROM executar_comparacao_manual();' as proximo_passo;
