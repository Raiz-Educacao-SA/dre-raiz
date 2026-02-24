-- ═══════════════════════════════════════════════════════════════════
-- fix_get_dre_dimension_v2.sql
-- Reescreve sem SQL dinâmico — filtros pushed down em cada bloco UNION
-- Elimina full-scan que causava timeout no drill-down
-- ═══════════════════════════════════════════════════════════════════

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

  RETURN QUERY
  WITH raw AS (
    -- ── Real ────────────────────────────────────────────────────────
    SELECT
      COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
      COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
      t.tag02,
      t.tag03,
      t.conta_contabil,
      t.vendor,
      to_char(t.date::date, 'YYYY-MM')          AS year_month,
      'Real'::text                              AS scenario,
      t.marca,
      t.nome_filial,
      COALESCE(t.recurring, 'Sim')              AS recurring,
      t.amount
    FROM transactions t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE (t.scenario IS NULL OR t.scenario = 'Real')
      AND (p_scenario       IS NULL OR p_scenario = 'Real')
      AND (p_month_from     IS NULL OR to_char(t.date::date, 'YYYY-MM') >= p_month_from)
      AND (p_month_to       IS NULL OR to_char(t.date::date, 'YYYY-MM') <= p_month_to)
      AND (p_marcas         IS NULL OR t.marca         = ANY(p_marcas))
      AND (p_nome_filiais   IS NULL OR t.nome_filial   = ANY(p_nome_filiais))
      AND (p_tags01         IS NULL OR t.tag01         = ANY(p_tags01))
      AND (p_tags02         IS NULL OR t.tag02         = ANY(p_tags02))
      AND (p_tags03         IS NULL OR t.tag03         = ANY(p_tags03))
      AND (p_conta_contabils IS NULL OR t.conta_contabil = ANY(p_conta_contabils))
      AND (p_recurring      IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)

    UNION ALL

    -- ── Orçado ──────────────────────────────────────────────────────
    SELECT
      COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
      COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
      t.tag02,
      t.tag03,
      t.conta_contabil,
      t.vendor,
      to_char(t.date::date, 'YYYY-MM')          AS year_month,
      'Orçado'::text                            AS scenario,
      t.marca,
      t.nome_filial,
      COALESCE(t.recurring, 'Sim')              AS recurring,
      t.amount
    FROM transactions_orcado t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE (p_scenario       IS NULL OR p_scenario = 'Orçado')
      AND (p_month_from     IS NULL OR to_char(t.date::date, 'YYYY-MM') >= p_month_from)
      AND (p_month_to       IS NULL OR to_char(t.date::date, 'YYYY-MM') <= p_month_to)
      AND (p_marcas         IS NULL OR t.marca         = ANY(p_marcas))
      AND (p_nome_filiais   IS NULL OR t.nome_filial   = ANY(p_nome_filiais))
      AND (p_tags01         IS NULL OR t.tag01         = ANY(p_tags01))
      AND (p_tags02         IS NULL OR t.tag02         = ANY(p_tags02))
      AND (p_tags03         IS NULL OR t.tag03         = ANY(p_tags03))
      AND (p_conta_contabils IS NULL OR t.conta_contabil = ANY(p_conta_contabils))
      AND (p_recurring      IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)

    UNION ALL

    -- ── A-1 (datas +1 ano para alinhar com filtros do período atual) ─
    SELECT
      COALESCE(tm.tag0, 'Sem Classificação')                           AS tag0,
      COALESCE(t.tag01, 'Sem Subclassificação')                        AS tag01,
      t.tag02,
      t.tag03,
      t.conta_contabil,
      t.vendor,
      to_char((t.date::date) + interval '1 year', 'YYYY-MM')           AS year_month,
      'A-1'::text                                                      AS scenario,
      t.marca,
      t.nome_filial,
      COALESCE(t.recurring, 'Sim')                                     AS recurring,
      t.amount
    FROM transactions_ano_anterior t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE (p_scenario       IS NULL OR p_scenario = 'A-1')
      AND (p_month_from     IS NULL OR to_char((t.date::date) + interval '1 year', 'YYYY-MM') >= p_month_from)
      AND (p_month_to       IS NULL OR to_char((t.date::date) + interval '1 year', 'YYYY-MM') <= p_month_to)
      AND (p_marcas         IS NULL OR t.marca         = ANY(p_marcas))
      AND (p_nome_filiais   IS NULL OR t.nome_filial   = ANY(p_nome_filiais))
      AND (p_tags01         IS NULL OR t.tag01         = ANY(p_tags01))
      AND (p_tags02         IS NULL OR t.tag02         = ANY(p_tags02))
      AND (p_tags03         IS NULL OR t.tag03         = ANY(p_tags03))
      AND (p_conta_contabils IS NULL OR t.conta_contabil = ANY(p_conta_contabils))
      AND (p_recurring      IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  )
  SELECT
    COALESCE(
      CASE p_dimension
        WHEN 'tag0'           THEN tag0
        WHEN 'tag01'          THEN tag01
        WHEN 'tag02'          THEN tag02
        WHEN 'tag03'          THEN tag03
        WHEN 'conta_contabil' THEN conta_contabil
        WHEN 'vendor'         THEN vendor
        WHEN 'marca'          THEN marca
        WHEN 'nome_filial'    THEN nome_filial
      END,
      'N/A'
    )                    AS dimension_value,
    year_month,
    SUM(amount)          AS total_amount
  FROM raw
  WHERE (p_tag0 IS NULL OR tag0 = p_tag0)
  GROUP BY 1, 2;

END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO anon;
