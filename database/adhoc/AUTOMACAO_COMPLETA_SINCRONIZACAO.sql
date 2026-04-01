-- ============================================================
-- AUTOMAÇÃO COMPLETA: COMPARAÇÃO E SINCRONIZAÇÃO AUTOMÁTICA
-- ============================================================
-- Data: 2026-02-04
-- ============================================================
-- FLUXO:
-- 1. dre_fabric atualiza → Trigger dispara
-- 2. Executa comparação
-- 3. Salva resultado em "cruzamento_dados_banco_vs_DRE"
-- 4. Insere automaticamente registros do status "4. SO TEM NA DRE_FABRIC"
-- ============================================================

-- ============================================================
-- PASSO 1: CRIAR TABELA DE CRUZAMENTO
-- ============================================================

DROP TABLE IF EXISTS cruzamento_dados_banco_vs_DRE CASCADE;

CREATE TABLE cruzamento_dados_banco_vs_DRE (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chave_id TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Valores
  soma_dre_fabric NUMERIC(18,2),
  soma_transactions NUMERIC(18,2),
  diferenca NUMERIC(18,2),

  -- Quantidades de registros
  qtd_reg_dre INTEGER,
  qtd_reg_trans INTEGER,

  -- Metadados
  foi_sincronizado BOOLEAN DEFAULT FALSE,
  data_sincronizacao TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cruzamento_data_execucao ON cruzamento_dados_banco_vs_DRE(data_execucao DESC);
CREATE INDEX idx_cruzamento_chave_id ON cruzamento_dados_banco_vs_DRE(chave_id);
CREATE INDEX idx_cruzamento_status ON cruzamento_dados_banco_vs_DRE(status);
CREATE INDEX idx_cruzamento_foi_sincronizado ON cruzamento_dados_banco_vs_DRE(foi_sincronizado);

COMMENT ON TABLE cruzamento_dados_banco_vs_DRE IS
  'Histórico de comparações entre DRE_FABRIC e TRANSACTIONS com sincronização automática';

-- ============================================================
-- PASSO 2: CRIAR TABELA DE RESUMO
-- ============================================================

DROP TABLE IF EXISTS cruzamento_resumo CASCADE;

CREATE TABLE cruzamento_resumo (
  id BIGSERIAL PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contadores por status
  qtd_status_1 INTEGER DEFAULT 0,  -- Valores iguais
  qtd_status_2 INTEGER DEFAULT 0,  -- Valores diferentes
  qtd_status_3 INTEGER DEFAULT 0,  -- Só TRANSACTIONS
  qtd_status_4 INTEGER DEFAULT 0,  -- Só DRE_FABRIC

  -- Percentuais
  perc_status_1 NUMERIC(5,2),
  perc_status_2 NUMERIC(5,2),
  perc_status_3 NUMERIC(5,2),
  perc_status_4 NUMERIC(5,2),

  -- Totais
  total_chaves INTEGER,

  -- Sincronização
  registros_sincronizados INTEGER DEFAULT 0,

  -- Performance
  tempo_execucao_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cruzamento_resumo_data ON cruzamento_resumo(data_execucao DESC);

-- ============================================================
-- PASSO 3: CRIAR TABELA DE CONTROLE
-- ============================================================

CREATE TABLE IF NOT EXISTS cruzamento_controle (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  execucao_em_andamento BOOLEAN DEFAULT FALSE,
  CHECK (id = 1)
);

INSERT INTO cruzamento_controle (id, ultima_execucao, execucao_em_andamento)
VALUES (1, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASSO 4: CRIAR FUNÇÃO DE COMPARAÇÃO E SINCRONIZAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION executar_comparacao_e_sincronizacao()
RETURNS TABLE(
  resumo_id BIGINT,
  registros_comparados INTEGER,
  registros_sincronizados INTEGER,
  tempo_ms INTEGER,
  mensagem TEXT
) AS $$
DECLARE
  v_data_execucao TIMESTAMP WITH TIME ZONE;
  v_inicio TIMESTAMP;
  v_fim TIMESTAMP;
  v_tempo_ms INTEGER;
  v_registros_comparados INTEGER;
  v_registros_sincronizados INTEGER;
  v_resumo_id BIGINT;
  v_qtd_status_1 INTEGER;
  v_qtd_status_2 INTEGER;
  v_qtd_status_3 INTEGER;
  v_qtd_status_4 INTEGER;
  v_total INTEGER;
BEGIN
  v_inicio := clock_timestamp();
  v_data_execucao := NOW();

  -- ============================================================
  -- ETAPA 1: LIMPAR DADOS ANTIGOS (manter últimos 30 dias)
  -- ============================================================
  DELETE FROM cruzamento_dados_banco_vs_DRE
  WHERE data_execucao < NOW() - INTERVAL '30 days';

  DELETE FROM cruzamento_resumo
  WHERE data_execucao < NOW() - INTERVAL '30 days';

  -- ============================================================
  -- ETAPA 2: EXECUTAR COMPARAÇÃO E SALVAR
  -- ============================================================

  INSERT INTO cruzamento_dados_banco_vs_DRE (
    data_execucao,
    chave_id,
    status,
    soma_dre_fabric,
    soma_transactions,
    diferenca,
    qtd_reg_dre,
    qtd_reg_trans,
    foi_sincronizado
  )
  WITH
  dre_fabric_agrupado AS (
    SELECT
      chave_id,
      SUM(valor) as valor_total,
      COUNT(*) as qtd_registros
    FROM dre_fabric
    WHERE chave_id IS NOT NULL
    GROUP BY chave_id
  ),
  transactions_agrupado AS (
    SELECT
      chave_id,
      SUM(amount) as amount_total,
      COUNT(*) as qtd_registros
    FROM transactions
    WHERE chave_id IS NOT NULL
    GROUP BY chave_id
  )
  SELECT
    v_data_execucao,
    COALESCE(df.chave_id, t.chave_id) as chave_id,
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
    ROUND(df.valor_total::NUMERIC, 2),
    ROUND(t.amount_total::NUMERIC, 2),
    ROUND((COALESCE(t.amount_total, 0) - COALESCE(df.valor_total, 0))::NUMERIC, 2),
    df.qtd_registros,
    t.qtd_registros,
    FALSE
  FROM dre_fabric_agrupado df
  FULL OUTER JOIN transactions_agrupado t ON df.chave_id = t.chave_id;

  GET DIAGNOSTICS v_registros_comparados = ROW_COUNT;

  -- ============================================================
  -- ETAPA 3: SINCRONIZAR AUTOMÁTICO (STATUS 4)
  -- ============================================================

  -- Inserir registros que só existem no DRE_FABRIC
  INSERT INTO transactions (
    id,
    chave_id,
    date,
    description,
    category,
    amount,
    conta_contabil,
    marca,
    filial,
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    type,
    scenario,
    status,
    nat_orc,
    recurring
  )
  SELECT
    gen_random_uuid()::text,
    df.chave_id,
    TO_DATE(df.anomes || '01', 'YYYYMMDD'),
    COALESCE(df.complemento, 'Sincronizado automaticamente'),
    'Geral',
    COALESCE(df.valor, 0),
    df.conta,
    df.cia,
    df.filial,
    df.fornecedor_padrao,
    df.ticket,
    df.tag1,
    df.tag2,
    df.tag3,
    COALESCE(df.type, 'REVENUE'),
    COALESCE(df.scenario, 'Real'),
    COALESCE(df.status, 'Normal'),
    NULL,
    'sim'
  FROM dre_fabric df
  WHERE df.chave_id IS NOT NULL
    AND df.anomes IS NOT NULL
    AND df.valor IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
    );

  GET DIAGNOSTICS v_registros_sincronizados = ROW_COUNT;

  -- Marcar como sincronizado
  UPDATE cruzamento_dados_banco_vs_DRE
  SET foi_sincronizado = TRUE,
      data_sincronizacao = NOW()
  WHERE data_execucao = v_data_execucao
    AND status = '4. SO TEM NA DRE_FABRIC';

  -- ============================================================
  -- ETAPA 4: CRIAR RESUMO
  -- ============================================================

  SELECT
    COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS'),
    COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'),
    COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS'),
    COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC'),
    COUNT(*)
  INTO v_qtd_status_1, v_qtd_status_2, v_qtd_status_3, v_qtd_status_4, v_total
  FROM cruzamento_dados_banco_vs_DRE
  WHERE data_execucao = v_data_execucao;

  INSERT INTO cruzamento_resumo (
    data_execucao,
    qtd_status_1,
    qtd_status_2,
    qtd_status_3,
    qtd_status_4,
    perc_status_1,
    perc_status_2,
    perc_status_3,
    perc_status_4,
    total_chaves,
    registros_sincronizados
  )
  VALUES (
    v_data_execucao,
    v_qtd_status_1,
    v_qtd_status_2,
    v_qtd_status_3,
    v_qtd_status_4,
    ROUND(v_qtd_status_1::NUMERIC / NULLIF(v_total, 0) * 100, 2),
    ROUND(v_qtd_status_2::NUMERIC / NULLIF(v_total, 0) * 100, 2),
    ROUND(v_qtd_status_3::NUMERIC / NULLIF(v_total, 0) * 100, 2),
    ROUND(v_qtd_status_4::NUMERIC / NULLIF(v_total, 0) * 100, 2),
    v_total,
    v_registros_sincronizados
  )
  RETURNING id INTO v_resumo_id;

  -- ============================================================
  -- ETAPA 5: CALCULAR TEMPO E ATUALIZAR
  -- ============================================================

  v_fim := clock_timestamp();
  v_tempo_ms := EXTRACT(MILLISECONDS FROM (v_fim - v_inicio))::INTEGER;

  UPDATE cruzamento_resumo
  SET tempo_execucao_ms = v_tempo_ms
  WHERE id = v_resumo_id;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_resumo_id,
    v_registros_comparados,
    v_registros_sincronizados,
    v_tempo_ms,
    FORMAT('✅ Comparação e sincronização executadas! %s registros comparados, %s sincronizados em %s ms',
           v_registros_comparados, v_registros_sincronizados, v_tempo_ms);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION executar_comparacao_e_sincronizacao() IS
  'Compara DRE_FABRIC vs TRANSACTIONS, salva resultado e sincroniza automaticamente registros faltantes';

-- ============================================================
-- PASSO 5: CRIAR FUNÇÃO DO TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_comparacao_e_sincronizacao()
RETURNS TRIGGER AS $$
DECLARE
  v_ultima_execucao TIMESTAMP WITH TIME ZONE;
  v_em_andamento BOOLEAN;
BEGIN
  -- Verificar status
  SELECT ultima_execucao, execucao_em_andamento
  INTO v_ultima_execucao, v_em_andamento
  FROM cruzamento_controle
  WHERE id = 1;

  -- Só executar se:
  -- 1. Não há execução em andamento
  -- 2. Última execução foi há mais de 5 minutos
  IF v_em_andamento = FALSE AND
     (v_ultima_execucao IS NULL OR v_ultima_execucao < NOW() - INTERVAL '5 minutes') THEN

    -- Marcar como em andamento
    UPDATE cruzamento_controle
    SET execucao_em_andamento = TRUE
    WHERE id = 1;

    -- Executar comparação e sincronização
    PERFORM executar_comparacao_e_sincronizacao();

    -- Atualizar controle
    UPDATE cruzamento_controle
    SET ultima_execucao = NOW(),
        execucao_em_andamento = FALSE
    WHERE id = 1;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PASSO 6: CRIAR TRIGGER NO DRE_FABRIC
-- ============================================================

DROP TRIGGER IF EXISTS trigger_sincronizacao_automatica ON dre_fabric;

CREATE TRIGGER trigger_sincronizacao_automatica
  AFTER INSERT OR UPDATE ON dre_fabric
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_comparacao_e_sincronizacao();

COMMENT ON TRIGGER trigger_sincronizacao_automatica ON dre_fabric IS
  'Dispara comparação e sincronização automática após atualizações no DRE_FABRIC';

-- ============================================================
-- PASSO 7: CRIAR VIEWS PARA CONSULTA
-- ============================================================

-- View da última comparação
CREATE OR REPLACE VIEW vw_ultima_comparacao_cruzamento AS
SELECT *
FROM cruzamento_dados_banco_vs_DRE
WHERE data_execucao = (SELECT MAX(data_execucao) FROM cruzamento_dados_banco_vs_DRE)
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END,
  ABS(COALESCE(diferenca, 0)) DESC;

-- View do último resumo
CREATE OR REPLACE VIEW vw_ultimo_resumo_cruzamento AS
SELECT *
FROM cruzamento_resumo
ORDER BY data_execucao DESC
LIMIT 1;

-- View histórico de execuções
CREATE OR REPLACE VIEW vw_historico_cruzamento AS
SELECT
  data_execucao,
  total_chaves,
  qtd_status_1 as valores_iguais,
  qtd_status_2 as valores_diferentes,
  qtd_status_3 as so_transactions,
  qtd_status_4 as so_dre_fabric,
  perc_status_1 as perc_ok,
  registros_sincronizados,
  tempo_execucao_ms,
  CASE
    WHEN qtd_status_4 = 0 AND qtd_status_2 = 0 THEN '✅ Perfeito'
    WHEN registros_sincronizados > 0 THEN '🔄 Sincronizado'
    ELSE '⚠️ Divergências'
  END as situacao
FROM cruzamento_resumo
ORDER BY data_execucao DESC;

-- ============================================================
-- PASSO 8: FUNÇÃO PARA EXECUTAR MANUALMENTE
-- ============================================================

CREATE OR REPLACE FUNCTION executar_sincronizacao_manual()
RETURNS TABLE(
  resumo_id BIGINT,
  registros_comparados INTEGER,
  registros_sincronizados INTEGER,
  tempo_ms INTEGER,
  mensagem TEXT
) AS $$
BEGIN
  -- Resetar controle
  UPDATE cruzamento_controle
  SET ultima_execucao = NULL,
      execucao_em_andamento = FALSE
  WHERE id = 1;

  -- Executar
  RETURN QUERY SELECT * FROM executar_comparacao_e_sincronizacao();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Desabilitar automação
CREATE OR REPLACE FUNCTION desabilitar_sincronizacao_automatica()
RETURNS TEXT AS $$
BEGIN
  ALTER TABLE dre_fabric DISABLE TRIGGER trigger_sincronizacao_automatica;
  RETURN '⏸️ Sincronização automática desabilitada';
END;
$$ LANGUAGE plpgsql;

-- Habilitar automação
CREATE OR REPLACE FUNCTION habilitar_sincronizacao_automatica()
RETURNS TEXT AS $$
BEGIN
  ALTER TABLE dre_fabric ENABLE TRIGGER trigger_sincronizacao_automatica;
  RETURN '▶️ Sincronização automática habilitada';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '
================================================================================
✅ AUTOMAÇÃO COMPLETA CRIADA COM SUCESSO!
================================================================================

📋 O QUE FOI CRIADO:

1. Tabelas:
   - cruzamento_dados_banco_vs_DRE (detalhes da comparação)
   - cruzamento_resumo (resumo de cada execução)
   - cruzamento_controle (controle do trigger)

2. Trigger:
   - Dispara AUTOMÁTICO após INSERT/UPDATE no dre_fabric
   - Executa no máximo 1x a cada 5 minutos

3. Funcionalidades:
   ✅ Compara DRE_FABRIC vs TRANSACTIONS
   ✅ Salva resultado em cruzamento_dados_banco_vs_DRE
   ✅ Sincroniza AUTOMÁTICO os registros do status 4

4. Views:
   - vw_ultima_comparacao_cruzamento
   - vw_ultimo_resumo_cruzamento
   - vw_historico_cruzamento

================================================================================
📖 COMO USAR:
================================================================================

-- Ver última comparação:
SELECT * FROM vw_ultima_comparacao_cruzamento LIMIT 20;

-- Ver resumo:
SELECT * FROM vw_ultimo_resumo_cruzamento;

-- Ver histórico:
SELECT * FROM vw_historico_cruzamento;

-- Executar manualmente:
SELECT * FROM executar_sincronizacao_manual();

-- Desabilitar automação:
SELECT desabilitar_sincronizacao_automatica();

-- Habilitar automação:
SELECT habilitar_sincronizacao_automatica();

================================================================================
🔄 FLUXO AUTOMÁTICO:
================================================================================

1. Você faz: INSERT INTO dre_fabric ...
2. Trigger dispara automaticamente
3. Sistema compara DRE_FABRIC vs TRANSACTIONS
4. Salva resultado em cruzamento_dados_banco_vs_DRE
5. Insere automaticamente registros do status 4 (SO TEM NA DRE_FABRIC)
6. Marca registros sincronizados

================================================================================
⚡ PERFORMANCE:
================================================================================

- Histórico mantém últimos 30 dias
- Trigger com controle de frequência (máx 1x/5min)
- Índices otimizados
- Execução assíncrona (não bloqueia INSERT/UPDATE)

================================================================================
';
END $$;
