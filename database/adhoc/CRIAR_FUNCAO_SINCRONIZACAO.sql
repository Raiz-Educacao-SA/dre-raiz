-- ================================================================================
-- CRIAR FUNÇÃO DE SINCRONIZAÇÃO: DRE_FABRIC → TRANSACTIONS
-- ================================================================================
-- Este script cria a função para sincronizar dados entre as tabelas
-- Versão simplificada e funcional
-- ================================================================================

-- ================================================================================
-- PASSO 1: CRIAR ÍNDICE ÚNICO (IMPORTANTE!)
-- ================================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_chave_id_unique
ON transactions(chave_id)
WHERE chave_id IS NOT NULL;

-- ================================================================================
-- PASSO 2: CRIAR FUNÇÃO DE SINCRONIZAÇÃO
-- ================================================================================

CREATE OR REPLACE FUNCTION sync_dre_fabric_to_transactions(
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE(
  total_processados BIGINT,
  novos_inseridos BIGINT,
  atualizados BIGINT,
  erros BIGINT
) AS $$
DECLARE
  v_processados BIGINT := 0;
  v_inseridos BIGINT := 0;
  v_atualizados BIGINT := 0;
  v_erros BIGINT := 0;
BEGIN
  -- Sincronizar registros do dre_fabric que ainda não estão em transactions
  -- ou que foram atualizados mais recentemente
  WITH dados_fabric AS (
    SELECT
      -- Gerar UUID único
      gen_random_uuid()::TEXT as id,

      -- Converter anomes para date
      CASE
        WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6 THEN
          TO_DATE(df.anomes, 'YYYYMM')::TEXT
        ELSE
          NULL
      END as date,

      -- Mapeamento direto
      df.complemento as description,
      df.conta as category,
      df.valor as amount,
      COALESCE(df.type, '99. CADASTRAR TAG0') as type,
      COALESCE(df.scenario, 'Real') as scenario,
      COALESCE(df.status, 'Normal') as status,
      df.filial,
      df.cia as marca,
      df.tag1 as tag01,
      df.tag2 as tag02,
      df.tag3 as tag03,
      df.fornecedor_padrao as vendor,
      df.ticket,
      df.tag_orc as nat_orc,
      df.recorrente as recurring,
      df.chave_id as chave_id,
      df.created_at,
      df.updated_at

    FROM dre_fabric df
    WHERE df.type IS NOT NULL
      AND df.chave_id IS NOT NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
        )
        OR
        EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.chave_id = df.chave_id
          AND df.updated_at > t.updated_at
        )
      )
    ORDER BY df.created_at DESC
    LIMIT p_limit
  ),
  insert_result AS (
    INSERT INTO transactions (
      id, date, description, category, amount, type, scenario, status,
      filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
      recurring, chave_id, created_at, updated_at
    )
    SELECT
      id, date, description, category, amount, type, scenario, status,
      filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
      recurring, chave_id, created_at, updated_at
    FROM dados_fabric
    ON CONFLICT (chave_id)
    DO UPDATE SET
      date = EXCLUDED.date,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      amount = EXCLUDED.amount,
      type = EXCLUDED.type,
      scenario = EXCLUDED.scenario,
      status = EXCLUDED.status,
      filial = EXCLUDED.filial,
      marca = EXCLUDED.marca,
      tag01 = EXCLUDED.tag01,
      tag02 = EXCLUDED.tag02,
      tag03 = EXCLUDED.tag03,
      vendor = EXCLUDED.vendor,
      ticket = EXCLUDED.ticket,
      nat_orc = EXCLUDED.nat_orc,
      recurring = EXCLUDED.recurring,
      updated_at = EXCLUDED.updated_at
    RETURNING
      CASE WHEN xmax = 0 THEN 1 ELSE 0 END as inserted,
      1 as processed
  )
  SELECT
    COUNT(*) as total,
    SUM(inserted) as novos,
    SUM(CASE WHEN inserted = 0 THEN 1 ELSE 0 END) as atualizados
  INTO v_processados, v_inseridos, v_atualizados
  FROM insert_result;

  RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;

EXCEPTION
  WHEN OTHERS THEN
    v_erros := 1;
    RAISE NOTICE 'Erro na sincronização: %', SQLERRM;
    RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- PASSO 3: ADICIONAR COMENTÁRIO NA FUNÇÃO
-- ================================================================================

COMMENT ON FUNCTION sync_dre_fabric_to_transactions IS
'Sincroniza registros novos ou atualizados do dre_fabric para transactions.
Usa UPSERT baseado em chave_id para evitar duplicatas.
Parâmetro p_limit: NULL = todos os registros, ou número para limitar';

-- ================================================================================
-- PASSO 4: CRIAR VIEW DE MONITORAMENTO
-- ================================================================================

CREATE OR REPLACE VIEW vw_sync_status AS
SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as total_dre_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_transactions,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as diferenca,
  (SELECT MAX(updated_at) FROM dre_fabric) as ultima_atualizacao_fabric,
  (SELECT MAX(updated_at) FROM transactions) as ultima_atualizacao_transactions;

-- ================================================================================
-- TESTE (OPCIONAL - DESCOMENTE PARA TESTAR COM 10 REGISTROS)
-- ================================================================================

-- SELECT * FROM sync_dre_fabric_to_transactions(10);

-- ================================================================================
-- MENSAGEM FINAL
-- ================================================================================

SELECT
  '✅ FUNÇÃO CRIADA COM SUCESSO!' as status,
  'Execute: SELECT * FROM sync_dre_fabric_to_transactions(NULL);' as proxima_acao;

-- ================================================================================
-- FIM
-- ================================================================================
