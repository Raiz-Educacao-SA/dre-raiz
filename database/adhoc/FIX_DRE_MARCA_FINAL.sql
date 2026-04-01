-- =====================================================
-- CORREÇÃO FINAL: get_dre_summary com filtro de marca
-- Data: 14/02/2026
-- Versão: FINAL
-- =====================================================
-- Esta função:
-- 1. Faz UNION das 3 tabelas (Real + Orçado + A-1)
-- 2. LEFT JOIN com tag0_map para obter tag0
-- 3. Aplica filtros de marca/filial/tag01 CORRETAMENTE
-- 4. Converte date para TEXT para compatibilidade no UNION
-- =====================================================

-- PASSO 1: Remover função antiga
DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

-- PASSO 2: Criar função CORRETA com UNION e filtros
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
  marca text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
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
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
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
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
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
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))
  )

  -- Agregar resultados com LEFT JOIN tag0_map
  SELECT
    at.scenario,
    at.conta_contabil,
    SUBSTRING(at.date, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(at.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(at.tag02, 'Sem tag02') as tag02,
    COALESCE(at.tag03, 'Sem tag03') as tag03,
    at.type as tipo,
    at.marca,
    SUM(at.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM all_transactions at
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(at.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY
    at.scenario,
    at.conta_contabil,
    SUBSTRING(at.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(at.tag01, 'Sem Subclassificação'),
    COALESCE(at.tag02, 'Sem tag02'),
    COALESCE(at.tag03, 'Sem tag03'),
    at.type,
    at.marca
$$;

COMMENT ON FUNCTION get_dre_summary IS 'DRE agregado combinando 3 tabelas com filtro de marca - VERSÃO FINAL 14/02/2026';

-- =====================================================
-- TESTES DE VALIDAÇÃO
-- =====================================================

-- TESTE 1: SEM filtro (todas as marcas)
-- Deve retornar AP, CGS, GT, QI
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
WHERE marca IS NOT NULL
GROUP BY marca
ORDER BY marca;


-- TESTE 2: COM filtro marca = 'AP'
-- Deve retornar APENAS AP
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;


-- TESTE 3: COM filtro marca = 'GT'
-- Deve retornar APENAS GT
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;


-- TESTE 4: Ver amostra de dados com tag0 mapeado
SELECT
  scenario,
  marca,
  tag0,
  tag01,
  year_month,
  total_amount
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
ORDER BY ABS(total_amount) DESC
LIMIT 20;


-- =====================================================
-- RESULTADO ESPERADO DOS TESTES:
-- =====================================================
-- TESTE 1: Deve mostrar 4 marcas (AP, CGS, GT, QI) com totais diferentes
-- TESTE 2: Deve mostrar APENAS marca AP
-- TESTE 3: Deve mostrar APENAS marca GT (total diferente de AP!)
-- TESTE 4: Deve mostrar tag0 preenchido (não "Sem Classificação" para todas)
-- =====================================================
