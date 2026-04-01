-- =====================================================
-- TESTE: Simular expansão de GT na DRE
-- Deve retornar APENAS filiais que começam com "GT -"
-- Execute no Supabase SQL Editor
-- =====================================================

-- Simular o que acontece quando você expande GT
-- (busca dimensão nome_filial filtrando por marca='GT')
SELECT
  dimension_value as filial,
  SUM(total_amount) as total
FROM get_dre_dimension(
  '2026-01',          -- month_from
  '2026-12',          -- month_to
  NULL,               -- todas as contas
  'Real',             -- scenario
  'nome_filial',      -- dimensão (busca filiais)
  ARRAY['GT'],        -- ⭐ FILTRAR por marca GT
  NULL,               -- nenhuma filial específica
  NULL,               -- tags01
  NULL,               -- tags02
  NULL                -- tags03
)
GROUP BY dimension_value
ORDER BY dimension_value;

-- ✅ RESULTADO ESPERADO: Deve aparecer APENAS filiais que começam com "GT -"
-- ❌ NÃO DEVE aparecer: CGS - Barra Golf, QI - Botafogo, etc.
-- ✅ DEVE aparecer: GT - Peninsula, GT - Bom Tempo, etc.
