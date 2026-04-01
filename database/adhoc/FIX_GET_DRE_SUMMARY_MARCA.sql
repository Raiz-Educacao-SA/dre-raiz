-- =====================================================
-- CORREÇÃO: get_dre_summary deve filtrar por marca
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Remover a função antiga
DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

-- 2. Recriar a função com os filtros corretos
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text,
  p_month_to text,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE (
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    t.conta_contabil,
    TO_CHAR(t.date::date, 'YYYY-MM') as year_month,
    t.tag0,
    t.tag01,
    t.tag02,
    t.tag03,
    t.tipo,
    t.marca,
    SUM(t.amount) as total_amount,
    COUNT(*) as tx_count
  FROM transactions t
  WHERE t.date::date >= (p_month_from || '-01')::date
    AND t.date::date <= (p_month_to || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day'
    -- ✅ FILTRO DE MARCA (case-insensitive)
    AND (
      p_marcas IS NULL
      OR array_length(p_marcas, 1) IS NULL
      OR UPPER(t.marca) = ANY(SELECT UPPER(unnest(p_marcas)))
    )
    -- ✅ FILTRO DE FILIAL (case-insensitive)
    AND (
      p_nome_filiais IS NULL
      OR array_length(p_nome_filiais, 1) IS NULL
      OR UPPER(t.nome_filial) = ANY(SELECT UPPER(unnest(p_nome_filiais)))
    )
    -- ✅ FILTRO DE TAG01
    AND (
      p_tags01 IS NULL
      OR array_length(p_tags01, 1) IS NULL
      OR t.tag01 = ANY(p_tags01)
    )
  GROUP BY
    t.scenario,
    t.conta_contabil,
    TO_CHAR(t.date::date, 'YYYY-MM'),
    t.tag0,
    t.tag01,
    t.tag02,
    t.tag03,
    t.tipo,
    t.marca
  ORDER BY
    t.scenario,
    TO_CHAR(t.date::date, 'YYYY-MM'),
    t.tag0,
    t.tag01;
END;
$$;

-- =====================================================
-- TESTE RÁPIDO após a correção
-- =====================================================

-- 1. Testar SEM filtro (deve retornar TODAS as marcas)
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
WHERE marca IS NOT NULL
GROUP BY marca
ORDER BY marca;

-- Deve mostrar: AP, CGS, GT, QI (todas as marcas)


-- 2. Testar COM filtro de marca = 'AP'
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;

-- Deve mostrar APENAS: AP


-- 3. Testar COM filtro de marca = 'GT'
SELECT
  marca,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;

-- Deve mostrar APENAS: GT


-- 4. Comparar totais: Manual vs RPC
-- Se batarem → CORREÇÃO BEM-SUCEDIDA! ✅

-- Manual (AP):
SELECT SUM(amount) as total_manual_ap
FROM transactions
WHERE date::date >= '2025-01-01' AND date::date <= '2025-12-31'
  AND UPPER(marca) = 'AP';

-- RPC (AP):
SELECT SUM(total_amount) as total_rpc_ap
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Os dois valores devem ser IDÊNTICOS!
