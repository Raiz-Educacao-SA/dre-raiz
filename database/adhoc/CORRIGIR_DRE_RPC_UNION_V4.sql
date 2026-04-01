-- =====================================================
-- CORREÇÃO V4: DRE RPC com UNION das 3 tabelas
-- =====================================================
-- Data: 11/02/2026
-- Problema: Funções RPC consultavam apenas 'transactions'
-- Solução: UNION de transactions + transactions_orcado + transactions_ano_anterior
-- FIX V4: Tabelas têm tipos diferentes para 'date' - cast para TEXT
-- =====================================================

-- =====================================================
-- 1. get_dre_summary: UNION de todas as 3 tabelas
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE(
  scenario text,
  conta_contabil text,
  year_month text,
  tag0 text,
  tag01 text,
  tag02 text,
  tag03 text,
  tipo text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  -- UNION de todas as 3 tabelas de transações
  WITH all_transactions AS (
    -- 1. Transações REAIS (transactions) - date é TEXT
    SELECT
      COALESCE(scenario, 'Real') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))

    UNION ALL

    -- 2. Transações ORÇADAS (transactions_orcado) - date é DATE
    SELECT
      COALESCE(scenario, 'Orçado') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions_orcado
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))

    UNION ALL

    -- 3. Transações ANO ANTERIOR (transactions_ano_anterior) - date é DATE
    SELECT
      COALESCE(scenario, 'A-1') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions_ano_anterior
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))
  )

  -- Agregar resultados
  SELECT
    at.scenario,
    at.conta_contabil,
    substring(at.date, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(at.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(at.tag02, 'Sem tag02') as tag02,
    COALESCE(at.tag03, 'Sem tag03') as tag03,
    at.type as tipo,
    SUM(at.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM all_transactions at
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(at.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY
    at.scenario,
    at.conta_contabil,
    substring(at.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(at.tag01, 'Sem Subclassificação'),
    COALESCE(at.tag02, 'Sem tag02'),
    COALESCE(at.tag03, 'Sem tag03'),
    at.type
$$;

COMMENT ON FUNCTION get_dre_summary IS 'Retorna dados agregados de DRE combinando transactions + transactions_orcado + transactions_ano_anterior';

-- =====================================================
-- 2. get_dre_dimension: UNION de todas as 3 tabelas
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario text DEFAULT NULL,
  p_dimension text DEFAULT 'marca',
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE(
  dimension_value text,
  year_month text,
  total_amount numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Validar nome da coluna para prevenir SQL injection
  IF p_dimension NOT IN ('tag02', 'tag03', 'category', 'marca', 'nome_filial', 'vendor', 'ticket', 'responsavel') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'WITH all_transactions AS (
       -- 1. Transações REAIS (date pode ser TEXT ou DATE)
       SELECT
         COALESCE(scenario, ''Real'') as scenario,
         %I as dimension_col,
         date::text as date,
         conta_contabil,
         amount,
         marca,
         nome_filial,
         tag01
       FROM transactions
       WHERE
         ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))

       UNION ALL

       -- 2. Transações ORÇADAS (date é DATE)
       SELECT
         COALESCE(scenario, ''Orçado'') as scenario,
         %I as dimension_col,
         date::text as date,
         conta_contabil,
         amount,
         marca,
         nome_filial,
         tag01
       FROM transactions_orcado
       WHERE
         ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))

       UNION ALL

       -- 3. Transações ANO ANTERIOR (date é DATE)
       SELECT
         COALESCE(scenario, ''A-1'') as scenario,
         %I as dimension_col,
         date::text as date,
         conta_contabil,
         amount,
         marca,
         nome_filial,
         tag01
       FROM transactions_ano_anterior
       WHERE
         ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))
     )
     SELECT
       COALESCE(CAST(dimension_col AS text), ''N/A'') as dimension_value,
       substring(date, 1, 7) as year_month,
       SUM(amount) as total_amount
     FROM all_transactions
     WHERE ($4 IS NULL OR scenario = $4)
     GROUP BY COALESCE(CAST(dimension_col AS text), ''N/A''), substring(date, 1, 7)',
    p_dimension, p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01;
END;
$$;

COMMENT ON FUNCTION get_dre_dimension IS 'Drill-down por dimensão combinando transactions + transactions_orcado + transactions_ano_anterior';

-- =====================================================
-- 3. get_dre_filter_options: UNION de todas as 3 tabelas
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL
)
RETURNS TABLE(
  marcas text[],
  nome_filiais text[],
  tags01 text[]
)
LANGUAGE sql STABLE
AS $$
  WITH all_transactions AS (
    SELECT marca, nome_filial, tag01, date::text as date FROM transactions
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')

    UNION

    SELECT marca, nome_filial, tag01, date::text as date FROM transactions_orcado
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')

    UNION

    SELECT marca, nome_filial, tag01, date::text as date FROM transactions_ano_anterior
    WHERE
      (p_month_from IS NULL OR date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')
  )
  SELECT
    ARRAY(SELECT DISTINCT marca FROM all_transactions WHERE marca IS NOT NULL ORDER BY marca) as marcas,
    ARRAY(SELECT DISTINCT nome_filial FROM all_transactions WHERE nome_filial IS NOT NULL ORDER BY nome_filial) as nome_filiais,
    ARRAY(SELECT DISTINCT tag01 FROM all_transactions WHERE tag01 IS NOT NULL ORDER BY tag01) as tags01
$$;

COMMENT ON FUNCTION get_dre_filter_options IS 'Opções de filtro combinando transactions + transactions_orcado + transactions_ano_anterior';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Testar get_dre_summary (deve retornar 3 cenários)
SELECT scenario, COUNT(*) as linhas, SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario
ORDER BY scenario;

-- Testar get_dre_filter_options
SELECT
  ARRAY_LENGTH(marcas, 1) as qtd_marcas,
  ARRAY_LENGTH(nome_filiais, 1) as qtd_filiais,
  ARRAY_LENGTH(tags01, 1) as qtd_tags01
FROM get_dre_filter_options('2026-01', '2026-12');

-- Ver primeiras linhas de cada cenário
SELECT scenario, year_month, tag0, tag01, SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month, tag0, tag01
ORDER BY scenario, year_month
LIMIT 20;

-- =====================================================
-- CORREÇÕES APLICADAS (V4)
-- =====================================================
-- ✅ Cast EXPLÍCITO de date para TEXT: date::text
-- ✅ Funciona independente do tipo (DATE ou TEXT)
-- ✅ Comparação sempre TEXT com TEXT
-- ✅ substring(date, 1, 7) para year_month
-- ✅ UNION ALL nas 3 tabelas de transações
-- ✅ Mantém filtros de RLS (marca, nome_filial, tag01)
-- =====================================================
