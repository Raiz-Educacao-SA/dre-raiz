-- =============================================================================
-- DIAGNOSTICO_TAG0_MAP.sql
-- Verificar e corrigir mapeamento de tag01 → tag0 no dre_agg
-- Execute no Supabase SQL Editor
-- =============================================================================

-- 1. Ver o que está em "Sem Classificação" no dre_agg (tag01s sem mapeamento)
SELECT
  tag01,
  scenario,
  SUM(total_amount) AS total,
  COUNT(*) AS linhas
FROM dre_agg
WHERE tag0 = 'Sem Classificação'
  AND year_month BETWEEN '2026-01' AND '2026-12'
GROUP BY tag01, scenario
ORDER BY ABS(SUM(total_amount)) DESC;

-- =============================================================================

-- 2. Ver todas as entradas atuais do tag0_map
SELECT tag1_norm, tag0
FROM tag0_map
ORDER BY tag0, tag1_norm;

-- =============================================================================

-- 3. Verificar especificamente "Receitas Não Operacionais" na dre_agg
SELECT
  tag0,
  tag01,
  scenario,
  SUM(total_amount) AS total
FROM dre_agg
WHERE LOWER(tag01) LIKE '%receita%n%o%'
   OR LOWER(tag01) LIKE '%n%o%operac%'
GROUP BY tag0, tag01, scenario
ORDER BY tag0, scenario;

-- =============================================================================

-- 4. SE "Receitas Não Operacionais" não estiver em tag0_map → INSERIR aqui:
-- (Ajuste o nome exato conforme resultado da query 1 acima)
/*
INSERT INTO tag0_map (tag1_norm, tag0)
VALUES ('Receitas Não Operacionais', '01. RECEITA')
ON CONFLICT (tag1_norm) DO UPDATE SET tag0 = EXCLUDED.tag0;
*/

-- =============================================================================

-- 5. Após inserir em tag0_map → OBRIGATÓRIO: refazer dre_agg
-- SELECT refresh_dre_agg();

-- =============================================================================

-- 6. Verificar soma por tag0 após refresh (deve bater com SomaTagsView)
SELECT
  tag0,
  scenario,
  SUM(total_amount) AS total
FROM dre_agg
WHERE year_month BETWEEN '2026-01' AND '2026-12'
GROUP BY tag0, scenario
ORDER BY tag0, scenario;
