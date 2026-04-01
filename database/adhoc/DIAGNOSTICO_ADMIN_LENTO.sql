-- =====================================================
-- DIAGNÓSTICO: Por que Admin demora tanto
-- =====================================================

-- 1. Contar total de registros
SELECT COUNT(*) as total_registros FROM transactions;

-- 2. Contar por ano
SELECT
  SUBSTRING(date::text, 1, 4) as ano,
  COUNT(*) as registros
FROM transactions
GROUP BY SUBSTRING(date::text, 1, 4)
ORDER BY ano DESC;

-- 3. Testar query SEM filtro (como Admin faz)
-- ⏱️ Medir quanto tempo demora
SELECT COUNT(*) FROM get_dre_summary('2026-01', '2026-12');

-- 4. Testar query COM filtro (como usuário comum faz)
-- Exemplo: apenas marca 'RAIZ'
SELECT COUNT(*)
FROM get_dre_summary('2026-01', '2026-12')
WHERE scenario = 'Real';  -- Simula filtro

-- 5. Ver tamanho da query result
SELECT
  scenario,
  year_month,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;
