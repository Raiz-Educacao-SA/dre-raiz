-- =====================================================
-- DIAGNÓSTICO COMPLETO: Imóveis e Concessionárias
-- =====================================================

-- 1. Verificar se existem transações dessas tag01 no período 2026
SELECT 
  tag01,
  scenario,
  COUNT(*) as total_transactions,
  SUM(amount) as valor_total,
  MIN(date) as primeira_data,
  MAX(date) as ultima_data
FROM transactions
WHERE (tag01 ILIKE '%im%vel%' OR tag01 ILIKE '%concession%')
  AND date >= '2026-01-01' AND date <= '2026-12-31'
GROUP BY tag01, scenario
ORDER BY tag01, scenario;

-- 2. Ver o que get_dre_summary retorna (SEM FILTROS)
SELECT 
  tag0,
  tag01,
  scenario,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 ILIKE '%im%vel%' OR tag01 ILIKE '%concession%'
GROUP BY tag0, tag01, scenario
ORDER BY tag0, tag01, scenario;

-- 3. Ver TODAS as tag01 únicas retornadas por get_dre_summary
SELECT DISTINCT tag01
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 IS NOT NULL AND tag01 != 'Sem Subclassificação'
ORDER BY tag01;

-- 4. Contar quantas tag01 temos no total
SELECT 
  COUNT(DISTINCT tag01) as total_tag01_distintas,
  COUNT(*) as total_linhas_summary
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 IS NOT NULL;
