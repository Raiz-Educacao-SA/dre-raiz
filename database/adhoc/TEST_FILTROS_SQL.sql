-- ======================================
-- TESTE DOS FILTROS DRE
-- Execute no Supabase SQL Editor
-- ======================================

-- 1. Ver estrutura de dados REAL no banco
SELECT DISTINCT
  marca,
  nome_filial,
  tag01,
  COUNT(*) as total_registros
FROM transactions
WHERE date >= '2026-01-01'
GROUP BY marca, nome_filial, tag01
ORDER BY marca, nome_filial, tag01
LIMIT 50;

-- 2. Ver o que a tabela FILIAL tem
SELECT DISTINCT
  cia,
  filial,
  nomefilial,
  cia || ' - ' || nomefilial as label_completo
FROM filial
ORDER BY cia, nomefilial
LIMIT 30;

-- 3. Comparar: O que está na transactions vs o que está na filial
SELECT
  'TRANSACTIONS' as origem,
  COUNT(DISTINCT marca) as total_marcas,
  COUNT(DISTINCT nome_filial) as total_filiais,
  COUNT(DISTINCT tag01) as total_tags01
FROM transactions
WHERE date >= '2026-01-01'
UNION ALL
SELECT
  'FILIAL' as origem,
  COUNT(DISTINCT cia) as total_marcas,
  COUNT(DISTINCT nomefilial) as total_filiais,
  NULL as total_tags01
FROM filial;

-- 4. Testar RPC SEM filtros (deve retornar dados)
SELECT COUNT(*) as total_sem_filtros
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL);

-- 5. Testar RPC COM filtro de MARCA
-- IMPORTANTE: Troque 'QI' pelo valor exato que existe no banco
SELECT COUNT(*) as total_com_marca_QI
FROM get_dre_summary('2026-01', '2026-12', ARRAY['QI'], NULL, NULL);

-- 6. Testar RPC COM filtro de FILIAL
-- IMPORTANTE: Veja primeiro o formato exato no SELECT 1 acima
-- Exemplo: Se no banco está "UNIDADE CAMPINAS", use isso:
SELECT COUNT(*) as total_com_filial
FROM get_dre_summary('2026-01', '2026-12', NULL, ARRAY['UNIDADE CAMPINAS'], NULL);

-- 7. Testar RPC COM filtro de TAG01
-- IMPORTANTE: Veja primeiro os valores exatos no SELECT 1 acima
SELECT COUNT(*) as total_com_tag01
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, ARRAY['MENSALIDADE']);

-- 8. Ver sample de 10 registros completos
SELECT
  marca,
  nome_filial,
  tag01,
  conta_contabil,
  scenario,
  date,
  amount
FROM transactions
WHERE date >= '2026-01-01'
LIMIT 10;
