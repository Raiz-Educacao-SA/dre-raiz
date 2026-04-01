-- ================================================================================
-- ROTINA AUTOMÁTICA DE COMPARAÇÃO DRE_FABRIC vs TRANSACTIONS
-- ================================================================================
--
-- Este script cria:
-- 1. Tabela para armazenar histórico das comparações
-- 2. Função para executar a comparação e salvar resultados
-- 3. Trigger para executar automaticamente quando dre_fabric for atualizado
-- 4. Função para executar manualmente quando necessário
--
-- ================================================================================

-- ================================================================================
-- PASSO 1: CRIAR TABELA PARA ARMAZENAR RESULTADOS
-- ================================================================================

-- Tabela principal com resultados detalhados
CREATE TABLE IF NOT EXISTS comparacao_historico (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chave_id TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Dados do DRE_FABRIC
  df_valor NUMERIC(18,2),
  df_data DATE,
  df_categoria TEXT,
  df_subcategoria TEXT,
  df_descricao TEXT,
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_comparacao_historico_data_execucao
  ON comparacao_historico(data_execucao DESC);

CREATE INDEX IF NOT EXISTS idx_comparacao_historico_chave_id
  ON comparacao_historico(chave_id);

CREATE INDEX IF NOT EXISTS idx_comparacao_historico_status
  ON comparacao_historico(status);

-- Tabela de resumo por execução
CREATE TABLE IF NOT EXISTS comparacao_resumo (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contadores
  total_registros INTEGER,
  qtd_valores_iguais INTEGER,
  qtd_valores_diferentes INTEGER,
  qtd_so_transactions INTEGER,
  qtd_so_dre_fabric INTEGER,

  -- Percentuais
  perc_valores_iguais NUMERIC(5,2),
  perc_valores_diferentes NUMERIC(5,2),
  perc_so_transactions NUMERIC(5,2),
  perc_so_dre_fabric NUMERIC(5,2),

  -- Totais financeiros
  soma_df_valor NUMERIC(18,2),
  soma_t_amount NUMERIC(18,2),
  diferenca_total NUMERIC(18,2),

  -- Metadados
  tempo_execucao_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparacao_resumo_data_execucao
  ON comparacao_resumo(data_execucao DESC);

COMMENT ON TABLE comparacao_historico IS 'Histórico detalhado de comparações entre DRE_FABRIC e TRANSACTIONS';
COMMENT ON TABLE comparacao_resumo IS 'Resumo consolidado de cada execução da comparação';

-- ================================================================================
-- PASSO 2: CRIAR FUNÇÃO PARA EXECUTAR COMPARAÇÃO
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

  -- Inserir dados detalhados da comparação
  INSERT INTO comparacao_historico (
    data_execucao,
    chave_id,
    status,
    df_valor,
    df_data,
    df_categoria,
    df_subcategoria,
    df_descricao,
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

    -- Dados do DRE_FABRIC
    df.valor,
    df.data,
    df.categoria,
    df.subcategoria,
    df.complemento,
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
    ROUND((COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS')::NUMERIC / COUNT(*) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES')::NUMERIC / COUNT(*) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS')::NUMERIC / COUNT(*) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC')::NUMERIC / COUNT(*) * 100), 2),
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
-- PASSO 3: CRIAR TABELA DE CONTROLE PARA EVITAR EXECUÇÕES DUPLICADAS
-- ================================================================================

CREATE TABLE IF NOT EXISTS comparacao_controle (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  execucao_em_andamento BOOLEAN DEFAULT FALSE,
  CHECK (id = 1) -- Garante apenas 1 registro
);

-- Inserir registro inicial
INSERT INTO comparacao_controle (id, ultima_execucao, execucao_em_andamento)
VALUES (1, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ================================================================================
-- PASSO 4: CRIAR FUNÇÃO PARA TRIGGER (COM CONTROLE DE FREQUÊNCIA)
-- ================================================================================

CREATE OR REPLACE FUNCTION trigger_comparacao_dre_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_ultima_execucao TIMESTAMP WITH TIME ZONE;
  v_em_andamento BOOLEAN;
BEGIN
  -- Verificar status da última execução
  SELECT ultima_execucao, execucao_em_andamento
  INTO v_ultima_execucao, v_em_andamento
  FROM comparacao_controle
  WHERE id = 1;

  -- Só executar se:
  -- 1. Não há execução em andamento
  -- 2. Última execução foi há mais de 5 minutos (evita sobrecarga)
  IF v_em_andamento = FALSE AND
     (v_ultima_execucao IS NULL OR v_ultima_execucao < NOW() - INTERVAL '5 minutes') THEN

    -- Marcar como em andamento
    UPDATE comparacao_controle
    SET execucao_em_andamento = TRUE
    WHERE id = 1;

    -- Executar comparação (em background para não bloquear o INSERT/UPDATE)
    PERFORM executar_comparacao_dre_transactions();

    -- Atualizar controle
    UPDATE comparacao_controle
    SET ultima_execucao = NOW(),
        execucao_em_andamento = FALSE
    WHERE id = 1;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- PASSO 5: CRIAR TRIGGER NO DRE_FABRIC
-- ================================================================================

-- Remover trigger se já existir
DROP TRIGGER IF EXISTS trigger_atualizar_comparacao ON dre_fabric;

-- Criar trigger que executa APÓS INSERT ou UPDATE
-- IMPORTANTE: Usa AFTER para não bloquear a transação principal
-- Usa FOR EACH STATEMENT para executar 1 vez por lote, não por linha
CREATE TRIGGER trigger_atualizar_comparacao
  AFTER INSERT OR UPDATE ON dre_fabric
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_comparacao_dre_transactions();

COMMENT ON TRIGGER trigger_atualizar_comparacao ON dre_fabric IS
  'Executa comparação automaticamente após inserções/atualizações no DRE_FABRIC (máximo 1x a cada 5 minutos)';

-- ================================================================================
-- PASSO 6: VIEWS PARA CONSULTA FÁCIL DOS RESULTADOS
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
-- PASSO 7: FUNÇÕES AUXILIARES
-- ================================================================================

-- Função para executar manualmente (ignora limite de 5 minutos)
CREATE OR REPLACE FUNCTION executar_comparacao_manual()
RETURNS TABLE(
  resumo_id BIGINT,
  registros_inseridos INTEGER,
  tempo_execucao_ms INTEGER,
  mensagem TEXT
) AS $$
BEGIN
  -- Resetar controle para permitir execução imediata
  UPDATE comparacao_controle
  SET ultima_execucao = NULL,
      execucao_em_andamento = FALSE
  WHERE id = 1;

  -- Executar comparação
  RETURN QUERY SELECT * FROM executar_comparacao_dre_transactions();
END;
$$ LANGUAGE plpgsql;

-- Função para limpar histórico antigo
CREATE OR REPLACE FUNCTION limpar_historico_comparacao(dias_manter INTEGER DEFAULT 30)
RETURNS TABLE(
  registros_removidos INTEGER,
  mensagem TEXT
) AS $$
DECLARE
  v_removidos INTEGER;
BEGIN
  -- Remover registros antigos
  DELETE FROM comparacao_historico
  WHERE data_execucao < NOW() - (dias_manter || ' days')::INTERVAL;

  GET DIAGNOSTICS v_removidos = ROW_COUNT;

  DELETE FROM comparacao_resumo
  WHERE data_execucao < NOW() - (dias_manter || ' days')::INTERVAL;

  RETURN QUERY SELECT
    v_removidos,
    FORMAT('🗑️ Removidos %s registros anteriores a %s dias', v_removidos, dias_manter);
END;
$$ LANGUAGE plpgsql;

-- Função para desabilitar trigger temporariamente
CREATE OR REPLACE FUNCTION desabilitar_trigger_comparacao()
RETURNS TEXT AS $$
BEGIN
  ALTER TABLE dre_fabric DISABLE TRIGGER trigger_atualizar_comparacao;
  RETURN '⏸️ Trigger desabilitado. Use habilitar_trigger_comparacao() para reativar';
END;
$$ LANGUAGE plpgsql;

-- Função para habilitar trigger
CREATE OR REPLACE FUNCTION habilitar_trigger_comparacao()
RETURNS TEXT AS $$
BEGIN
  ALTER TABLE dre_fabric ENABLE TRIGGER trigger_atualizar_comparacao;
  RETURN '▶️ Trigger habilitado e funcionando';
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- MENSAGEM FINAL E INSTRUÇÕES DE USO
-- ================================================================================

DO $$
BEGIN
  RAISE NOTICE '
================================================================================
✅ ROTINA AUTOMÁTICA DE COMPARAÇÃO CRIADA COM SUCESSO!
================================================================================

📋 O QUE FOI CRIADO:

1. Tabelas:
   - comparacao_historico: Detalhes de cada comparação
   - comparacao_resumo: Resumo estatístico de cada execução
   - comparacao_controle: Controle de execução do trigger

2. Trigger:
   - Executa automaticamente após INSERT/UPDATE no dre_fabric
   - Limite: máximo 1 execução a cada 5 minutos (evita sobrecarga)

3. Views para consulta:
   - vw_ultima_comparacao: Última comparação detalhada
   - vw_ultimo_resumo: Resumo da última execução
   - vw_problemas_ultima_comparacao: Apenas divergências
   - vw_historico_execucoes: Histórico de todas as execuções

================================================================================
📖 COMO USAR:
================================================================================

-- Ver última comparação:
SELECT * FROM vw_ultima_comparacao LIMIT 100;

-- Ver resumo:
SELECT * FROM vw_ultimo_resumo;

-- Ver apenas problemas:
SELECT * FROM vw_problemas_ultima_comparacao;

-- Executar manualmente (ignora limite de 5 min):
SELECT * FROM executar_comparacao_manual();

-- Ver histórico de execuções:
SELECT * FROM vw_historico_execucoes;

-- Limpar registros antigos (padrão: 30 dias):
SELECT * FROM limpar_historico_comparacao(30);

-- Desabilitar trigger temporariamente:
SELECT desabilitar_trigger_comparacao();

-- Habilitar trigger novamente:
SELECT habilitar_trigger_comparacao();

================================================================================
🔄 COMPORTAMENTO AUTOMÁTICO:
================================================================================

Toda vez que você fizer:
- INSERT INTO dre_fabric ...
- UPDATE dre_fabric ...

O sistema irá automaticamente (após 5 minutos da última execução):
1. Comparar dre_fabric com transactions
2. Salvar resultados em comparacao_historico
3. Gerar resumo em comparacao_resumo
4. Disponibilizar dados nas views

================================================================================
⚡ PERFORMANCE:
================================================================================

- Histórico mantém últimos 30 dias (configurável)
- Índices otimizados para consultas rápidas
- Trigger com controle de frequência (evita execuções excessivas)
- Execução assíncrona (não bloqueia INSERT/UPDATE)

================================================================================
';
END $$;
