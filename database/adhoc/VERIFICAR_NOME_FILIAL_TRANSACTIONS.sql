-- =====================================================
-- VERIFICAR: Como está o campo nome_filial na transactions?
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver sample de nome_filial na transactions
SELECT DISTINCT
  marca,
  nome_filial
FROM transactions
WHERE nome_filial IS NOT NULL
  AND marca IS NOT NULL
ORDER BY marca, nome_filial
LIMIT 30;

-- 2. Verificar se nome_filial já inclui a marca
SELECT
  nome_filial,
  marca,
  CASE
    WHEN nome_filial LIKE marca || ' - %' THEN 'SIM - Já inclui marca'
    ELSE 'NÃO - Não inclui marca'
  END as inclui_marca
FROM transactions
WHERE nome_filial IS NOT NULL
  AND marca IS NOT NULL
LIMIT 20;

-- 3. Contar quantos já incluem vs não incluem
SELECT
  CASE
    WHEN nome_filial LIKE marca || ' - %' THEN 'Inclui marca (GT - Nome)'
    ELSE 'Não inclui marca (só Nome)'
  END as formato,
  COUNT(*) as total
FROM transactions
WHERE nome_filial IS NOT NULL
  AND marca IS NOT NULL
GROUP BY
  CASE
    WHEN nome_filial LIKE marca || ' - %' THEN 'Inclui marca (GT - Nome)'
    ELSE 'Não inclui marca (só Nome)'
  END;
