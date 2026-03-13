-- ═══════════════════════════════════════════════════════════════════
-- search_vendors v2 — busca em TODAS as tabelas de transações
-- v1 só buscava em transactions, perdendo vendors que existiam
-- apenas em transactions_manual (lançamentos corrigidos/manuais)
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS search_vendors(text);

CREATE OR REPLACE FUNCTION search_vendors(p_search text DEFAULT NULL)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT vendor FROM (
    -- transactions (Real)
    SELECT vendor FROM transactions
    WHERE vendor IS NOT NULL AND vendor <> ''
      AND (scenario IS NULL OR scenario = 'Real')
    UNION
    -- transactions_manual (lançamentos manuais/corrigidos)
    SELECT vendor FROM transactions_manual
    WHERE vendor IS NOT NULL AND vendor <> ''
      AND (scenario IS NULL OR scenario = 'Real')
  ) AS all_vendors
  WHERE (p_search IS NULL OR vendor ILIKE '%' || p_search || '%')
  ORDER BY vendor
  LIMIT 50
$$;

GRANT EXECUTE ON FUNCTION search_vendors(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_vendors(text) TO anon;

NOTIFY pgrst, 'reload schema';
