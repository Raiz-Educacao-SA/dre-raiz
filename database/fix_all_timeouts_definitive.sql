-- ═══════════════════════════════════════════════════════════════════
-- FIX DEFINITIVO: SET statement_timeout = '60s' em TODAS as RPCs
-- ═══════════════════════════════════════════════════════════════════
-- No Supabase, ALTER ROLE é IGNORADO pelo PgBouncer (connection pooler).
-- A ÚNICA forma GARANTIDA é SET statement_timeout DENTRO de cada função.
-- Este arquivo recria TODAS as RPCs do projeto com timeout de 60s.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. get_soma_tags — DRE Gerencial (página principal)
-- ═══════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
  WHERE
    (p_month_from   IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 2. get_soma_tags_by_marca — PPT / Variância por marca
-- ═══════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS get_soma_tags_by_marca(text, text[], text);

CREATE OR REPLACE FUNCTION get_soma_tags_by_marca(
  p_month      text   DEFAULT NULL,
  p_marcas     text[] DEFAULT NULL,
  p_recurring  text   DEFAULT NULL
)
RETURNS TABLE(tag0 text, marca text, scenario text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'Real'                                AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month     IS NULL OR to_char(t.date::date, 'YYYY-MM') = p_month)
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY 1, 2

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'Orçado'                              AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions_orcado t
  WHERE
    (p_month     IS NULL OR to_char(t.date, 'YYYY-MM') = p_month)
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY 1, 2

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'A-1'                                 AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions_ano_anterior t
  WHERE
    (p_month     IS NULL OR to_char(t.date, 'MM') = substring(p_month, 6, 2))
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY 1, 2
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags_by_marca(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags_by_marca(text, text[], text) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 3. get_variance_snapshot — Justificativas de Desvios
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_variance_snapshot(
  p_year_month text,
  p_marcas     text[] DEFAULT NULL,
  p_recurring  text   DEFAULT 'Sim'
)
RETURNS TABLE(tag0 text, tag01 text, tag02 text, marca text, scenario text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02, t.marca, 'Real'::text, SUM(t.amount)
  FROM transactions t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02, t.marca, 'Orçado'::text, SUM(t.amount)
  FROM transactions_orcado t
  WHERE to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02, t.marca, 'A-1'::text, SUM(t.amount)
  FROM transactions_ano_anterior t
  WHERE to_char((t.date::date) + interval '1 year', 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4
$$;

GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 4. get_dre_dimension — Drill-down DRE
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dre_dimension(
  p_month_from      text    DEFAULT NULL,
  p_month_to        text    DEFAULT NULL,
  p_conta_contabils text[]  DEFAULT NULL,
  p_scenario        text    DEFAULT NULL,
  p_dimension       text    DEFAULT 'vendor',
  p_marcas          text[]  DEFAULT NULL,
  p_nome_filiais    text[]  DEFAULT NULL,
  p_tags01          text[]  DEFAULT NULL,
  p_tags02          text[]  DEFAULT NULL,
  p_tags03          text[]  DEFAULT NULL,
  p_tag0            text    DEFAULT NULL,
  p_recurring       text    DEFAULT NULL
)
RETURNS TABLE(dimension_value text, year_month text, total_amount numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $function$
BEGIN
  IF p_dimension NOT IN ('tag0','tag01','tag02','tag03','conta_contabil','vendor','marca','nome_filial') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
       year_month,
       SUM(total_amount) AS total_amount
     FROM dre_agg
     WHERE
       ($1 IS NULL OR year_month >= $1)
       AND ($2 IS NULL OR year_month <= $2)
       AND ($3 IS NULL OR conta_contabil = ANY($3))
       AND ($4 IS NULL OR scenario = $4)
       AND ($5 IS NULL OR marca = ANY($5))
       AND ($6 IS NULL OR nome_filial = ANY($6))
       AND ($7 IS NULL OR tag01 = ANY($7))
       AND ($8 IS NULL OR tag02 = ANY($8))
       AND ($9 IS NULL OR tag03 = ANY($9))
       AND ($10 IS NULL OR tag0 = $10)
       AND ($11 IS NULL OR INITCAP(recurring) = INITCAP($11))
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), year_month',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03, p_tag0, p_recurring;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 5. get_dre_filter_options — Filtros do drill-down
-- ═══════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[], tags02 text[], tags03 text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT
    ARRAY(SELECT DISTINCT marca FROM dre_agg WHERE marca IS NOT NULL
      AND (p_month_from IS NULL OR year_month >= p_month_from)
      AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY marca) AS marcas,
    ARRAY(SELECT DISTINCT nome_filial FROM dre_agg WHERE nome_filial IS NOT NULL
      AND (p_month_from IS NULL OR year_month >= p_month_from)
      AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY nome_filial) AS nome_filiais,
    ARRAY(SELECT DISTINCT tag01 FROM dre_agg WHERE tag01 IS NOT NULL
      AND (p_month_from IS NULL OR year_month >= p_month_from)
      AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag01) AS tags01,
    ARRAY(SELECT DISTINCT tag02 FROM dre_agg WHERE tag02 IS NOT NULL
      AND (p_month_from IS NULL OR year_month >= p_month_from)
      AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag02) AS tags02,
    ARRAY(SELECT DISTINCT tag03 FROM dre_agg WHERE tag03 IS NOT NULL
      AND (p_month_from IS NULL OR year_month >= p_month_from)
      AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag03) AS tags03;
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 6. get_transaction_filter_options — Filtros de Lançamentos
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_transaction_filter_options()
RETURNS jsonb
LANGUAGE sql STABLE
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


-- ═══════════════════════════════════════════════════════════════════
-- 7. get_conta_contabil_options — Filtro conta contábil
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_conta_contabil_options()
RETURNS SETOF jsonb
LANGUAGE sql STABLE
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


-- ═══════════════════════════════════════════════════════════════════
-- 8. get_distinct_marcas_filiais — Cascata marca/filial
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_distinct_marcas_filiais()
RETURNS TABLE(marca text, nome_filial text)
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  SELECT DISTINCT t.marca, t.nome_filial
  FROM transactions t
  WHERE t.marca IS NOT NULL AND t.nome_filial IS NOT NULL
  ORDER BY t.marca, t.nome_filial;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 9. get_tag02_for_tag01s — Cascata tag01→tag02
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag02_for_tag01s(p_tag01s text[])
RETURNS text[]
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag02 FROM transactions WHERE tag01 = ANY(p_tag01s) AND tag02 IS NOT NULL ORDER BY tag02),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 10. get_tag03_for_tag02s — Cascata tag02→tag03
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag03_for_tag02s(p_tag02s text[])
RETURNS text[]
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag03 FROM transactions WHERE tag02 = ANY(p_tag02s) AND tag03 IS NOT NULL ORDER BY tag03),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 11. get_tag03_for_tag01s — Cascata tag01→tag03
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_tag03_for_tag01s(p_tag01s text[])
RETURNS text[]
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag03 FROM transactions WHERE tag01 = ANY(p_tag01s) AND tag03 IS NOT NULL ORDER BY tag03),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 12. ANALYZE em todas as tabelas (atualizar planner com índices)
-- ═══════════════════════════════════════════════════════════════════
ANALYZE transactions;
ANALYZE transactions_orcado;
ANALYZE transactions_ano_anterior;
ANALYZE tags;
ANALYZE tag0_map;
ANALYZE dre_agg;


-- ═══════════════════════════════════════════════════════════════════
-- 13. Timeout global (backup — PgBouncer pode ignorar)
-- ═══════════════════════════════════════════════════════════════════
ALTER ROLE authenticator SET statement_timeout = '120s';
ALTER ROLE authenticated SET statement_timeout = '120s';
ALTER ROLE anon SET statement_timeout = '120s';
