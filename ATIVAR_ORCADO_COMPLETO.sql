-- ═══════════════════════════════════════════════════════════════════════════
-- ATIVAR_ORCADO_COMPLETO.sql
-- Ativa suporte completo ao cenário Orçado (transactions_orcado) nas 3 RPCs.
-- Inclui todos os fixes anteriores (INITCAP, Bug2, Bug3).
--
-- Execute os 3 passos EM ORDEM no Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: get_dre_summary — 3 branches (Real + Orçado + A-1) ─────────────

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

  -- ── 1. Real (transactions) ───────────────────────────────────────────────
  SELECT
    COALESCE(t.scenario, 'Real')                                        AS scenario,
    t.conta_contabil,
    substring(t.date, 1, 7)                                             AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')                              AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))     AS tag01,
    COALESCE(t.tag02, 'Sem tag02')                                      AS tag02,
    COALESCE(t.tag03, 'Sem tag03')                                      AS tag03,
    t.type                                                              AS tipo,
    SUM(t.amount)                                                       AS total_amount,
    COUNT(*)                                                            AS tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from  IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to   IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas      IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01      IS NULL OR LOWER(TRIM(t.tag01)) = ANY(
          SELECT LOWER(TRIM(x)) FROM unnest(p_tags01) x))
    AND (t.scenario IS NULL OR t.scenario = 'Real')   -- exclui Orçado antigo se houver
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

  -- ── 2. Orçado (transactions_orcado) ─────────────────────────────────────
  SELECT
    'Orçado'                                                            AS scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7)                                      AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')                              AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))     AS tag01,
    COALESCE(t.tag02, 'Sem tag02')                                      AS tag02,
    COALESCE(t.tag03, 'Sem tag03')                                      AS tag03,
    t.type                                                              AS tipo,
    SUM(t.amount)                                                       AS total_amount,
    COUNT(*)                                                            AS tx_count
  FROM transactions_orcado t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from  IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to   IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas      IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01      IS NULL OR LOWER(TRIM(t.tag01)) = ANY(
          SELECT LOWER(TRIM(x)) FROM unnest(p_tags01) x))
  GROUP BY
    t.conta_contabil,
    substring(t.date::text, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação')))),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type

  UNION ALL

  -- ── 3. A-1 (transactions_ano_anterior) — filtra só por mês ──────────────
  SELECT
    'A-1'                                                               AS scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7)                                      AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')                              AS tag0,
    INITCAP(LOWER(TRIM(COALESCE(t.tag01, 'Sem Subclassificação'))))     AS tag01,
    COALESCE(t.tag02, 'Sem tag02')                                      AS tag02,
    COALESCE(t.tag03, 'Sem tag03')                                      AS tag03,
    t.type                                                              AS tipo,
    SUM(t.amount)                                                       AS total_amount,
    COUNT(*)                                                            AS tx_count
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from  IS NULL OR to_char(t.date,'MM') >= substring(p_month_from,6,2))
    AND (p_month_to IS NULL OR to_char(t.date,'MM') <= substring(p_month_to,6,2))
    AND (p_marcas      IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01      IS NULL OR LOWER(TRIM(t.tag01)) = ANY(
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


-- ─── PASSO 2: get_dre_dimension — rota Orçado → transactions_orcado ──────────
-- Inclui todos os fixes: Bug2 (conta vazia), Bug3 (Real com NULL scenario)

DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[], text[], text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[], text[], text[], text);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from      text    DEFAULT NULL,
  p_month_to        text    DEFAULT NULL,
  p_conta_contabils text[]  DEFAULT NULL,
  p_scenario        text    DEFAULT NULL,
  p_dimension       text    DEFAULT 'marca',
  p_marcas          text[]  DEFAULT NULL,
  p_nome_filiais    text[]  DEFAULT NULL,
  p_tags01          text[]  DEFAULT NULL,
  p_tags02          text[]  DEFAULT NULL,
  p_tags03          text[]  DEFAULT NULL,
  p_tag0            text    DEFAULT NULL
)
RETURNS TABLE(
  dimension_value text,
  year_month      text,
  total_amount    numeric
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_table      text;
  v_date       text;
  v_where_from text;
  v_where_to   text;
BEGIN
  IF p_dimension NOT IN (
    'tag01','tag02','tag03','category','marca','nome_filial',
    'vendor','ticket','responsavel'
  ) THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  -- ── Rota por cenário → tabela correta ────────────────────────────────────
  IF p_scenario = 'A-1' THEN
    v_table      := 'transactions_ano_anterior';
    v_date       := 't.date::text';
    v_where_from := 'to_char(t.date, ''MM'') >= substring($1, 6, 2)';
    v_where_to   := 'to_char(t.date, ''MM'') <= substring($2, 6, 2)';

  ELSIF p_scenario = 'Orçado' THEN
    v_table      := 'transactions_orcado';
    v_date       := 't.date::text';
    v_where_from := 't.date::text >= $1 || ''-01''';
    v_where_to   := 't.date::text <= $2 || ''-31''';

  ELSE
    -- Real (ou NULL = todos)
    v_table      := 'transactions';
    v_date       := 't.date';
    v_where_from := 't.date >= $1 || ''-01''';
    v_where_to   := 't.date <= $2 || ''-31''';
  END IF;

  -- ── A-1: filtro por mês + fallback para conta_contabil vazia ─────────────
  IF p_scenario = 'A-1' THEN
    RETURN QUERY EXECUTE format(
      'SELECT
         COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
         substring(%s, 1, 7)                AS year_month,
         SUM(t.amount)                      AS total_amount
       FROM %I t
       LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
       WHERE
         ($1 IS NULL OR %s)
         AND ($2 IS NULL OR %s)
         AND (
           $3 IS NULL
           OR t.conta_contabil = ANY($3)
           OR (
             (t.conta_contabil IS NULL OR length(t.conta_contabil) = 0)
             AND $10 IS NOT NULL
             AND COALESCE(tm.tag0, t.type) = $10
           )
         )
         AND ($4 IS NULL OR t.scenario = $4)
         AND ($5 IS NULL OR t.marca        = ANY($5))
         AND ($6 IS NULL OR t.nome_filial  = ANY($6))
         AND ($7 IS NULL OR t.tag01        = ANY($7))
         AND ($8 IS NULL OR t.tag02        = ANY($8))
         AND ($9 IS NULL OR t.tag03        = ANY($9))
       GROUP BY
         COALESCE(CAST(%I AS text), ''N/A''),
         substring(%s, 1, 7)',
      p_dimension, v_date, v_table,
      v_where_from, v_where_to,
      p_dimension, v_date
    )
    USING
      p_month_from, p_month_to, p_conta_contabils, p_scenario,
      p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03,
      p_tag0;

  -- ── Orçado: filtro por data completa + fallback conta vazia ──────────────
  ELSIF p_scenario = 'Orçado' THEN
    RETURN QUERY EXECUTE format(
      'SELECT
         COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
         substring(%s, 1, 7)                AS year_month,
         SUM(t.amount)                      AS total_amount
       FROM %I t
       LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
       WHERE
         ($1 IS NULL OR %s)
         AND ($2 IS NULL OR %s)
         AND (
           $3 IS NULL
           OR t.conta_contabil = ANY($3)
           OR (
             (t.conta_contabil IS NULL OR length(t.conta_contabil) = 0)
             AND $10 IS NOT NULL
             AND COALESCE(tm.tag0, t.type) = $10
           )
         )
         AND ($4 IS NULL OR t.scenario = $4)
         AND ($5 IS NULL OR t.marca        = ANY($5))
         AND ($6 IS NULL OR t.nome_filial  = ANY($6))
         AND ($7 IS NULL OR t.tag01        = ANY($7))
         AND ($8 IS NULL OR t.tag02        = ANY($8))
         AND ($9 IS NULL OR t.tag03        = ANY($9))
       GROUP BY
         COALESCE(CAST(%I AS text), ''N/A''),
         substring(%s, 1, 7)',
      p_dimension, v_date, v_table,
      v_where_from, v_where_to,
      p_dimension, v_date
    )
    USING
      p_month_from, p_month_to, p_conta_contabils, p_scenario,
      p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03,
      p_tag0;

  -- ── Real: Bug3 fix (NULL scenario) + fallback conta vazia ────────────────
  ELSE
    RETURN QUERY EXECUTE format(
      'SELECT
         COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
         substring(%s, 1, 7)                AS year_month,
         SUM(t.amount)                      AS total_amount
       FROM %I t
       LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
       WHERE
         ($1 IS NULL OR %s)
         AND ($2 IS NULL OR %s)
         AND (
           $3 IS NULL
           OR t.conta_contabil = ANY($3)
           OR (
             (t.conta_contabil IS NULL OR length(t.conta_contabil) = 0)
             AND $10 IS NOT NULL
             AND COALESCE(tm.tag0, t.type) = $10
           )
         )
         AND (
           $4 IS NULL
           OR ($4 = ''Real'' AND (t.scenario = ''Real'' OR t.scenario IS NULL))
           OR ($4 <> ''Real'' AND t.scenario = $4)
         )
         AND ($5 IS NULL OR t.marca        = ANY($5))
         AND ($6 IS NULL OR t.nome_filial  = ANY($6))
         AND ($7 IS NULL OR t.tag01        = ANY($7))
         AND ($8 IS NULL OR t.tag02        = ANY($8))
         AND ($9 IS NULL OR t.tag03        = ANY($9))
       GROUP BY
         COALESCE(CAST(%I AS text), ''N/A''),
         substring(%s, 1, 7)',
      p_dimension, v_date, v_table,
      v_where_from, v_where_to,
      p_dimension, v_date
    )
    USING
      p_month_from, p_month_to, p_conta_contabils, p_scenario,
      p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03,
      p_tag0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO anon;


-- ─── PASSO 3: get_dre_filter_options — 3 tabelas ─────────────────────────────

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
        SELECT marca AS tag FROM transactions_orcado
          WHERE marca IS NOT NULL
          AND (p_month_from IS NULL OR date::text >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date::text <= p_month_to   || '-31')
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
        SELECT nome_filial AS tag FROM transactions_orcado
          WHERE nome_filial IS NOT NULL
          AND (p_month_from IS NULL OR date::text >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date::text <= p_month_to   || '-31')
        UNION
        SELECT nome_filial AS tag FROM transactions_ano_anterior
          WHERE nome_filial IS NOT NULL
          AND (p_month_from IS NULL OR to_char(date,'MM') >= substring(p_month_from,6,2))
          AND (p_month_to   IS NULL OR to_char(date,'MM') <= substring(p_month_to,6,2))
      ) f ORDER BY tag
    ) AS nome_filiais,

    -- Tags01 (INITCAP para evitar duplicatas de case)
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT INITCAP(LOWER(TRIM(tag01))) AS tag FROM transactions
          WHERE tag01 IS NOT NULL
          AND (p_month_from IS NULL OR date >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT INITCAP(LOWER(TRIM(tag01))) AS tag FROM transactions_orcado
          WHERE tag01 IS NOT NULL
          AND (p_month_from IS NULL OR date::text >= p_month_from || '-01')
          AND (p_month_to   IS NULL OR date::text <= p_month_to   || '-31')
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


-- ─── VERIFICAÇÃO (rode após os 3 passos) ──────────────────────────────────────

-- 1. Confirmar que os 3 cenários aparecem:
-- SELECT scenario, COUNT(*) AS linhas, SUM(total_amount) AS total
-- FROM get_dre_summary('2026-01','2026-12')
-- GROUP BY scenario ORDER BY scenario;
-- Esperado: A-1 (com meses 01-12 de 2025), Orçado (2026), Real (2026)

-- 2. Drill-down Orçado:
-- SELECT dimension_value, SUM(total_amount) AS total
-- FROM get_dre_dimension('2026-01','2026-12', NULL, 'Orçado', 'tag01')
-- GROUP BY dimension_value ORDER BY total;

-- 3. Filtros incluem Orçado:
-- SELECT array_length(marcas,1), array_length(nome_filiais,1), array_length(tags01,1)
-- FROM get_dre_filter_options('2026-01','2026-12');
