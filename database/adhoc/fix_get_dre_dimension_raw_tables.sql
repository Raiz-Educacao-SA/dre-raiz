-- ═══════════════════════════════════════════════════════════════════
-- fix_get_dre_dimension_raw_tables.sql
-- Reescreve get_dre_dimension para consultar tabelas brutas diretamente
-- em vez de dre_agg — evita timeout no REFRESH e suporta p_recurring
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
DECLARE
  v_sql text;
BEGIN
  IF p_dimension NOT IN ('tag0','tag01','tag02','tag03','conta_contabil','vendor','marca','nome_filial') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  v_sql := format($q$
    WITH combined AS (
      -- Real
      SELECT
        COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
        COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
        t.tag02,
        t.tag03,
        t.conta_contabil,
        t.vendor,
        to_char(t.date::date, 'YYYY-MM')          AS year_month,
        'Real'                                    AS scenario,
        t.marca,
        t.nome_filial,
        COALESCE(t.recurring, 'Sim')              AS recurring,
        t.amount
      FROM transactions t
      LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
      WHERE (t.scenario IS NULL OR t.scenario = 'Real')

      UNION ALL

      -- Orçado
      SELECT
        COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
        COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
        t.tag02,
        t.tag03,
        t.conta_contabil,
        t.vendor,
        to_char(t.date::date, 'YYYY-MM')          AS year_month,
        'Orçado'                                  AS scenario,
        t.marca,
        t.nome_filial,
        COALESCE(t.recurring, 'Sim')              AS recurring,
        t.amount
      FROM transactions_orcado t
      LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))

      UNION ALL

      -- A-1 (datas deslocadas +1 ano para alinhar com filtros do período atual)
      SELECT
        COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
        COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
        t.tag02,
        t.tag03,
        t.conta_contabil,
        t.vendor,
        to_char((t.date::date) + interval '1 year', 'YYYY-MM') AS year_month,
        'A-1'                                     AS scenario,
        t.marca,
        t.nome_filial,
        COALESCE(t.recurring, 'Sim')              AS recurring,
        t.amount
      FROM transactions_ano_anterior t
      LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    )
    SELECT
      COALESCE(CAST(%I AS text), 'N/A') AS dimension_value,
      year_month,
      SUM(amount)                       AS total_amount
    FROM combined
    WHERE
      ($1  IS NULL OR year_month      >= $1)
      AND ($2  IS NULL OR year_month      <= $2)
      AND ($3  IS NULL OR conta_contabil  = ANY($3))
      AND ($4  IS NULL OR scenario        = $4)
      AND ($5  IS NULL OR marca           = ANY($5))
      AND ($6  IS NULL OR nome_filial     = ANY($6))
      AND ($7  IS NULL OR tag01           = ANY($7))
      AND ($8  IS NULL OR tag02           = ANY($8))
      AND ($9  IS NULL OR tag03           = ANY($9))
      AND ($10 IS NULL OR tag0            = $10)
      AND ($11 IS NULL OR recurring       = $11)
    GROUP BY COALESCE(CAST(%I AS text), 'N/A'), year_month
  $q$, p_dimension, p_dimension);

  RETURN QUERY EXECUTE v_sql
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03, p_tag0,
        p_recurring;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text,text) TO anon;
