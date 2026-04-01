-- =====================================================
-- DIAGNÓSTICO: get_dre_summary não está filtrando marca
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver o código atual da função
SELECT routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dre_summary'
  AND routine_type = 'FUNCTION';

-- Procure por:
-- 1. Se existe "WHERE marca = ANY(p_marcas)" ou similar
-- 2. Se existe "AND (p_marcas IS NULL OR marca = ANY(p_marcas))"
-- 3. Como está sendo feito o filtro


-- 2. Testar manualmente: aggregar transactions para marca AP
SELECT
  scenario,
  conta_contabil,
  TO_CHAR(date, 'YYYY-MM') as year_month,
  tag0,
  tag01,
  SUM(amount) as total_amount,
  COUNT(*) as tx_count
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND marca = 'AP'  -- ← Filtro de marca
GROUP BY scenario, conta_contabil, year_month, tag0, tag01
ORDER BY ABS(SUM(amount)) DESC
LIMIT 20;

-- Anote o total: _______________


-- 3. Testar o RPC com filtro de marca AP
SELECT
  scenario,
  conta_contabil,
  year_month,
  tag0,
  tag01,
  total_amount,
  tx_count
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
ORDER BY ABS(total_amount) DESC
LIMIT 20;

-- Compare os resultados!
-- Se forem DIFERENTES → RPC tem bug


-- 4. Comparar totais gerais
-- Manual:
SELECT SUM(amount) as total_manual
FROM transactions
WHERE date >= '2025-01-01'
  AND date <= '2025-12-31'
  AND marca = 'AP';

-- RPC:
SELECT SUM(total_amount) as total_rpc
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Devem ser IGUAIS!
-- Se diferentes → RPC está ignorando o filtro de marca


-- =====================================================
-- POSSÍVEIS CAUSAS DO BUG:
-- =====================================================

-- A) Filtro de marca comentado ou removido da função
-- B) Condição errada: WHERE marca IN (p_marcas) ao invés de marca = ANY(p_marcas)
-- C) Filtro só é aplicado se p_marcas IS NOT NULL AND array_length(p_marcas, 1) > 0
-- D) Função está usando nome_filial em vez de marca
