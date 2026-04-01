-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: get_dashboard_summary
-- Retorna transações pré-agregadas para o Dashboard (substitui 119k registros brutos)
-- Retorno: ~3k-5k linhas vs 119k → carregamento 20-40x mais rápido
-- ═══════════════════════════════════════════════════════════════════════════
--
-- COMO USAR:
--   1. Abra o SQL Editor no Supabase
--   2. Cole este arquivo inteiro e clique em Run
--   3. Reinicie a aplicação
--
-- PARÂMETROS:
--   p_year       INT      — Ano (ex: 2026). Default: ano atual
--   p_marcas     TEXT[]   — NULL = todas as marcas
--   p_filiais    TEXT[]   — NULL = todas as filiais
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_year    INT     DEFAULT NULL,
  p_marcas  TEXT[]  DEFAULT NULL,
  p_filiais TEXT[]  DEFAULT NULL
)
RETURNS TABLE (
  marca       TEXT,
  filial      TEXT,
  scenario    TEXT,
  tag0        TEXT,
  tag01       TEXT,
  month       INT,       -- 0 = Janeiro, 11 = Dezembro
  total_amount NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(t.marca, '')::TEXT          AS marca,
    COALESCE(t.filial, '')::TEXT         AS filial,
    COALESCE(t.scenario, 'Real')::TEXT   AS scenario,
    COALESCE(t.tag0, '')::TEXT           AS tag0,
    COALESCE(t.tag01, '')::TEXT          AS tag01,
    (EXTRACT(MONTH FROM t.date)::INT - 1) AS month,
    SUM(t.amount)                        AS total_amount
  FROM transactions t
  WHERE
    -- Filtro de ano
    EXTRACT(YEAR FROM t.date) = COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INT)

    -- Apenas cenários usados no Dashboard
    AND t.scenario IN ('Real', 'Orçado', 'A-1')

    -- Filtro opcional de marca
    AND (p_marcas IS NULL OR array_length(p_marcas, 1) = 0 OR t.marca = ANY(p_marcas))

    -- Filtro opcional de filial
    AND (p_filiais IS NULL OR array_length(p_filiais, 1) = 0 OR t.filial = ANY(p_filiais))

  GROUP BY
    t.marca,
    t.filial,
    t.scenario,
    t.tag0,
    t.tag01,
    EXTRACT(MONTH FROM t.date)::INT
  ORDER BY
    t.marca,
    t.filial,
    t.scenario,
    t.tag0,
    EXTRACT(MONTH FROM t.date)::INT
$$;

-- Garantir permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION get_dashboard_summary(INT, TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary(INT, TEXT[], TEXT[]) TO anon;
