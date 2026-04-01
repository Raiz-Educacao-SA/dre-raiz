-- ================================================================================
-- FUNÇÃO SIMPLIFICADA DE SINCRONIZAÇÃO
-- ================================================================================
-- Remove lógica complexa (NOT EXISTS) que estava causando erro
-- Sincroniza TUDO usando UPSERT (ON CONFLICT)
-- ================================================================================

-- Remover função antiga
DROP FUNCTION IF EXISTS sync_dre_fabric_to_transactions(INTEGER);

-- Criar função simplificada
CREATE OR REPLACE FUNCTION sync_dre_fabric_to_transactions(p_limit INTEGER DEFAULT NULL)
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
  -- UPSERT direto: Insere novos ou atualiza existentes
  WITH insert_result AS (
    INSERT INTO transactions (
      id,
      date,
      description,
      category,
      amount,
      type,
      scenario,
      status,
      filial,
      marca,
      tag01,
      tag02,
      tag03,
      vendor,
      ticket,
      nat_orc,
      recurring,
      chave_id,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid()::TEXT,
      CASE
        WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6
        THEN TO_DATE(df.anomes, 'YYYYMM')::TEXT
        ELSE NULL
      END,
      df.complemento,
      df.conta,
      df.valor,
      COALESCE(df.type, '99. CADASTRAR TAG0'),
      COALESCE(df.scenario, 'Real'),
      COALESCE(df.status, 'Normal'),
      df.filial,
      df.cia,
      df.tag1,
      df.tag2,
      df.tag3,
      df.fornecedor_padrao,
      df.ticket,
      df.tag_orc,
      df.recorrente,
      df.chave_id,
      df.created_at,
      df.updated_at
    FROM dre_fabric df
    WHERE df.type IS NOT NULL
      AND df.chave_id IS NOT NULL
    LIMIT p_limit
    ON CONFLICT (chave_id) DO UPDATE SET
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
      CASE WHEN xmax = 0 THEN 1 ELSE 0 END as inserted
  )
  SELECT
    COUNT(*),
    SUM(inserted),
    SUM(CASE WHEN inserted = 0 THEN 1 ELSE 0 END)
  INTO v_processados, v_inseridos, v_atualizados
  FROM insert_result;

  RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;

EXCEPTION
  WHEN OTHERS THEN
    v_erros := 1;
    RAISE NOTICE 'ERRO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;
END;
$$ LANGUAGE plpgsql;

-- Mensagem
SELECT '✅ FUNÇÃO SIMPLIFICADA CRIADA!' as status;

-- ================================================================================
-- AGORA EXECUTE A SINCRONIZAÇÃO:
-- SELECT * FROM sync_dre_fabric_to_transactions(NULL);
-- ================================================================================
