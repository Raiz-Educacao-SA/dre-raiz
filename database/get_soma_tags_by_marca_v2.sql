-- ═══════════════════════════════════════════════════════════════════
-- get_soma_tags_by_marca v2 — adiciona filtro p_tags01
-- Retorna soma por (tag0, marca, scenario) para um mês,
-- opcionalmente filtrado por centros de custo (tag01).
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags_by_marca(text, text[], text);
DROP FUNCTION IF EXISTS get_soma_tags_by_marca(text, text[], text, text[]);

CREATE OR REPLACE FUNCTION get_soma_tags_by_marca(
  p_month      text   DEFAULT NULL,
  p_marcas     text[] DEFAULT NULL,
  p_recurring  text   DEFAULT NULL,
  p_tags01     text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, marca text, scenario text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1. Real (transactions)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'Real'                                AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month     IS NULL OR to_char(t.date::date, 'YYYY-MM') = p_month)
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags01    IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.marca, '')

  UNION ALL

  -- 2. Orçado (transactions_orcado)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'Orçado'                              AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions_orcado t
  WHERE
    (p_month     IS NULL OR to_char(t.date, 'YYYY-MM') = p_month)
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags01    IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.marca, '')

  UNION ALL

  -- 3. A-1 (transactions_ano_anterior — filtra só pelo mês MM)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'A-1'                                 AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions_ano_anterior t
  WHERE
    (p_month     IS NULL OR to_char(t.date, 'MM') = substring(p_month, 6, 2))
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags01    IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.marca, '')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags_by_marca(text, text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags_by_marca(text, text[], text, text[]) TO anon;
