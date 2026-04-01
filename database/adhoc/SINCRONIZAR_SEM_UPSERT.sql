-- ================================================================================
-- SINCRONIZAÇÃO SEM UPSERT: DRE_FABRIC → TRANSACTIONS
-- ================================================================================
-- Insere apenas registros NOVOS (que não existem em transactions)
-- Não usa ON CONFLICT, portanto não precisa de índice único
-- ================================================================================

-- Inserir apenas registros que NÃO existem
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
  -- ⭐ Apenas registros que NÃO existem em transactions
  AND NOT EXISTS (
    SELECT 1
    FROM transactions t
    WHERE t.chave_id = df.chave_id
  );

-- Verificar resultado
SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as dre_fabric_elegiveis,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as transactions_sincronizados,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as gap_restante,
  CASE
    WHEN (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) =
         (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ 100% SINCRONIZADO!'
    ELSE '⚠️ Ainda há gap (pode haver duplicatas)'
  END as situacao;

-- ================================================================================
-- PRONTO! Registros novos foram inseridos.
-- ================================================================================
