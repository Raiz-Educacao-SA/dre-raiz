-- ================================================================================
-- CORREÇÃO SIMPLIFICADA - VERSÃO SEGURA
-- ================================================================================
-- Esta versão usa APENAS as colunas essenciais para garantir compatibilidade
-- ================================================================================

-- Recriar tabela de histórico com estrutura simplificada
DROP TABLE IF EXISTS comparacao_historico CASCADE;

CREATE TABLE comparacao_historico (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chave_id TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Apenas colunas essenciais do DRE_FABRIC
  df_valor NUMERIC(18,2),
  df_filial TEXT,
  df_type TEXT,

  -- Apenas colunas essenciais do TRANSACTIONS
  t_amount NUMERIC(18,2),
  t_filial TEXT,
  t_type TEXT,

  -- Análise
  diferenca_valor NUMERIC(18,2),
  percentual_diferenca NUMERIC(10,2),

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_comparacao_historico_data_execucao ON comparacao_historico(data_execucao DESC);
CREATE INDEX idx_comparacao_historico_chave_id ON comparacao_historico(chave_id);
CREATE INDEX idx_comparacao_historico_status ON comparacao_historico(status);

-- ================================================================================
-- FUNÇÃO SIMPLIFICADA
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

  -- Inserir comparação (APENAS COLUNAS ESSENCIAIS)
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

    -- Colunas essenciais
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

  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL;

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
    FORMAT('✅ Comparação executada! %s registros em %s ms', v_registros_inseridos, v_tempo_ms);

END;
$$ LANGUAGE plpgsql;

-- Recriar views
CREATE OR REPLACE VIEW vw_ultima_comparacao AS
SELECT ch.*
FROM comparacao_historico ch
INNER JOIN (
  SELECT MAX(data_execucao) as ultima_data
  FROM comparacao_historico
) last ON ch.data_execucao = last.ultima_data
ORDER BY
  CASE ch.status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(ch.diferenca_valor, 0)) DESC;

CREATE OR REPLACE VIEW vw_ultimo_resumo AS
SELECT *
FROM comparacao_resumo
ORDER BY data_execucao DESC
LIMIT 1;

CREATE OR REPLACE VIEW vw_problemas_ultima_comparacao AS
SELECT *
FROM vw_ultima_comparacao
WHERE status IN (
  '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES',
  '4. SO TEM NA DRE_FABRIC'
)
ORDER BY ABS(COALESCE(diferenca_valor, df_valor, 0)) DESC;

CREATE OR REPLACE VIEW vw_historico_execucoes AS
SELECT
  data_execucao,
  total_registros,
  qtd_valores_iguais,
  qtd_valores_diferentes,
  qtd_so_transactions,
  qtd_so_dre_fabric,
  perc_valores_iguais,
  diferenca_total,
  tempo_execucao_ms,
  CASE
    WHEN qtd_valores_diferentes = 0 AND qtd_so_dre_fabric = 0 THEN '✅ Perfeito'
    WHEN qtd_valores_diferentes > 0 OR qtd_so_dre_fabric > 0 THEN '⚠️ Divergências'
    ELSE '❓ Verificar'
  END as situacao
FROM comparacao_resumo
ORDER BY data_execucao DESC;

SELECT '✅ CORREÇÃO SIMPLIFICADA APLICADA!' as status;
SELECT '🚀 Agora execute: SELECT * FROM executar_comparacao_manual();' as proximo_passo;
