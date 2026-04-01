-- =====================================================
-- CORREÇÃO: Adicionar filtros tag02 e tag03 em get_dre_dimension
-- Execute no Supabase SQL Editor
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario text DEFAULT NULL,
  p_dimension text DEFAULT 'marca',
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL,
  p_tags02 text[] DEFAULT NULL,  -- ✅ NOVO: Filtro por tag02
  p_tags03 text[] DEFAULT NULL   -- ✅ NOVO: Filtro por tag03
)
RETURNS TABLE(
  dimension_value text,
  year_month text,
  total_amount numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Validar nome da coluna para prevenir SQL injection
  IF p_dimension NOT IN ('tag01', 'tag02', 'tag03', 'category', 'marca', 'nome_filial', 'vendor', 'ticket', 'responsavel') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(CAST(%I AS text), ''N/A'') as dimension_value,
       substring(t.date, 1, 7) as year_month,
       SUM(t.amount) as total_amount
     FROM transactions t
     WHERE
       ($1 IS NULL OR t.date >= $1 || ''-01'')
       AND ($2 IS NULL OR t.date <= $2 || ''-31'')
       AND ($3 IS NULL OR t.conta_contabil = ANY($3))
       AND ($4 IS NULL OR t.scenario = $4)
       AND ($5 IS NULL OR t.marca = ANY($5))
       AND ($6 IS NULL OR t.nome_filial = ANY($6))
       AND ($7 IS NULL OR t.tag01 = ANY($7))
       AND ($8 IS NULL OR t.tag02 = ANY($8))  -- ✅ NOVO: Filtro tag02
       AND ($9 IS NULL OR t.tag03 = ANY($9))  -- ✅ NOVO: Filtro tag03
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), substring(t.date, 1, 7)',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03;  -- ✅ Adicionados no USING
END;
$$;

-- Testar a função com tag02 e tag03
-- SELECT * FROM get_dre_dimension('2026-01', '2026-12', NULL, 'Real', 'tag02',
--   NULL, NULL, ARRAY['Receita de Mensalidade'], NULL, NULL) LIMIT 10;
