-- =====================================================
-- VERIFICAR SE HÁ DADOS NO BANCO
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver quantos registros existem NO TOTAL
SELECT COUNT(*) as total_geral
FROM transactions;

-- 2. Ver quais ANOS existem
SELECT
  SUBSTRING(date, 1, 4) as ano,
  COUNT(*) as total_registros
FROM transactions
GROUP BY SUBSTRING(date, 1, 4)
ORDER BY ano DESC;

-- 3. Ver registros de 2025 (se existir)
SELECT COUNT(*) as total_2025
FROM transactions
WHERE date >= '2025-01-01' AND date <= '2025-12-31';

-- 4. Ver registros de 2024 (se existir)
SELECT COUNT(*) as total_2024
FROM transactions
WHERE date >= '2024-01-01' AND date <= '2024-12-31';

-- 5. Ver últimos 10 registros (qualquer ano)
SELECT
  date,
  marca,
  nome_filial,
  tag01,
  scenario,
  amount
FROM transactions
ORDER BY date DESC
LIMIT 10;

-- 6. Testar a função com período LARGO (todos os anos)
SELECT COUNT(*) as total_funcao
FROM get_dre_summary('2020-01', '2030-12', NULL, NULL, NULL);

-- 7. Ver se a função existe
SELECT
  proname as nome_funcao,
  pg_get_functiondef(oid) as definicao
FROM pg_proc
WHERE proname = 'get_dre_summary';
