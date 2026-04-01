-- ================================================================================
-- CORREÇÃO: FUNÇÃO SEM DUPLICATAS
-- ================================================================================
-- Esta versão garante que cada chave_id apareça apenas UMA vez no resultado
-- Elimina duplicatas usando DISTINCT ON
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

  -- Inserir comparação SEM DUPLICATAS
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
  -- CTE para preparar dados SEM DUPLICATAS do DRE_FABRIC
  WITH dre_fabric_unico AS (
    SELECT DISTINCT ON (chave_id)
      chave_id,
      valor,
      filial,
      type
    FROM dre_fabric
    WHERE chave_id IS NOT NULL
    ORDER BY chave_id, valor DESC NULLS LAST  -- Prioriza maior valor se houver duplicatas
  ),
  -- CTE para preparar dados SEM DUPLICATAS do TRANSACTIONS
  transactions_unico AS (
    SELECT DISTINCT ON (chave_id)
      chave_id,
      amount,
      filial,
      type
    FROM transactions
    WHERE chave_id IS NOT NULL
    ORDER BY chave_id, amount DESC NULLS LAST  -- Prioriza maior valor se houver duplicatas
  )
  SELECT
    v_data_execucao,
    COALESCE(df.chave_id, t.chave_id) as chave_id,

    -- Status
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
    END,

    -- Colunas
    df.valor,
    df.filial,
    df.type,
    t.amount,
    t.filial,
    t.type,

    -- Diferenças
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        ROUND((t.amount - df.valor)::NUMERIC, 2)
      ELSE NULL
    END,
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL AND df.valor != 0 THEN
        ROUND(ABS((df.valor - t.amount) / df.valor) * 100, 2)
      ELSE NULL
    END

  FROM dre_fabric_unico df
  FULL OUTER JOIN transactions_unico t ON df.chave_id = t.chave_id;

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
    FORMAT('✅ Comparação executada! %s chaves únicas em %s ms', v_registros_inseridos, v_tempo_ms);

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION executar_comparacao_dre_transactions() IS
  'Executa comparação entre DRE_FABRIC e TRANSACTIONS eliminando duplicatas - cada chave_id aparece apenas 1 vez';

-- ================================================================================
-- MENSAGEM
-- ================================================================================

SELECT '✅ FUNÇÃO CORRIGIDA PARA ELIMINAR DUPLICATAS!' as status;
SELECT '📌 Agora cada chave_id aparecerá apenas UMA vez no resultado' as info;
SELECT '🔄 Execute: SELECT * FROM executar_comparacao_manual();' as proximo_passo;
SELECT '📊 Total esperado: ~108k registros (número de chaves únicas no dre_fabric + extras do transactions)' as contagem_esperada;
