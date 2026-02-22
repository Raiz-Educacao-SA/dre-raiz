-- ═══════════════════════════════════════════════════════════════════
-- fix_get_soma_tags_v3.sql
-- Adiciona filtros p_marcas e p_nome_filiais (igual ao get_dre_summary)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text, text);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,   -- ex: '2026-01'
  p_month_to     text   DEFAULT NULL,   -- ex: '2026-12'
  p_marcas       text[] DEFAULT NULL,   -- ex: ARRAY['GT','AP']
  p_nome_filiais text[] DEFAULT NULL    -- ex: ARRAY['GT - Bosque','AP - Central']
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE
AS $$
  -- Real + Orçado (transactions)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.scenario, 'Real')              AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.scenario, 'Real')

  UNION ALL

  -- A-1 (transactions_ano_anterior)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação')
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[]) TO anon;

-- Teste rápido:
-- SELECT * FROM get_soma_tags('2026-01','2026-12', ARRAY['GT'], NULL) ORDER BY tag0, tag01, scenario LIMIT 20;
