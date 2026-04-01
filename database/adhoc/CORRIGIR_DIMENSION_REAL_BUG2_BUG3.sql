-- ═══════════════════════════════════════════════════════════════════════════
-- CORRIGIR_DIMENSION_REAL_BUG2_BUG3.sql
-- Corrige get_dre_dimension para os cenários Real / Orçado
--
-- BUG 2 — conta_contabil vazia perdida no nível 2 (tag01)
--   Causa: allCategories no frontend filtra c !== '' → transações com
--          conta_contabil='' são somadas no nível 1 (tag0) via summaryRows,
--          mas nunca buscadas no nível 2 via getDREDimension.
--   Fix: adiciona LEFT JOIN tag0_map + mesmo OR fallback já usado no ramo A-1:
--        inclui contas vazias se tag0 (p_tag0) for fornecido e bater.
--
-- BUG 3 — Real com scenario=NULL ignorado
--   Causa: t.scenario = $4 com $4='Real' não captura linhas em transactions
--          cujo scenario é NULL (o get_dre_summary usa COALESCE→'Real',
--          mas get_dre_dimension filtrava só o valor literal 'Real').
--   Fix: trata p_scenario='Real' para aceitar também t.scenario IS NULL.
--
-- EXECUTE NO SUPABASE SQL EDITOR — um bloco só
-- ═══════════════════════════════════════════════════════════════════════════

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
  p_tag0            text    DEFAULT NULL   -- fallback: inclui contas vazias do mesmo tag0
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

  IF p_scenario = 'A-1' THEN
    v_table      := 'transactions_ano_anterior';
    v_date       := 't.date::text';
    v_where_from := 'to_char(t.date, ''MM'') >= substring($1, 6, 2)';
    v_where_to   := 'to_char(t.date, ''MM'') <= substring($2, 6, 2)';
  ELSE
    v_table      := 'transactions';
    v_date       := 't.date';
    v_where_from := 't.date >= $1 || ''-01''';
    v_where_to   := 't.date <= $2 || ''-31''';
  END IF;

  IF p_scenario = 'A-1' THEN
    -- ── A-1: transactions_ano_anterior, filtro por mês, fallback conta vazia ──
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
         AND ($5 IS NULL OR t.marca = ANY($5))
         AND ($6 IS NULL OR t.nome_filial = ANY($6))
         AND ($7 IS NULL OR t.tag01 = ANY($7))
         AND ($8 IS NULL OR t.tag02 = ANY($8))
         AND ($9 IS NULL OR t.tag03 = ANY($9))
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

  ELSE
    -- ── Real / Orçado: transactions ──────────────────────────────────────────
    -- FIX BUG 2: LEFT JOIN tag0_map + fallback para conta_contabil vazia/nula
    -- FIX BUG 3: p_scenario='Real' aceita também t.scenario IS NULL
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
         AND ($5 IS NULL OR t.marca = ANY($5))
         AND ($6 IS NULL OR t.nome_filial = ANY($6))
         AND ($7 IS NULL OR t.tag01 = ANY($7))
         AND ($8 IS NULL OR t.tag02 = ANY($8))
         AND ($9 IS NULL OR t.tag03 = ANY($9))
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


-- ─── VERIFICAÇÃO ─────────────────────────────────────────────────────────────
-- Rode depois de executar a função acima.

-- 1. Testar Real: deve retornar as tag01s de custos variáveis, incluindo
--    linhas onde conta_contabil é vazia (se p_tag0 bater)
-- SELECT dimension_value, SUM(total_amount) AS total
-- FROM get_dre_dimension(
--   '2026-01', '2026-12',
--   NULL,         -- p_conta_contabils: NULL = todas as contas
--   'Real',       -- p_scenario
--   'tag01',      -- p_dimension
--   NULL, NULL, NULL, NULL, NULL,
--   '02. CUSTOS VARIÁVEIS'   -- p_tag0: fallback para contas vazias
-- )
-- GROUP BY dimension_value ORDER BY total;

-- 2. Testar se Real NULL scenario é capturado:
-- SELECT COUNT(*) AS com_scenario_nulo
-- FROM transactions
-- WHERE scenario IS NULL;
-- Se > 0, confirma que o Bug 3 existia (agora corrigido).

-- 3. Conferir que tag0 total bate com soma das tag01s (após fix):
-- No browser: expandir "02. CUSTOS VARIÁVEIS" e somar as linhas tag01.
-- Deve bater com o total da linha azul escura do tag0.
