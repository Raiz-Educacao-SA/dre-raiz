-- ═══════════════════════════════════════════════════════════════════
-- fix_get_soma_tags.sql
-- Corrige timeout: usa range de data para aproveitar índice B-tree
-- (substring/to_char evitam índice → full scan → timeout)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text);

CREATE OR REPLACE FUNCTION get_soma_tags(p_year text DEFAULT NULL)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE
AS $$
  -- Real + Orçado (transactions — date é TEXT 'YYYY-MM-DD')
  -- Usa range >= / <= para aproveitar índice B-tree na coluna date
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.scenario, 'Real')              AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE (p_year IS NULL
         OR (t.date >= p_year || '-01-01'
             AND t.date <= p_year || '-12-31'))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.scenario, 'Real')

  UNION ALL

  -- A-1 (transactions_ano_anterior — date é tipo DATE)
  -- Para A-1 o ano da tabela é sempre o ano anterior; sem filtro de ano
  -- (a tabela já contém só o ano -1, sem necessidade de filtrar)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação')
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO anon;

-- Teste rápido (deve retornar em < 5s):
-- SELECT tag0, tag01, scenario, total
-- FROM get_soma_tags('2026')
-- ORDER BY tag0, tag01, scenario
-- LIMIT 20;
