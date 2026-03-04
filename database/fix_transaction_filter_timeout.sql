-- ============================================================
-- FIX: get_transaction_filter_options — statement timeout
-- Problema: 3x SELECT DISTINCT sem filtro em tabela grande → timeout
-- Solução: SET statement_timeout na função + índices otimizados + ANALYZE
-- ============================================================

-- 1. Recriar função com timeout estendido
CREATE OR REPLACE FUNCTION get_transaction_filter_options()
RETURNS jsonb
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  SELECT jsonb_build_object(
    'tag01', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (
        SELECT DISTINCT tag01 AS val
        FROM transactions
        WHERE tag01 IS NOT NULL AND tag01 <> ''
      ) t
    ), '[]'::jsonb),
    'tag02', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (
        SELECT DISTINCT tag02 AS val
        FROM transactions
        WHERE tag02 IS NOT NULL AND tag02 <> ''
      ) t
    ), '[]'::jsonb),
    'tag03', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (
        SELECT DISTINCT tag03 AS val
        FROM transactions
        WHERE tag03 IS NOT NULL AND tag03 <> ''
      ) t
    ), '[]'::jsonb)
  );
$$;

-- 2. Garantir índices otimizados (com filtro <> '' para match exato)
DROP INDEX IF EXISTS idx_transactions_tag01;
DROP INDEX IF EXISTS idx_transactions_tag02;
DROP INDEX IF EXISTS idx_transactions_tag03;

CREATE INDEX idx_transactions_tag01 ON transactions (tag01) WHERE tag01 IS NOT NULL AND tag01 <> '';
CREATE INDEX idx_transactions_tag02 ON transactions (tag02) WHERE tag02 IS NOT NULL AND tag02 <> '';
CREATE INDEX idx_transactions_tag03 ON transactions (tag03) WHERE tag03 IS NOT NULL AND tag03 <> '';

-- 3. Atualizar estatísticas para o planner usar os índices
ANALYZE transactions;
