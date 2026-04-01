-- =====================================================
-- DIAGNÓSTICO: Verificar marcas na tabela transactions
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Total de registros na tabela
SELECT
  'TOTAL GERAL' as tipo,
  COUNT(*) as total
FROM transactions;

-- 2. Registros COM marca preenchida
SELECT
  'COM MARCA' as tipo,
  COUNT(*) as total
FROM transactions
WHERE marca IS NOT NULL;

-- 3. Registros SEM marca (NULL)
SELECT
  'SEM MARCA (NULL)' as tipo,
  COUNT(*) as total
FROM transactions
WHERE marca IS NULL;

-- 4. Marcas únicas que existem
SELECT
  'MARCAS ÚNICAS' as info,
  marca,
  COUNT(*) as total_registros
FROM transactions
WHERE marca IS NOT NULL
GROUP BY marca
ORDER BY marca;

-- 5. Combinações únicas de marca + filial + nome_filial
SELECT
  marca,
  filial,
  nome_filial,
  COUNT(*) as total_registros
FROM transactions
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS NOT NULL
GROUP BY marca, filial, nome_filial
ORDER BY marca, nome_filial;

-- 6. Verificar se GT, QI, CGS existem
SELECT
  marca,
  COUNT(*) as total
FROM transactions
WHERE marca IN ('GT', 'QI', 'CGS', 'RZ')
GROUP BY marca
ORDER BY marca;

-- 7. Sample de registros com marcas diferentes de RZ
SELECT
  marca,
  filial,
  nome_filial,
  date,
  amount
FROM transactions
WHERE marca IS NOT NULL
  AND marca != 'RZ'
LIMIT 10;
