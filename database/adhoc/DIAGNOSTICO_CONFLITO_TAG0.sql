-- =====================================================
-- DIAGNÓSTICO: Conflito de tag0 entre marcas
-- =====================================================

-- 1. Ver se a mesma tag01 tem tag0 DIFERENTES dependendo da marca
SELECT 
  t.tag01,
  t.marca,
  tm.tag0,
  COUNT(*) as total_transactions
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.tag01 IN (
  SELECT DISTINCT tag01 
  FROM transactions 
  WHERE tag01 ILIKE '%im%vel%' OR tag01 ILIKE '%concession%'
)
GROUP BY t.tag01, t.marca, tm.tag0
ORDER BY t.tag01, t.marca;

-- 2. Verificar se há tag01 com múltiplos tag0
SELECT 
  t.tag01,
  COUNT(DISTINCT tm.tag0) as qtd_tag0_diferentes,
  STRING_AGG(DISTINCT tm.tag0, ', ') as tag0s_diferentes
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.tag01 IS NOT NULL
GROUP BY t.tag01
HAVING COUNT(DISTINCT tm.tag0) > 1
ORDER BY qtd_tag0_diferentes DESC
LIMIT 20;

-- 3. Comparar: tag01 com TODAS marcas vs marca específica (ex: GT)
-- 3a. TODAS as marcas
SELECT DISTINCT tag01, tag0
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 IS NOT NULL
ORDER BY tag01;

-- 3b. Marca GT específica
SELECT DISTINCT tag01, tag0
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL)
WHERE tag01 IS NOT NULL
ORDER BY tag01;

-- 4. Ver quantas linhas get_dre_summary retorna em cada caso
SELECT 
  'TODAS marcas' as filtro,
  COUNT(DISTINCT tag01) as qtd_tag01,
  COUNT(*) as total_linhas
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
UNION ALL
SELECT 
  'Marca GT' as filtro,
  COUNT(DISTINCT tag01) as qtd_tag01,
  COUNT(*) as total_linhas
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL);
