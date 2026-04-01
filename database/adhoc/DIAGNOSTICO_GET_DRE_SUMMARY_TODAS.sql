-- =====================================================
-- DIAGNÓSTICO: Por que get_dre_summary perde tag01s quando marca = NULL?
-- =====================================================

-- 1. Quantas tag01 DISTINTAS existem por marca na tabela transactions?
SELECT 
  marca,
  COUNT(DISTINCT tag01) as qtd_tag01_distintas
FROM transactions
WHERE tag01 IS NOT NULL
  AND date >= '2026-01-01' AND date <= '2026-12-31'
GROUP BY marca
ORDER BY marca;

-- 2. União de TODAS as tag01 de todas as marcas (quantas no total?)
SELECT 
  COUNT(DISTINCT tag01) as total_tag01_unicas
FROM transactions
WHERE tag01 IS NOT NULL
  AND date >= '2026-01-01' AND date <= '2026-12-31';

-- 3. get_dre_summary COM filtro de marca (ex: GT)
SELECT 
  COUNT(DISTINCT tag01) as qtd_tag01,
  COUNT(*) as qtd_linhas
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL)
WHERE tag01 IS NOT NULL AND tag01 != 'Sem Subclassificação';

-- 4. get_dre_summary SEM filtro de marca (NULL)
SELECT 
  COUNT(DISTINCT tag01) as qtd_tag01,
  COUNT(*) as qtd_linhas
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 IS NOT NULL AND tag01 != 'Sem Subclassificação';

-- 5. Verificar se há tag01s que aparecem em transactions mas NÃO em get_dre_summary (marca = NULL)
SELECT DISTINCT t.tag01
FROM transactions t
WHERE t.tag01 IS NOT NULL
  AND t.date >= '2026-01-01' AND t.date <= '2026-12-31'
  AND t.tag01 NOT IN (
    SELECT DISTINCT tag01
    FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
    WHERE tag01 IS NOT NULL
  )
ORDER BY t.tag01;

-- 6. Verificar se o problema está no JOIN com tag0_map
-- Quantas transações têm tag01 que NÃO existe no tag0_map?
SELECT 
  COUNT(*) as transacoes_sem_mapeamento,
  COUNT(DISTINCT tag01) as tag01s_sem_mapeamento
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.tag01 IS NOT NULL
  AND t.date >= '2026-01-01' AND t.date <= '2026-12-31'
  AND tm.tag0 IS NULL;
