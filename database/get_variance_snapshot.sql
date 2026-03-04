-- ═══════════════════════════════════════════════════════════════════
-- get_variance_snapshot.sql
-- Foto da DRE para Justificativas de Desvios
-- Consulta as MESMAS tabelas-fonte que get_soma_tags, mesmos filtros,
-- mas com granularidade tag0 + tag01 + tag02 + marca.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_variance_snapshot(
  p_year_month text,
  p_marcas     text[] DEFAULT NULL,
  p_recurring  text   DEFAULT 'Sim'
)
RETURNS TABLE(
  tag0   text,
  tag01  text,
  tag02  text,
  marca  text,
  scenario text,
  total  numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1. Real (transactions)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'Real'::text,
    SUM(t.amount)
  FROM transactions t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  -- 2. Orçado (transactions_orcado)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'Orçado'::text,
    SUM(t.amount)
  FROM transactions_orcado t
  WHERE to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  -- 3. A-1 (transactions_ano_anterior, +1 year)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'A-1'::text,
    SUM(t.amount)
  FROM transactions_ano_anterior t
  WHERE to_char((t.date::date) + interval '1 year', 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

$$;

GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO anon;
