-- ═══════════════════════════════════════════════════════════════════
-- FIX: Vendor matching case-insensitive + TRIM
-- Problema: vendor em Jan = "FORNECEDOR X" e em Fev = "Fornecedor X"
-- ou com espaço extra. O = ANY() é case-sensitive e falha.
--
-- Solução: UPPER(TRIM(t.vendor)) comparado com array normalizado
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. search_vendors — busca em todas tabelas, retorna DISTINCT
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS search_vendors(text);

CREATE OR REPLACE FUNCTION search_vendors(p_search text DEFAULT NULL)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT vendor FROM (
    SELECT DISTINCT TRIM(vendor) AS vendor FROM transactions
    WHERE vendor IS NOT NULL AND TRIM(vendor) <> ''
      AND (scenario IS NULL OR scenario = 'Real')
    UNION
    SELECT DISTINCT TRIM(vendor) AS vendor FROM transactions_manual
    WHERE vendor IS NOT NULL AND TRIM(vendor) <> ''
      AND (scenario IS NULL OR scenario = 'Real')
  ) AS all_vendors
  WHERE (p_search IS NULL OR vendor ILIKE '%' || p_search || '%')
  ORDER BY vendor
  LIMIT 50
$$;

GRANT EXECUTE ON FUNCTION search_vendors(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_vendors(text) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 2. get_soma_tags_by_vendor — vendor matching com UPPER(TRIM())
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]);

CREATE OR REPLACE FUNCTION get_soma_tags_by_vendor(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL,
  p_vendor       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1a. Real (transactions) — exclui 'Original' + override_contabil
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
    AND (p_vendor       IS NULL OR UPPER(TRIM(t.vendor)) = ANY(SELECT UPPER(TRIM(unnest(p_vendor)))))
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY 1, 2, 3, to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions_manual t
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
    AND (p_vendor       IS NULL OR UPPER(TRIM(t.vendor)) = ANY(SELECT UPPER(TRIM(unnest(p_vendor)))))
  GROUP BY 1, 2, 3, to_char(t.date::date, 'YYYY-MM')

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
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR UPPER(TRIM(t.vendor)) = ANY(SELECT UPPER(TRIM(unnest(p_vendor)))))
  GROUP BY 1, 2, 3, to_char(t.date, 'YYYY-MM')

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
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR UPPER(TRIM(t.vendor)) = ANY(SELECT UPPER(TRIM(unnest(p_vendor)))))
  GROUP BY 1, 2, 3,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- 3. get_dre_dimension — vendor matching com UPPER(TRIM())
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text);
DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text,text[]);

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
  p_recurring       text    DEFAULT NULL,
  p_vendor          text[]  DEFAULT NULL
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
       AND ($12 IS NULL OR UPPER(TRIM(vendor)) = ANY(SELECT UPPER(TRIM(unnest($12)))))
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), year_month',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03, p_tag0, p_recurring, p_vendor;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text,text[]) TO anon;

NOTIFY pgrst, 'reload schema';
