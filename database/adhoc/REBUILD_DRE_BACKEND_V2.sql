-- =============================================================================
-- REBUILD_DRE_BACKEND_V2.sql
-- Reconstrução do backend DRE Gerencial
-- Execução: Supabase SQL Editor — passo a passo (PASSO 1 → PASSO 7)
-- =============================================================================

-- =====================================================================
-- PASSO 1 — Criar dre_agg (materialized view — pré-agrega 3 cenários)
-- =====================================================================

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- BLOCO 1: Real (transactions sem cenário ou com scenario='Real'/'Original')
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
  GROUP BY 1,2,3,4,5,6,7,8

  UNION ALL

  -- BLOCO 2: Orçado (tabela separada transactions_orcado)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
  GROUP BY 1,2,3,4,5,6,7,8

  UNION ALL

  -- BLOCO 3: A-1 com datas deslocadas +1 ano (2025 → 2026)
  -- Permite comparar com os mesmos parâmetros p_month_from/p_month_to
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
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
  GROUP BY 1,2,3,4,5,6,7,8;

-- Índices para performance das queries filtradas
CREATE INDEX ON dre_agg (year_month, scenario);
CREATE INDEX ON dre_agg (tag0, scenario);
CREATE INDEX ON dre_agg (marca, nome_filial);
CREATE INDEX ON dre_agg (conta_contabil, scenario, year_month);


-- =====================================================================
-- PASSO 2 — Recriar get_dre_summary (lê dre_agg)
-- =====================================================================

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL
)
RETURNS TABLE(
  scenario       text,
  conta_contabil text,
  year_month     text,
  tag0           text,
  tag01          text,
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
    SUM(total_amount) AS total_amount,
    SUM(tx_count)     AS tx_count
  FROM dre_agg
  WHERE
    (p_month_from  IS NULL OR year_month >= p_month_from)
    AND (p_month_to IS NULL OR year_month <= p_month_to)
    AND (p_marcas        IS NULL OR marca       = ANY(p_marcas))
    AND (p_nome_filiais  IS NULL OR nome_filial = ANY(p_nome_filiais))
    AND (p_tags01        IS NULL OR tag01       = ANY(p_tags01))
  GROUP BY scenario, conta_contabil, year_month, tag0, tag01;
$$;

GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO authenticated, anon;


-- =====================================================================
-- PASSO 3 — Recriar get_dre_dimension (drill-down, lê dre_agg)
-- =====================================================================

-- Drop de variantes anteriores com assinaturas diferentes
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
  IF p_dimension NOT IN ('tag0','tag01','conta_contabil','vendor','marca','nome_filial') THEN
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
       AND ($8 IS NULL OR tag0 = $8)
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), year_month',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tag0;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO authenticated, anon;


-- =====================================================================
-- PASSO 4 — Recriar get_dre_filter_options (lê dre_agg)
-- =====================================================================

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[])
LANGUAGE sql STABLE AS $$
  SELECT
    ARRAY(
      SELECT DISTINCT marca
      FROM dre_agg
      WHERE marca IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY marca
    ) AS marcas,
    ARRAY(
      SELECT DISTINCT nome_filial
      FROM dre_agg
      WHERE nome_filial IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY nome_filial
    ) AS nome_filiais,
    ARRAY(
      SELECT DISTINCT tag01
      FROM dre_agg
      WHERE tag01 IS NOT NULL
        AND (p_month_from IS NULL OR year_month >= p_month_from)
        AND (p_month_to   IS NULL OR year_month <= p_month_to)
      ORDER BY tag01
    ) AS tags01;
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text,text) TO authenticated, anon;


-- =====================================================================
-- PASSO 5 — Criar get_soma_tags (usa dre_agg)
-- =====================================================================

DROP FUNCTION IF EXISTS get_soma_tags(text);
DROP FUNCTION IF EXISTS get_soma_tags(text, text);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    tag0,
    tag01,
    scenario,
    SUM(total_amount) AS total
  FROM dre_agg
  WHERE
    (p_month_from IS NULL OR year_month >= p_month_from)
    AND (p_month_to IS NULL OR year_month <= p_month_to)
  GROUP BY tag0, tag01, scenario
  ORDER BY tag0, tag01, scenario;
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text,text) TO authenticated, anon;


-- =====================================================================
-- PASSO 6 — Função helper refresh_dre_agg()
-- Chamar após importar novos dados para atualizar a materialized view
-- =====================================================================

CREATE OR REPLACE FUNCTION refresh_dre_agg()
RETURNS void
LANGUAGE sql
SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW dre_agg;
$$;

GRANT EXECUTE ON FUNCTION refresh_dre_agg() TO authenticated;


-- =====================================================================
-- PASSO 7 — Verificações
-- Execute cada bloco separadamente para confirmar dados corretos
-- =====================================================================

-- 7.1 Deve mostrar Real, Orçado e A-1 com contagens e totais
SELECT
  scenario,
  COUNT(*) AS linhas,
  SUM(total_amount) AS total
FROM dre_agg
WHERE year_month BETWEEN '2026-01' AND '2026-12'
GROUP BY scenario
ORDER BY scenario;

-- 7.2 Filter options deve incluir tag01 dos 3 cenários
SELECT
  array_length(marcas, 1)      AS qtd_marcas,
  array_length(nome_filiais, 1) AS qtd_filiais,
  array_length(tags01, 1)       AS qtd_tags01
FROM get_dre_filter_options('2026-01', '2026-12');

-- 7.3 DRE summary deve ter os 3 cenários com tag0 e totais
SELECT
  tag0,
  scenario,
  SUM(total_amount) AS total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY tag0, scenario
ORDER BY tag0, scenario;

-- 7.4 Soma tags deve funcionar sem erro
SELECT * FROM get_soma_tags('2026-01', '2026-12') LIMIT 10;

-- 7.5 Drill-down A-1 deve retornar dados (não vazio)
SELECT * FROM get_dre_dimension(
  '2026-01', '2026-12',
  NULL,        -- p_conta_contabils
  'A-1',       -- p_scenario
  'vendor',    -- p_dimension
  NULL,        -- p_marcas
  NULL,        -- p_nome_filiais
  NULL,        -- p_tags01
  NULL,        -- p_tags02
  NULL,        -- p_tags03
  NULL         -- p_tag0
) LIMIT 10;
