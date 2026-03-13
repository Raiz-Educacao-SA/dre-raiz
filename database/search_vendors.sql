-- ═══════════════════════════════════════════════════════════════════
-- search_vendors — busca fornecedores por texto (ILIKE)
-- Retorna até 50 resultados ordenados alfabeticamente
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS search_vendors(text);

CREATE OR REPLACE FUNCTION search_vendors(p_search text DEFAULT NULL)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT vendor
  FROM transactions
  WHERE vendor IS NOT NULL
    AND vendor <> ''
    AND (p_search IS NULL OR vendor ILIKE '%' || p_search || '%')
  ORDER BY vendor
  LIMIT 50
$$;

GRANT EXECUTE ON FUNCTION search_vendors(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_vendors(text) TO anon;
