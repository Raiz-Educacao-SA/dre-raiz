-- ============================================
-- RESUMO RÁPIDO - APENAS OS NÚMEROS PRINCIPAIS
-- ============================================
-- Retorna apenas 1 linha com o resumo
-- Data: 2026-02-03
-- ============================================

SELECT
  -- Totais
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as total_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_transactions,

  -- Contagem por status
  COUNT(*) FILTER (
    WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
    AND ROUND(df.valor::NUMERIC, 2) = ROUND(t.amount::NUMERIC, 2)
  ) as ok_valores_iguais,

  COUNT(*) FILTER (
    WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
    AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
  ) as valores_diferentes,

  COUNT(*) FILTER (
    WHERE df.chave_id IS NOT NULL AND t.chave_id IS NULL
  ) as faltam_em_transactions,

  COUNT(*) FILTER (
    WHERE df.chave_id IS NULL AND t.chave_id IS NOT NULL
  ) as extras_em_transactions,

  -- Somas de valores
  ROUND(SUM(df.valor) FILTER (
    WHERE df.chave_id IS NOT NULL AND t.chave_id IS NULL
  )::NUMERIC, 2) as soma_valores_faltantes,

  ROUND(SUM(ABS(df.valor - t.amount)) FILTER (
    WHERE df.chave_id IS NOT NULL AND t.chave_id IS NOT NULL
    AND ROUND(df.valor::NUMERIC, 2) != ROUND(t.amount::NUMERIC, 2)
  )::NUMERIC, 2) as soma_diferencas

FROM dre_fabric df
FULL OUTER JOIN transactions t ON df.chave_id = t.chave_id;
