-- =====================================================
-- DIAGNÓSTICO: Por que Imóveis e Concessionárias sumiram?
-- Execute no Supabase SQL Editor e me mostre o resultado
-- =====================================================

-- 1. Ver se essas tag01 existem no banco de transactions
SELECT 
  tag01,
  COUNT(*) as total_transactions,
  SUM(amount) as valor_total
FROM transactions
WHERE tag01 ILIKE '%im%vel%' OR tag01 ILIKE '%concession%'
GROUP BY tag01;

-- 2. Ver se estão no mapeamento tag0_map
SELECT *
FROM tag0_map
WHERE tag1_norm ILIKE '%im%vel%' OR tag1_norm ILIKE '%concession%';

-- 3. Testar o que get_dre_summary retorna para essas tags
SELECT 
  scenario,
  conta_contabil,
  year_month,
  tag0,
  tag01,
  tipo,
  total_amount,
  tx_count
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 ILIKE '%im%vel%' OR tag01 ILIKE '%concession%'
ORDER BY tag01, year_month;

-- 4. Ver TODAS as tag01 que get_dre_summary retorna
SELECT DISTINCT tag01, SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY tag01;
