-- ═══════════════════════════════════════════════════════════════════
-- fix_get_dre_filter_options_raw_tables.sql
-- Reescreve get_dre_filter_options para consultar transactions diretamente
-- sem depender de dre_agg (que foi removida pelo timeout)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[], tags02 text[], tags03 text[])
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ARRAY(
      SELECT DISTINCT marca FROM transactions
      WHERE marca IS NOT NULL
        AND (p_month_from IS NULL OR to_char(date::date, 'YYYY-MM') >= p_month_from)
        AND (p_month_to   IS NULL OR to_char(date::date, 'YYYY-MM') <= p_month_to)
      ORDER BY marca
    ) AS marcas,

    ARRAY(
      SELECT DISTINCT nome_filial FROM transactions
      WHERE nome_filial IS NOT NULL
        AND (p_month_from IS NULL OR to_char(date::date, 'YYYY-MM') >= p_month_from)
        AND (p_month_to   IS NULL OR to_char(date::date, 'YYYY-MM') <= p_month_to)
      ORDER BY nome_filial
    ) AS nome_filiais,

    ARRAY(
      SELECT DISTINCT tag01 FROM transactions
      WHERE tag01 IS NOT NULL
        AND (p_month_from IS NULL OR to_char(date::date, 'YYYY-MM') >= p_month_from)
        AND (p_month_to   IS NULL OR to_char(date::date, 'YYYY-MM') <= p_month_to)
      ORDER BY tag01
    ) AS tags01,

    ARRAY(
      SELECT DISTINCT tag02 FROM transactions
      WHERE tag02 IS NOT NULL
        AND (p_month_from IS NULL OR to_char(date::date, 'YYYY-MM') >= p_month_from)
        AND (p_month_to   IS NULL OR to_char(date::date, 'YYYY-MM') <= p_month_to)
      ORDER BY tag02
    ) AS tags02,

    ARRAY(
      SELECT DISTINCT tag03 FROM transactions
      WHERE tag03 IS NOT NULL
        AND (p_month_from IS NULL OR to_char(date::date, 'YYYY-MM') >= p_month_from)
        AND (p_month_to   IS NULL OR to_char(date::date, 'YYYY-MM') <= p_month_to)
      ORDER BY tag03
    ) AS tags03;
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO anon;
