-- ═══════════════════════════════════════════════════════════════════
-- fix_get_soma_tags_v7.sql
-- Adiciona tag02 ao retorno (SELECT + GROUP BY) para permitir
-- agrupamento visual por tag02 no frontend
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[]);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, tag02 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE
AS $$

  -- 1. Real
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02                                   AS tag02,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02                                   AS tag02,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02                                   AS tag02,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[]) TO anon;

-- Teste:
-- SELECT * FROM get_soma_tags('2026-01','2026-12', NULL, NULL, ARRAY['SERVIÇOS PROFISSIONAIS PJ']) ORDER BY tag0, tag02, scenario, month LIMIT 30;
