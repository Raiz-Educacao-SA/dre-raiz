-- ================================================================================
-- CORREÇÃO DA FUNÇÃO DE COMPARAÇÃO
-- ================================================================================
-- Execute este script para corrigir a função com os nomes corretos das colunas
-- ================================================================================

-- Primeiro, vamos recriar a tabela comparacao_historico com as colunas corretas
DROP TABLE IF EXISTS comparacao_historico CASCADE;

CREATE TABLE comparacao_historico (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chave_id TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Dados do DRE_FABRIC (colunas corretas)
  df_valor NUMERIC(18,2),
  df_data DATE,
  df_complemento TEXT,
  df_filial TEXT,
  df_type TEXT,
  df_conta TEXT,
  df_cia TEXT,
  df_anomes TEXT,

  -- Dados do TRANSACTIONS
  t_amount NUMERIC(18,2),
  t_date DATE,
  t_category TEXT,
  t_subcategory TEXT,
  t_description TEXT,
  t_filial TEXT,
  t_marca TEXT,
  t_type TEXT,

  -- Análise
  diferenca_valor NUMERIC(18,2),
  percentual_diferenca NUMERIC(10,2),

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recriar índices
CREATE INDEX idx_comparacao_historico_data_execucao
  ON comparacao_historico(data_execucao DESC);

CREATE INDEX idx_comparacao_historico_chave_id
  ON comparacao_historico(chave_id);

CREATE INDEX idx_comparacao_historico_status
  ON comparacao_historico(status);

COMMENT ON TABLE comparacao_historico IS 'Histórico detalhado de comparações entre DRE_FABRIC e TRANSACTIONS';

-- ================================================================================
-- RECRIAR FUNÇÃO COM COLUNAS CORRETAS
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
  -- Marcar início da execução
  v_inicio := clock_timestamp();
  v_data_execucao := NOW();

  -- Limpar dados da execução anterior (manter histórico dos últimos 30 dias)
  DELETE FROM comparacao_historico
  WHERE data_execucao < NOW() - INTERVAL '30 days';

  -- Inserir dados detalhados da comparação com COLUNAS CORRETAS
  INSERT INTO comparacao_historico (
    data_execucao,
    chave_id,
    status,
    df_valor,
    df_data,
    df_complemento,
    df_filial,
    df_type,
    df_conta,
    df_cia,
    df_anomes,
    t_amount,
    t_date,
    t_category,
    t_subcategory,
    t_description,
    t_filial,
    t_marca,
    t_type,
    diferenca_valor,
    percentual_diferenca
  )
  SELECT
    v_data_execucao,
    COALESCE(df.chave_id, t.chave_id) as chave_id,

    -- Status com classificações em português
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

    -- Dados do DRE_FABRIC (usando nomes corretos)
    df.valor,
    df.data,
    df.complemento,  -- ERA categoria
    df.filial,
    df.type,
    df.conta,
    df.cia,
    df.anomes,

    -- Dados do TRANSACTIONS
    t.amount,
    t.date,
    t.category,
    t.subcategory,
    t.description,
    t.filial,
    t.marca,
    t.type,

    -- Diferença de valor
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL THEN
        ROUND((t.amount - df.valor)::NUMERIC, 2)
      ELSE NULL
    END as diferenca_valor,

    -- Percentual de diferença
    CASE
      WHEN df.valor IS NOT NULL AND t.amount IS NOT NULL AND df.valor != 0 THEN
        ROUND(ABS((df.valor - t.amount) / df.valor) * 100, 2)
      ELSE NULL
    END as percentual_diferenca

  FROM dre_fabric df
  FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id
  WHERE df.chave_id IS NOT NULL OR t.chave_id IS NOT NULL;

  -- Contar registros inseridos
  GET DIAGNOSTICS v_registros_inseridos = ROW_COUNT;

  -- Inserir resumo da execução
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
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS') as qtd_valores_iguais,
    COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as qtd_valores_diferentes,
    COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS') as qtd_so_transactions,
    COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as qtd_so_dre_fabric,
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

  -- Calcular tempo de execução
  v_fim := clock_timestamp();
  v_tempo_ms := EXTRACT(MILLISECONDS FROM (v_fim - v_inicio))::INTEGER;

  -- Atualizar tempo de execução no resumo
  UPDATE comparacao_resumo
  SET tempo_execucao_ms = v_tempo_ms
  WHERE id = v_resumo_id;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_resumo_id,
    v_registros_inseridos,
    v_tempo_ms,
    FORMAT('✅ Comparação executada com sucesso! %s registros processados em %s ms',
           v_registros_inseridos, v_tempo_ms);

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION executar_comparacao_dre_transactions() IS
  'Executa comparação completa entre DRE_FABRIC e TRANSACTIONS e salva resultados nas tabelas de histórico';

-- ================================================================================
-- RECRIAR VIEWS COM COLUNAS CORRETAS
-- ================================================================================

-- View com a última comparação detalhada
CREATE OR REPLACE VIEW vw_ultima_comparacao AS
SELECT
  ch.*
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

-- View com o último resumo
CREATE OR REPLACE VIEW vw_ultimo_resumo AS
SELECT *
FROM comparacao_resumo
ORDER BY data_execucao DESC
LIMIT 1;

-- View com registros problemáticos (diferenças e faltantes)
CREATE OR REPLACE VIEW vw_problemas_ultima_comparacao AS
SELECT *
FROM vw_ultima_comparacao
WHERE status IN (
  '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES',
  '4. SO TEM NA DRE_FABRIC'
)
ORDER BY ABS(COALESCE(diferenca_valor, df_valor, 0)) DESC;

-- View com histórico de execuções
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

-- ================================================================================
-- MENSAGEM DE CONCLUSÃO
-- ================================================================================

SELECT '✅ FUNÇÃO CORRIGIDA COM SUCESSO!' as status;
SELECT '📝 Colunas ajustadas para corresponder à estrutura real das tabelas' as info;
SELECT '🔄 Execute agora: SELECT * FROM executar_comparacao_manual();' as proximo_passo;
