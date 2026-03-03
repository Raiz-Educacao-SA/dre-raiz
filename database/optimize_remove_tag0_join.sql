-- ═══════════════════════════════════════════════════════════════════
-- optimize_remove_tag0_join.sql
-- Remove LEFT JOIN tag0_map de get_soma_tags e dre_agg
-- tag0 já existe como coluna nas 3 tabelas, mantido por trigger
-- Ganho: elimina 3 JOINs + 6 LOWER(TRIM()) por chamada
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

SET statement_timeout = 0;

-- ══════════════════════════════════════════════════════════════
-- PARTE 1: Recriar dre_agg SEM JOIN tag0_map (usa t.tag0 direto)
-- ══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- BLOCO 1: Real
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 2: Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Orçado'                                  AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_orcado t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 3: A-1 (datas +1 ano para alinhar com período atual)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char((t.date::date) + interval '1 year', 'YYYY-MM') AS year_month,
    'A-1'                                     AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_ano_anterior t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11;

-- Índices para performance
CREATE INDEX ON dre_agg (year_month, scenario);
CREATE INDEX ON dre_agg (tag0, scenario);
CREATE INDEX ON dre_agg (tag02, scenario);
CREATE INDEX ON dre_agg (tag03, scenario);
CREATE INDEX ON dre_agg (marca, nome_filial);
CREATE INDEX ON dre_agg (conta_contabil, scenario, year_month);
CREATE INDEX ON dre_agg (recurring);

-- ══════════════════════════════════════════════════════════════
-- PARTE 2: Recriar get_soma_tags SEM JOIN tag0_map (usa t.tag0 direto)
-- ══════════════════════════════════════════════════════════════

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
AS $$

  -- 1. Real
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
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
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
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
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
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO anon;

-- ══════════════════════════════════════════════════════════════
-- PARTE 3: get_dre_dimension — sem mudança (já usa dre_agg)
-- Recriando apenas para garantir consistência após DROP da view
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text);
DROP FUNCTION IF EXISTS public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text);

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

-- ══════════════════════════════════════════════════════════════
-- PARTE 4: get_dre_filter_options — sem mudança (já usa dre_agg)
-- Recriando apenas para garantir consistência após DROP da view
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[], tags02 text[], tags03 text[])
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ARRAY(
      SELECT DISTINCT marca FROM dre_agg
      WHERE marca IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY marca
    ) AS marcas,
    ARRAY(
      SELECT DISTINCT nome_filial FROM dre_agg
      WHERE nome_filial IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY nome_filial
    ) AS nome_filiais,
    ARRAY(
      SELECT DISTINCT tag01 FROM dre_agg
      WHERE tag01 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag01
    ) AS tags01,
    ARRAY(
      SELECT DISTINCT tag02 FROM dre_agg
      WHERE tag02 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag02
    ) AS tags02,
    ARRAY(
      SELECT DISTINCT tag03 FROM dre_agg
      WHERE tag03 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag03
    ) AS tags03;
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO anon;

RESET statement_timeout;
