-- =====================================================
-- TESTE FINAL: 3 marcas devem retornar valores DIFERENTES
-- Execute no Supabase SQL Editor
-- =====================================================

-- TESTE 1: Marca AP
SELECT
  'AP' as marca_testada,
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total,
  COUNT(DISTINCT tag0) as tag0_distintos
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- TESTE 2: Marca GT
SELECT
  'GT' as marca_testada,
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total,
  COUNT(DISTINCT tag0) as tag0_distintos
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- TESTE 3: Marca QI
SELECT
  'QI' as marca_testada,
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total,
  COUNT(DISTINCT tag0) as tag0_distintos
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['QI']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Os 3 testes devem retornar valores DIFERENTES!
-- Se retornarem valores IGUAIS → função ainda não está filtrando
-- =====================================================
