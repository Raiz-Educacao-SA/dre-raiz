-- ═══════════════════════════════════════════════════════════════════
-- FIX COMPLETO — combina TODAS as correções:
-- 1) get_soma_tags v10 (8 params) + override_contabil + sem 'Original'
-- 2) get_soma_tags_by_vendor (9 params) + override_contabil + sem 'Original'
-- 3) get_soma_tags_by_marca v3 (4 params) + override_contabil + sem 'Original' + transactions_manual
-- 4) dre_agg sem 'Original' + override_contabil
-- 5) Reload schema
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

SET statement_timeout = 0;

-- ═══════════════════════════════════════════════════════════════════
-- PARTE 1: get_soma_tags (8 params) + override_contabil
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text, text[]);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text, text[], text[]);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1a. Real (transactions) — exclui 'Original' + override_contabil
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions_manual t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
  WHERE
    (p_month_from   IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- PARTE 2: get_soma_tags_by_vendor (9 params) + override_contabil
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]);

CREATE OR REPLACE FUNCTION get_soma_tags_by_vendor(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL,
  p_vendor       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1a. Real (transactions) — exclui 'Original' + override_contabil
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR t.vendor      = ANY(p_vendor))
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY 1, 2, 3, to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions_manual t
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR t.vendor      = ANY(p_vendor))
  GROUP BY 1, 2, 3, to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
  WHERE
    (p_month_from   IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR t.vendor      = ANY(p_vendor))
  GROUP BY 1, 2, 3, to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR COALESCE(t.recurring, 'Sim') = p_recurring)
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
    AND (p_vendor       IS NULL OR t.vendor      = ANY(p_vendor))
  GROUP BY 1, 2, 3,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags_by_vendor(text, text, text[], text[], text[], text[], text, text[], text[]) TO anon;


-- ═══════════════════════════════════════════════════════════════════
-- PARTE 3: get_soma_tags_by_marca v3 + override_contabil + transactions_manual
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

  -- 1a. Real (transactions) — exclui 'Original' + override_contabil
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
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.marca, '')

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação') AS tag0,
    COALESCE(t.marca, '')                 AS marca,
    'Real'                                AS scenario,
    SUM(t.amount)                         AS total
  FROM transactions_manual t
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

  -- 2. Orçado
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

  -- 3. A-1
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


-- ═══════════════════════════════════════════════════════════════════
-- PARTE 4: dre_agg — sem 'Original' + override_contabil
-- ═══════════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- BLOCO 1: Real (transactions) — EXCLUI 'Original' + override_contabil
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions t
  WHERE (t.scenario IS NULL OR t.scenario = 'Real')
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 1b: Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_manual t
  WHERE (t.scenario IS NULL OR t.scenario = 'Real')
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 2: Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Orçado'                                  AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_orcado t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 3: A-1 (datas +1 ano)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char((t.date::date) + interval '1 year', 'YYYY-MM') AS year_month,
    'A-1'                                     AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_ano_anterior t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11;

-- Índices
CREATE INDEX ON dre_agg (year_month, scenario);
CREATE INDEX ON dre_agg (tag0, scenario);
CREATE INDEX ON dre_agg (tag02, scenario);
CREATE INDEX ON dre_agg (tag03, scenario);
CREATE INDEX ON dre_agg (marca, nome_filial);
CREATE INDEX ON dre_agg (conta_contabil, scenario, year_month);
CREATE INDEX ON dre_agg (recurring);


-- ═══════════════════════════════════════════════════════════════════
-- PARTE 5: Reload schema + reset timeout
-- ═══════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
RESET statement_timeout;
