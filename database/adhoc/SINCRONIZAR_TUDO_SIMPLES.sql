-- ================================================================================
-- SINCRONIZAÇÃO ULTRA SIMPLES: DRE_FABRIC → TRANSACTIONS
-- ================================================================================
-- Este SQL faz UPSERT direto sem função, sem complicação
-- Execute este SQL completo no Supabase SQL Editor
-- ================================================================================

-- UPSERT direto de TODOS os registros
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
  updated_at = EXCLUDED.updated_at;

-- Verificar resultado
SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as dre_fabric_elegiveis,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as transactions_sincronizados,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as gap,
  CASE
    WHEN (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) =
         (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ 100% SINCRONIZADO!'
    ELSE '⚠️ Ainda há gap'
  END as situacao;

-- ================================================================================
-- PRONTO! A sincronização foi executada.
-- Veja o resultado acima.
-- ================================================================================
