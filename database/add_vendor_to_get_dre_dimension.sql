-- ═══════════════════════════════════════════════════════════════════
-- Adiciona p_vendor a get_dre_dimension
-- dre_agg já tem coluna vendor, basta filtrar
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Drop todas as assinaturas conhecidas (12 e 13 params)
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
       AND ($12 IS NULL OR vendor = ANY($12))
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
