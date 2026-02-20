-- ═══════════════════════════════════════════════════════════════════
-- fix_get_soma_tags_v2.sql
-- Muda assinatura para month_from/month_to (igual ao get_dre_summary)
-- Isso usa o índice B-tree na coluna date e evita timeout
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from text DEFAULT NULL,  -- ex: '2026-01'
  p_month_to   text DEFAULT NULL   -- ex: '2026-12'
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE
AS $$
  -- Real + Orçado (transactions — date TEXT, range usa índice B-tree)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.scenario, 'Real')              AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.scenario, 'Real')

  UNION ALL

  -- A-1 (transactions_ano_anterior — date é tipo DATE, filtra por MÊS)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to, 6, 2))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação')
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text) TO anon;

-- Teste rápido:
-- SELECT tag0, tag01, scenario, total
-- FROM get_soma_tags('2026-01', '2026-12')
-- ORDER BY tag0, tag01, scenario
-- LIMIT 20;
