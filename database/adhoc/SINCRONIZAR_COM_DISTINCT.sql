-- ================================================================================
-- SINCRONIZAÇÃO COM DISTINCT: Evita duplicatas do dre_fabric
-- ================================================================================
-- Usa DISTINCT ON para pegar apenas 1 registro por chave_id
-- Evita tentar inserir duplicatas
-- ================================================================================

-- Inserir apenas 1 registro por chave_id (o mais recente)
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
SELECT DISTINCT ON (df.chave_id)
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
  -- Apenas os que NÃO existem em transactions
  AND NOT EXISTS (
    SELECT 1
    FROM transactions t
    WHERE t.chave_id = df.chave_id
  )
-- ⭐ DISTINCT ON: pega apenas 1 por chave_id (o mais recente)
ORDER BY df.chave_id, df.updated_at DESC;

-- Verificar resultado
SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as unicos_dre_fabric,
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as unicos_transactions,
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as gap_final,
  CASE
    WHEN (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) =
         (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ 100% SINCRONIZADO!'
    ELSE '⚠️ Ainda há registros faltantes'
  END as situacao;

-- ================================================================================
-- PRONTO! Sincronização com DISTINCT para evitar duplicatas.
-- ================================================================================
