-- =====================================================
-- ANÁLISE: Filiais duplicadas em CIAs diferentes
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver filiais que existem em múltiplas CIAs
SELECT
  nomefilial,
  STRING_AGG(DISTINCT cia, ', ') as cias,
  COUNT(DISTINCT cia) as total_cias
FROM filial
GROUP BY nomefilial
HAVING COUNT(DISTINCT cia) > 1
ORDER BY total_cias DESC, nomefilial;

-- 2. Ver estrutura completa da tabela FILIAL
SELECT
  cia,
  filial as codigo_filial,
  nomefilial
FROM filial
ORDER BY cia, nomefilial
LIMIT 30;

-- 3. Ver como está na tabela TRANSACTIONS
SELECT DISTINCT
  marca,
  filial,
  COUNT(*) as total_registros
FROM transactions
WHERE date >= '2026-01-01'
GROUP BY marca, filial
ORDER BY marca, filial
LIMIT 30;

-- 4. Verificar se transactions.filial bate com filial.filial (código)
SELECT
  'FILIAL TABLE' as fonte,
  filial as codigo
FROM filial
UNION
SELECT
  'TRANSACTIONS' as fonte,
  filial as codigo
FROM transactions
WHERE date >= '2026-01-01'
ORDER BY fonte, codigo
LIMIT 50;
