-- =====================================================
-- TESTE DETALHADO: Por que AP e GT retornam vazios?
-- =====================================================

-- TESTE 1: Ver TODAS as marcas únicas nos dados brutos
SELECT DISTINCT
  marca,
  LENGTH(marca) as tamanho,
  marca = 'AP' as equals_AP,
  marca = 'GT' as equals_GT,
  marca = 'QI' as equals_QI
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-12-31'
ORDER BY marca;

-- TESTE 2: Contar transações por marca (dados brutos)
SELECT
  marca,
  COUNT(*) as transacoes,
  SUM(amount) as total
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-12-31'
GROUP BY marca
ORDER BY marca;

-- TESTE 3: Chamar RPC get_dre_summary SEM filtro
SELECT
  marca,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
WHERE marca IS NOT NULL
GROUP BY marca
ORDER BY marca;

-- TESTE 4: Chamar RPC get_dre_summary COM filtro AP
SELECT
  marca,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;

-- TESTE 5: Chamar RPC get_dre_summary COM filtro GT
SELECT
  marca,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;

-- TESTE 6: Chamar RPC get_dre_summary COM filtro QI
SELECT
  marca,
  COUNT(*) as linhas_agregadas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['QI']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
GROUP BY marca
ORDER BY marca;

-- TESTE 7: Ver amostra de dados com marca AP (primeiras 10 linhas)
SELECT *
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := ARRAY['AP']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
LIMIT 10;

-- =====================================================
-- O QUE PROCURAR NOS RESULTADOS:
-- =====================================================
-- TESTE 1: Deve mostrar as marcas EXATAS do banco (com espaços, case, etc.)
-- TESTE 2: Deve mostrar quantas transações cada marca tem
-- TESTE 3: Deve mostrar todas as marcas depois da agregação
-- TESTES 4-6: Deve mostrar dados APENAS da marca filtrada
-- TESTE 7: Deve retornar pelo menos algumas linhas se AP tem dados
-- =====================================================
