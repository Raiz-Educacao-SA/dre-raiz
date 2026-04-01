-- =====================================================
-- NOVA FUNÇÃO: Retornar TODAS as tag01 com seus tag0
-- Execute no Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_tag01_with_tag0()
RETURNS TABLE(
  tag0 text,
  tag01 text
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(tm.tag1_norm, t.tag01) as tag01
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE t.tag01 IS NOT NULL
  ORDER BY tag0, tag01;
$$;

-- Testar a função
SELECT * FROM get_all_tag01_with_tag0();
