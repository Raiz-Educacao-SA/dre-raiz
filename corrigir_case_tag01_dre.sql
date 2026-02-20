-- ═══════════════════════════════════════════════════════════════════════════
-- corrigir_case_tag01_dre.sql
-- Normaliza tag01 para case-insensitive na DRE Gerencial
--
-- PROBLEMA: "RECEITA DE MENSALIDADE" e "Receita De Mensalidade" aparecem
--           como duas linhas separadas porque o GROUP BY é case-sensitive.
--
-- SOLUÇÃO: usar INITCAP(LOWER(TRIM(tag01))) em SELECT + GROUP BY + filtros
--          Resultado: tudo vira Title Case (ex: "Receita De Mensalidade")
--
-- EXECUTE NO SUPABASE SQL EDITOR — os 3 passos abaixo, um de cada vez.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: Atualizar get_dre_summary ─────────────────────────────────────

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from   text    DEFAULT NULL,
  p_month_to     text    DEFAULT NULL,
  p_marcas       text[]  DEFAULT NULL,
  p_nome_filiais text[]  DEFAULT NULL,
  p_tags01       text[]  DEFAULT NULL
)
RETURNS TABLE(
  scenario       text,
  conta_contabil text,
  year_month     text,
  tag0           text,
  tag01          text,
  tag02          text,
  tag03          text,
  tipo           text,
  total_amount   numeric,
  tx_count       bigint
)
LANGUAGE sql STABLE
AS $$
  -- ── Cenários em transactions (Real, Orçado, etc.) ────────────────────────
  SELECT
    COALESCE(t.scenario, 'Real')                                         AS scenario,
    t.conta_contabil,
    substring(t.date, 1, 7)                                              AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')                               AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))      AS tag01,
    COALESCE(t.tag02, 'Sem tag02')                                       AS tag02,
    COALESCE(t.tag03, 'Sem tag03')                                       AS tag03,
    t.type                                                               AS tipo,
    SUM(t.amount)                                                        AS total_amount,
    COUNT(*)                                                             AS tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from  IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas   IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01   IS NULL OR LOWER(TRIM(t.tag01)) = ANY(
          SELECT LOWER(TRIM(x)) FROM unnest(p_tags01) x))
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    t.conta_contabil,
    substring(t.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação')))),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type

  UNION ALL

  -- ── Cenário A-1 (transactions_ano_anterior) ──────────────────────────────
  SELECT
    'A-1'                                                                AS scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7)                                       AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')                               AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))      AS tag01,
    COALESCE(t.tag02, 'Sem tag02')                                       AS tag02,
    COALESCE(t.tag03, 'Sem tag03')                                       AS tag03,
    t.type                                                               AS tipo,
    SUM(t.amount)                                                        AS total_amount,
    COUNT(*)                                                             AS tx_count
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    -- Filtra só por MÊS (ano irrelevante — A-1 tem datas 2025, Real tem 2026)
    (p_month_from  IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to, 6, 2))
    AND (p_marcas   IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01   IS NULL OR LOWER(TRIM(t.tag01)) = ANY(
          SELECT LOWER(TRIM(x)) FROM unnest(p_tags01) x))
  GROUP BY
    t.conta_contabil,
    substring(t.date::text, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação')))),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type
$$;

GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO anon;


-- ─── PASSO 2: Atualizar get_dre_filter_options ──────────────────────────────

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[])
LANGUAGE sql STABLE
AS $$
  SELECT
    -- Marcas
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT marca AS tag FROM transactions
          WHERE marca IS NOT NULL
          AND (p_month_from IS NULL OR date >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT marca AS tag FROM transactions_ano_anterior
          WHERE marca IS NOT NULL
          AND (p_month_from IS NULL OR to_char(date,'MM') >= substring(p_month_from,6,2))
          AND (p_month_to   IS NULL OR to_char(date,'MM') <= substring(p_month_to,6,2))
      ) m ORDER BY tag
    ) AS marcas,

    -- Filiais
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT nome_filial AS tag FROM transactions
          WHERE nome_filial IS NOT NULL
          AND (p_month_from IS NULL OR date >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT nome_filial AS tag FROM transactions_ano_anterior
          WHERE nome_filial IS NOT NULL
          AND (p_month_from IS NULL OR to_char(date,'MM') >= substring(p_month_from,6,2))
          AND (p_month_to   IS NULL OR to_char(date,'MM') <= substring(p_month_to,6,2))
      ) f ORDER BY tag
    ) AS nome_filiais,

    -- Tags01: normalizadas com INITCAP para evitar duplicatas de case
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT INITCAP(LOWER(TRIM(tag01))) AS tag FROM transactions
          WHERE tag01 IS NOT NULL
          AND (p_month_from IS NULL OR date >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT INITCAP(LOWER(TRIM(tag01))) AS tag FROM transactions_ano_anterior
          WHERE tag01 IS NOT NULL
          AND (p_month_from IS NULL OR to_char(date,'MM') >= substring(p_month_from,6,2))
          AND (p_month_to   IS NULL OR to_char(date,'MM') <= substring(p_month_to,6,2))
      ) t ORDER BY tag
    ) AS tags01
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_filter_options(text,text) TO anon;


-- ─── PASSO 3: Atualizar get_soma_tags ───────────────────────────────────────

DROP FUNCTION IF EXISTS get_soma_tags(text);

CREATE OR REPLACE FUNCTION get_soma_tags(p_year text DEFAULT NULL)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE
AS $$
  -- Real + Orçado (transactions)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')                               AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))      AS tag01,
    COALESCE(t.scenario, 'Real')                                         AS scenario,
    SUM(t.amount)                                                        AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE (p_year IS NULL OR substring(t.date, 1, 4) = p_year)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação')))),
    COALESCE(t.scenario, 'Real')

  UNION ALL

  -- A-1 (transactions_ano_anterior)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')                               AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))      AS tag01,
    'A-1'                                                                AS scenario,
    SUM(t.amount)                                                        AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE (p_year IS NULL OR to_char(t.date, 'YYYY') = p_year)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO anon;


-- ─── VERIFICAÇÃO ─────────────────────────────────────────────────────────────
-- Rode depois de executar os 3 passos:
--
-- 1. Confirmar que tag01 não tem mais duplicatas de case:
-- SELECT DISTINCT tag01 FROM get_dre_summary('2026-01','2026-12')
-- WHERE tag01 ILIKE '%mensalidade%'
-- ORDER BY tag01;
-- Esperado: apenas UMA linha "Receita De Mensalidade"
--
-- 2. Conferir tags01 no filtro:
-- SELECT unnest(tags01) FROM get_dre_filter_options('2026-01','2026-12')
-- ORDER BY 1;
