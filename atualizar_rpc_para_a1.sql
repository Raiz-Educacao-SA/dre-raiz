-- ═══════════════════════════════════════════════════════════════════════════
-- atualizar_rpc_para_a1.sql
-- Reativa cenário A-1 no DRE Gerencial
--
-- EXECUTE NA ORDEM:
--   PASSO 1  → Diagnóstico nome_filial
--   PASSO 2  → Fix nome_filial (se necessário)
--   PASSO 3  → Atualiza get_dre_summary  (UNION ALL com transactions_ano_anterior)
--   PASSO 4  → Atualiza get_dre_dimension (rota condicional A-1)
--
-- COMO USAR:
--   Supabase → SQL Editor → Cole e execute cada PASSO separadamente
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: Diagnóstico — verificar nome_filial em transactions_ano_anterior ──
SELECT
  COUNT(*)                             AS total_registros,
  COUNT(nome_filial)                   AS com_nome_filial,
  COUNT(*) - COUNT(nome_filial)        AS sem_nome_filial,
  (COUNT(nome_filial)::numeric / COUNT(*) * 100)::int AS pct_preenchido
FROM transactions_ano_anterior
WHERE scenario = 'A-1';


-- ─── PASSO 2: Fix nome_filial (rode só se sem_nome_filial > 0) ─────────────────
-- Popula nome_filial via JOIN com tabela filial (marca + filial → nome_filial)
/*
UPDATE transactions_ano_anterior a
SET nome_filial = f.nome_filial
FROM filial f
WHERE a.marca  = f.cia
  AND a.filial = f.filial
  AND a.nome_filial IS NULL;

-- Verificar resultado:
SELECT COUNT(*) - COUNT(nome_filial) AS ainda_sem_nome_filial
FROM transactions_ano_anterior
WHERE scenario = 'A-1';
*/


-- ─── PASSO 3: Atualizar get_dre_summary (UNION ALL com transactions_ano_anterior) ──

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from  text    DEFAULT NULL,
  p_month_to    text    DEFAULT NULL,
  p_marcas      text[]  DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01      text[]  DEFAULT NULL
)
RETURNS TABLE(
  scenario      text,
  conta_contabil text,
  year_month    text,
  tag0          text,
  tag01         text,
  tag02         text,
  tag03         text,
  tipo          text,
  total_amount  numeric,
  tx_count      bigint
)
LANGUAGE sql STABLE
AS $$
  -- ── Cenários em transactions (Real, Orçado, etc.) ────────────────────────
  SELECT
    COALESCE(t.scenario, 'Real')              AS scenario,
    t.conta_contabil,
    substring(t.date, 1, 7)                   AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.tag02, 'Sem tag02')            AS tag02,
    COALESCE(t.tag03, 'Sem tag03')            AS tag03,
    t.type                                    AS tipo,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR t.date >= p_month_from   || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to     || '-31')
    AND (p_marcas   IS NULL OR t.marca  = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01   IS NULL OR t.tag01  = ANY(p_tags01))
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    t.conta_contabil,
    substring(t.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type

  UNION ALL

  -- ── Cenário A-1 (transactions_ano_anterior) — date é tipo DATE, usa ::text ──
  SELECT
    'A-1'                                     AS scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7)             AS year_month,
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.tag02, 'Sem tag02')            AS tag02,
    COALESCE(t.tag03, 'Sem tag03')            AS tag03,
    t.type                                    AS tipo,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    -- Filtra só por MÊS (ano irrelevante — A-1 é 2025, Real é 2026)
    (p_month_from  IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to, 6, 2))
    AND (p_marcas   IS NULL OR t.marca  = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01   IS NULL OR t.tag01  = ANY(p_tags01))
  GROUP BY
    t.conta_contabil,
    substring(t.date::text, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type
$$;

GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_summary(text,text,text[],text[],text[]) TO anon;


-- ─── PASSO 4: Atualizar get_dre_dimension (rota condicional + fallback tag0) ──

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
  p_tag0            text    DEFAULT NULL  -- fallback: inclui contas vazias do mesmo tag0
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
    -- A-1: inclui fallback para registros com conta_contabil vazia/nula
    -- quando p_tag0 é fornecido, usa tag0_map JOIN para verificar o contexto
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
    -- Real / Orçado: comportamento original sem JOIN tag0_map
    RETURN QUERY EXECUTE format(
      'SELECT
         COALESCE(CAST(%I AS text), ''N/A'') AS dimension_value,
         substring(%s, 1, 7)                AS year_month,
         SUM(t.amount)                      AS total_amount
       FROM %I t
       WHERE
         ($1 IS NULL OR %s)
         AND ($2 IS NULL OR %s)
         AND ($3 IS NULL OR t.conta_contabil = ANY($3))
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
      p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[],text) TO anon;


-- ─── PASSO 5: Verificação final ──────────────────────────────────────────────────
-- Testar get_dre_summary retornando cenários Real + A-1
/*
SELECT scenario, COUNT(*) AS linhas, SUM(total_amount) AS soma
FROM get_dre_summary('2025-01', '2025-12')
GROUP BY scenario
ORDER BY scenario;
-- Esperado: linhas para "Real" e "A-1"

-- Testar get_dre_dimension para A-1
SELECT * FROM get_dre_dimension(
  '2025-01', '2025-12',
  NULL, 'A-1', 'marca',
  NULL, NULL, NULL, NULL, NULL
)
LIMIT 10;
*/
