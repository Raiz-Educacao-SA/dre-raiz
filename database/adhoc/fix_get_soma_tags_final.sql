-- ═══════════════════════════════════════════════════════════════════
-- fix_get_soma_tags_final.sql
-- Versão definitiva: p_recurring sem p_tags03
-- Dropa TODAS as sobrecargas possíveis antes de recriar
-- ═══════════════════════════════════════════════════════════════════

-- Remove todas as sobrecargas anteriores
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1. Real
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text) TO anon;
