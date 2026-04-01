-- =====================================================
-- TESTE ESPECÍFICO DO FILTRO DE MARCA
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver marcas disponíveis na tabela FILIAL
SELECT DISTINCT cia
FROM filial
ORDER BY cia;

-- 2. Ver marcas disponíveis na tabela TRANSACTIONS
SELECT DISTINCT marca
FROM transactions
WHERE date >= '2026-01-01'
ORDER BY marca;

-- 3. Comparar se batem
SELECT
  'FILIAL' as fonte,
  cia as valor
FROM filial
GROUP BY cia
UNION ALL
SELECT
  'TRANSACTIONS' as fonte,
  marca as valor
FROM transactions
WHERE date >= '2026-01-01'
GROUP BY marca
ORDER BY fonte, valor;

-- 4. Testar a função COM filtro de marca
-- IMPORTANTE: Ajuste 'QI' para uma marca que EXISTE nos SELECTs acima
SELECT COUNT(*) as total_com_filtro_marca
FROM get_dre_summary('2026-01', '2026-12', ARRAY['QI'], NULL, NULL);

-- 5. Ver sample de dados filtrados por marca
SELECT *
FROM get_dre_summary('2026-01', '2026-12', ARRAY['QI'], NULL, NULL)
LIMIT 5;

-- 6. Verificar se a função está usando o campo correto
SELECT
  t.marca,
  COUNT(*) as total
FROM transactions t
WHERE
  t.date >= '2026-01-01'
  AND t.date <= '2026-12-31'
  AND t.marca = 'QI'  -- Teste direto
GROUP BY t.marca;
