-- ═══════════════════════════════════════════════════════════════════
-- FIX: Adicionar SECURITY DEFINER em TODAS as RPCs que consultam
-- tabelas com RLS (transactions, transactions_orcado, etc.)
-- Sem SECURITY DEFINER, RLS bloqueia e retorna [] vazio
-- ═══════════════════════════════════════════════════════════════════


-- 1. get_transaction_filter_options (tag01/tag02/tag03 DISTINCT)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_transaction_filter_options()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT jsonb_build_object(
    'tag01', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (SELECT DISTINCT tag01 AS val FROM transactions WHERE tag01 IS NOT NULL AND tag01 <> '') t
    ), '[]'::jsonb),
    'tag02', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (SELECT DISTINCT tag02 AS val FROM transactions WHERE tag02 IS NOT NULL AND tag02 <> '') t
    ), '[]'::jsonb),
    'tag03', COALESCE((
      SELECT jsonb_agg(val ORDER BY val)
      FROM (SELECT DISTINCT tag03 AS val FROM transactions WHERE tag03 IS NOT NULL AND tag03 <> '') t
    ), '[]'::jsonb)
  );
$$;


-- 2. get_conta_contabil_options (consulta tabela tags, não transactions — mas por segurança)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_conta_contabil_options()
RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
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


-- 3. get_distinct_marcas_filiais (cascata marca/filial)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_distinct_marcas_filiais()
RETURNS TABLE(marca text, nome_filial text)
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT DISTINCT t.marca, t.nome_filial
  FROM transactions t
  WHERE t.marca IS NOT NULL AND t.nome_filial IS NOT NULL
  ORDER BY t.marca, t.nome_filial;
$$;


-- 4. get_tag02_for_tag01s (cascata tag01→tag02)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag02_for_tag01s(p_tag01s text[])
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag02 FROM transactions WHERE tag01 = ANY(p_tag01s) AND tag02 IS NOT NULL ORDER BY tag02),
    '{}'::text[]
  );
$$;


-- 5. get_tag03_for_tag02s (cascata tag02→tag03)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag03_for_tag02s(p_tag02s text[])
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag03 FROM transactions WHERE tag02 = ANY(p_tag02s) AND tag03 IS NOT NULL ORDER BY tag03),
    '{}'::text[]
  );
$$;


-- 6. get_tag03_for_tag01s (cascata tag01→tag03)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag03_for_tag01s(p_tag01s text[])
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag03 FROM transactions WHERE tag01 = ANY(p_tag01s) AND tag03 IS NOT NULL ORDER BY tag03),
    '{}'::text[]
  );
$$;
