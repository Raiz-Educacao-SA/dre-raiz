-- ============================================================
-- RPCs para filtros de TransactionsView — SELECT DISTINCT server-side
-- Substitui 4 full-table-scans (50K+ rows cada) por 1 RPC leve
-- ============================================================

-- 1. get_transaction_filter_options()
--    Retorna DISTINCT tag01[], tag02[], tag03[] em uma única chamada
CREATE OR REPLACE FUNCTION get_transaction_filter_options()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'tag01', COALESCE((
      SELECT jsonb_agg(t.tag01 ORDER BY t.tag01)
      FROM (SELECT DISTINCT tag01 FROM transactions WHERE tag01 IS NOT NULL AND tag01 <> '') t
    ), '[]'::jsonb),
    'tag02', COALESCE((
      SELECT jsonb_agg(t.tag02 ORDER BY t.tag02)
      FROM (SELECT DISTINCT tag02 FROM transactions WHERE tag02 IS NOT NULL AND tag02 <> '') t
    ), '[]'::jsonb),
    'tag03', COALESCE((
      SELECT jsonb_agg(t.tag03 ORDER BY t.tag03)
      FROM (SELECT DISTINCT tag03 FROM transactions WHERE tag03 IS NOT NULL AND tag03 <> '') t
    ), '[]'::jsonb)
  );
$$;

-- 2. get_conta_contabil_options()
--    Retorna contas da tabela tags com cod_conta de exatamente 14 caracteres
CREATE OR REPLACE FUNCTION get_conta_contabil_options()
RETURNS SETOF jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'cod_conta',    cod_conta,
    'nome_nat_orc', COALESCE(nome_nat_orc, nat_orc),
    'tag0',         tag0,
    'tag01',        tag1,
    'tag02',        tag2,
    'tag03',        tag3
  )
  FROM tags
  WHERE cod_conta IS NOT NULL AND LENGTH(cod_conta) = 14
  ORDER BY cod_conta;
$$;

-- 3. get_tag03_for_tag01s(p_tag01s text[])
--    Retorna tag03 distintos para um array de tag01 (cascata tag01→tag03)
CREATE OR REPLACE FUNCTION get_tag03_for_tag01s(p_tag01s text[])
RETURNS text[]
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT tag03
      FROM transactions
      WHERE tag01 = ANY(p_tag01s)
        AND tag03 IS NOT NULL
        AND tag03 <> ''
      ORDER BY tag03
    ),
    '{}'::text[]
  );
$$;

-- Índice para acelerar cascata tag01→tag03 (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_transactions_tag01_tag03'
  ) THEN
    CREATE INDEX idx_transactions_tag01_tag03
    ON transactions (tag01, tag03)
    WHERE tag01 IS NOT NULL AND tag03 IS NOT NULL;
  END IF;
END $$;

-- Índice para acelerar DISTINCT tag01 (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_transactions_tag01'
  ) THEN
    CREATE INDEX idx_transactions_tag01
    ON transactions (tag01)
    WHERE tag01 IS NOT NULL;
  END IF;
END $$;

-- Índice para acelerar DISTINCT tag02 (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_transactions_tag02'
  ) THEN
    CREATE INDEX idx_transactions_tag02
    ON transactions (tag02)
    WHERE tag02 IS NOT NULL;
  END IF;
END $$;

-- Índice para acelerar DISTINCT tag03 (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_transactions_tag03'
  ) THEN
    CREATE INDEX idx_transactions_tag03
    ON transactions (tag03)
    WHERE tag03 IS NOT NULL;
  END IF;
END $$;
