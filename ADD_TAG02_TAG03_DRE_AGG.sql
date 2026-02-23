-- =============================================================================
-- ADD_TAG02_TAG03_DRE_AGG.sql
-- Adiciona tag02 e tag03 na dre_agg e atualiza as funções dependentes
-- Execute no Supabase SQL Editor — passo a passo
-- =============================================================================

-- =====================================================================
-- PASSO 1 — Recriar dre_agg com tag02 e tag03
-- =====================================================================

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- BLOCO 1: Real
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
  GROUP BY 1,2,3,4,5,6,7,8,9,10

  UNION ALL

  -- BLOCO 2: Orçado
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Orçado'                                  AS scenario,
    t.marca,
    t.nome_filial,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_orcado t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY 1,2,3,4,5,6,7,8,9,10

  UNION ALL

  -- BLOCO 3: A-1 (datas deslocadas +1 ano para alinhar com filtros de período atual)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char((t.date::date) + interval '1 year', 'YYYY-MM') AS year_month,
    'A-1'                                     AS scenario,
    t.marca,
    t.nome_filial,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY 1,2,3,4,5,6,7,8,9,10;

-- Índices para performance
CREATE INDEX ON dre_agg (year_month, scenario);
CREATE INDEX ON dre_agg (tag0, scenario);
CREATE INDEX ON dre_agg (tag02, scenario);
CREATE INDEX ON dre_agg (tag03, scenario);
CREATE INDEX ON dre_agg (marca, nome_filial);
CREATE INDEX ON dre_agg (conta_contabil, scenario, year_month);


-- =====================================================================
-- PASSO 2 — Atualizar get_dre_summary (adiciona tag02 e tag03 no retorno e filtro)
-- =====================================================================

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL
)
RETURNS TABLE(
  scenario       text,
  conta_contabil text,
  year_month     text,
  tag0           text,
  tag01          text,
  tag02          text,
  tag03          text,
  total_amount   numeric,
  tx_count       bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    scenario,
    conta_contabil,
    year_month,
    tag0,
    tag01,
    tag02,
    tag03,
    SUM(total_amount) AS total_amount,
    SUM(tx_count)     AS tx_count
  FROM dre_agg
  WHERE
    (p_month_from  IS NULL OR year_month >= p_month_from)
    AND (p_month_to IS NULL OR year_month <= p_month_to)
    AND (p_marcas        IS NULL OR marca       = ANY(p_marcas))
    AND (p_nome_filiais  IS NULL OR nome_filial = ANY(p_nome_filiais))
    AND (p_tags01        IS NULL OR tag01       = ANY(p_tags01))
    AND (p_tags02        IS NULL OR tag02       = ANY(p_tags02))
    AND (p_tags03        IS NULL OR tag03       = ANY(p_tags03))
  GROUP BY scenario, conta_contabil, year_month, tag0, tag01, tag02, tag03;
$$;

GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[],text[],text[]) TO authenticated, anon;

-- Manter compatibilidade com chamadas antigas (sem tag02/tag03)
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from   text,
  p_month_to     text,
  p_marcas       text[],
  p_nome_filiais text[],
  p_tags01       text[]
)
RETURNS TABLE(
  scenario       text,
  conta_contabil text,
  year_month     text,
  tag0           text,
  tag01          text,
  tag02          text,
  tag03          text,
  total_amount   numeric,
  tx_count       bigint
)
LANGUAGE sql STABLE AS $$
  SELECT * FROM get_dre_summary(p_month_from, p_month_to, p_marcas, p_nome_filiais, p_tags01, NULL, NULL);
$$;

GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO authenticated, anon;


-- =====================================================================
-- PASSO 3 — Atualizar get_dre_dimension (lê tag02/tag03 do dre_agg)
-- =====================================================================

DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text);
DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from      text   DEFAULT NULL,
  p_month_to        text   DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario        text   DEFAULT NULL,
  p_dimension       text   DEFAULT 'vendor',
  p_marcas          text[] DEFAULT NULL,
  p_nome_filiais    text[] DEFAULT NULL,
  p_tags01          text[] DEFAULT NULL,
  p_tags02          text[] DEFAULT NULL,
  p_tags03          text[] DEFAULT NULL,
  p_tag0            text   DEFAULT NULL
)
RETURNS TABLE(dimension_value text, year_month text, total_amount numeric)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF p_dimension NOT IN ('tag0','tag01','tag02','tag03','conta_contabil','vendor','marca','nome_filial') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
       year_month,
       SUM(total_amount) AS total_amount
     FROM dre_agg
     WHERE
       ($1 IS NULL OR year_month >= $1)
       AND ($2 IS NULL OR year_month <= $2)
       AND ($3 IS NULL OR conta_contabil = ANY($3))
       AND ($4 IS NULL OR scenario = $4)
       AND ($5 IS NULL OR marca = ANY($5))
       AND ($6 IS NULL OR nome_filial = ANY($6))
       AND ($7 IS NULL OR tag01 = ANY($7))
       AND ($8 IS NULL OR tag02 = ANY($8))
       AND ($9 IS NULL OR tag03 = ANY($9))
       AND ($10 IS NULL OR tag0 = $10)
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), year_month',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03, p_tag0;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO authenticated, anon;


-- =====================================================================
-- PASSO 4 — Atualizar get_dre_filter_options (adiciona tags02 e tags03)
-- =====================================================================

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[], tags02 text[], tags03 text[])
LANGUAGE sql STABLE AS $$
  SELECT
    ARRAY(
      SELECT DISTINCT marca FROM dre_agg
      WHERE marca IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY marca
    ) AS marcas,
    ARRAY(
      SELECT DISTINCT nome_filial FROM dre_agg
      WHERE nome_filial IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY nome_filial
    ) AS nome_filiais,
    ARRAY(
      SELECT DISTINCT tag01 FROM dre_agg
      WHERE tag01 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag01
    ) AS tags01,
    ARRAY(
      SELECT DISTINCT tag02 FROM dre_agg
      WHERE tag02 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag02
    ) AS tags02,
    ARRAY(
      SELECT DISTINCT tag03 FROM dre_agg
      WHERE tag03 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag03
    ) AS tags03;
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text,text) TO authenticated, anon;


-- =====================================================================
-- PASSO 5 — Verificações
-- =====================================================================

-- 5.1 Confirmar que tag02 e tag03 aparecem na view
SELECT
  tag02,
  tag03,
  scenario,
  COUNT(*) AS linhas
FROM dre_agg
WHERE year_month BETWEEN '2026-01' AND '2026-12'
  AND tag02 IS NOT NULL
GROUP BY tag02, tag03, scenario
ORDER BY tag02, tag03, scenario
LIMIT 20;

-- 5.2 Confirmar que get_dre_summary retorna tag02 e tag03
SELECT tag0, tag01, tag02, tag03, scenario, SUM(total_amount) AS total
FROM get_dre_summary('2026-01', '2026-12')
WHERE tag02 IS NOT NULL
GROUP BY tag0, tag01, tag02, tag03, scenario
ORDER BY tag0, tag01, tag02
LIMIT 20;

-- 5.3 Drill-down por tag02
SELECT * FROM get_dre_dimension(
  '2026-01', '2026-12',
  NULL, 'Real', 'tag02',
  NULL, NULL, NULL, NULL, NULL, NULL
) LIMIT 10;

-- 5.4 Drill-down por tag03 filtrando por tag02
SELECT * FROM get_dre_dimension(
  '2026-01', '2026-12',
  NULL, 'Real', 'tag03',
  NULL, NULL, NULL,
  ARRAY['<substitua-por-um-valor-real-de-tag02>'],
  NULL, NULL
) LIMIT 10;

-- 5.5 Filter options deve retornar tags02 e tags03
SELECT
  array_length(marcas, 1)       AS qtd_marcas,
  array_length(nome_filiais, 1) AS qtd_filiais,
  array_length(tags01, 1)       AS qtd_tags01,
  array_length(tags02, 1)       AS qtd_tags02,
  array_length(tags03, 1)       AS qtd_tags03
FROM get_dre_filter_options('2026-01', '2026-12');
