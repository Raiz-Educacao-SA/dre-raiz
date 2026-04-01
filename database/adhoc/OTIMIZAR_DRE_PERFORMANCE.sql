-- =====================================================
-- OTIMIZAÇÃO: Performance do DRE
-- =====================================================
-- Data: 11/02/2026
-- Problema: Timeout ao executar get_dre_summary
-- Solução: Criar índices + Otimizar query + Aumentar timeout
-- =====================================================

-- =====================================================
-- PASSO 1: Criar índices compostos para otimizar WHERE + GROUP BY
-- =====================================================

-- Índices para transactions_orcado
CREATE INDEX IF NOT EXISTS idx_transactions_orcado_composite
  ON transactions_orcado(date, marca, nome_filial, tag01);

CREATE INDEX IF NOT EXISTS idx_transactions_orcado_groupby
  ON transactions_orcado(scenario, conta_contabil, date, tag01, tag02, tag03, type);

-- Índices para transactions_ano_anterior
CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_composite
  ON transactions_ano_anterior(date, marca, nome_filial, tag01);

CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_groupby
  ON transactions_ano_anterior(scenario, conta_contabil, date, tag01, tag02, tag03, type);

-- Índice para transactions (se não existir)
CREATE INDEX IF NOT EXISTS idx_transactions_composite
  ON transactions(date, marca, nome_filial, tag01);

-- =====================================================
-- PASSO 2: Função otimizada SEM JOIN com tag0_map
-- (JOIN será feito no cliente para reduzir carga)
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
  tag01 text,
  tag02 text,
  tag03 text,
  tipo text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
SET statement_timeout = '60s'  -- Timeout de 60 segundos
AS $$
  -- UNION de todas as 3 tabelas de transações
  WITH all_transactions AS (
    -- 1. Transações REAIS (transactions)
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

    -- 2. Transações ORÇADAS (transactions_orcado)
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

    -- 3. Transações ANO ANTERIOR (transactions_ano_anterior)
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

  -- Agregar resultados (SEM JOIN com tag0_map)
  SELECT
    at.scenario,
    at.conta_contabil,
    substring(at.date, 1, 7) as year_month,
    COALESCE(at.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(at.tag02, 'Sem tag02') as tag02,
    COALESCE(at.tag03, 'Sem tag03') as tag03,
    at.type as tipo,
    SUM(at.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM all_transactions at
  GROUP BY
    at.scenario,
    at.conta_contabil,
    substring(at.date, 1, 7),
    COALESCE(at.tag01, 'Sem Subclassificação'),
    COALESCE(at.tag02, 'Sem tag02'),
    COALESCE(at.tag03, 'Sem tag03'),
    at.type
$$;

COMMENT ON FUNCTION get_dre_summary IS 'DRE agregado (3 tabelas, otimizado, sem JOIN tag0_map)';

-- =====================================================
-- PASSO 3: Atualizar get_dre_dimension com timeout
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
SET statement_timeout = '60s'
AS $$
BEGIN
  IF p_dimension NOT IN ('tag02', 'tag03', 'category', 'marca', 'nome_filial', 'vendor', 'ticket', 'responsavel') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'WITH all_transactions AS (
       SELECT COALESCE(scenario, ''Real'') as scenario, %I as dimension_col, date::text as date,
              conta_contabil, amount, marca, nome_filial, tag01
       FROM transactions
       WHERE ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))

       UNION ALL

       SELECT COALESCE(scenario, ''Orçado'') as scenario, %I as dimension_col, date::text as date,
              conta_contabil, amount, marca, nome_filial, tag01
       FROM transactions_orcado
       WHERE ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))

       UNION ALL

       SELECT COALESCE(scenario, ''A-1'') as scenario, %I as dimension_col, date::text as date,
              conta_contabil, amount, marca, nome_filial, tag01
       FROM transactions_ano_anterior
       WHERE ($1 IS NULL OR date::text >= $1 || ''-01'')
         AND ($2 IS NULL OR date::text <= $2 || ''-31'')
         AND ($3 IS NULL OR conta_contabil = ANY($3))
         AND ($5 IS NULL OR marca = ANY($5))
         AND ($6 IS NULL OR nome_filial = ANY($6))
         AND ($7 IS NULL OR tag01 = ANY($7))
     )
     SELECT COALESCE(CAST(dimension_col AS text), ''N/A'') as dimension_value,
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

-- =====================================================
-- VERIFICAÇÃO: Teste rápido
-- =====================================================

-- Teste simples (deve ser rápido)
SELECT scenario, COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Com os índices e otimizações:
-- - Tempo de execução < 10 segundos
-- - Retorna dados dos 3 cenários
-- =====================================================
