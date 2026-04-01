-- =====================================================
-- COMPARAR: Labels da tabela FILIAL vs TRANSACTIONS
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Labels da tabela FILIAL (o que estamos mostrando no dropdown)
SELECT DISTINCT
  cia || ' - ' || nomefilial as label_filial
FROM filial
ORDER BY 1
LIMIT 20;

-- 2. Labels da tabela TRANSACTIONS (o que está realmente nos dados)
SELECT DISTINCT
  nome_filial as label_transactions
FROM transactions
WHERE nome_filial IS NOT NULL
ORDER BY 1
LIMIT 20;

-- 3. TESTE DE MATCH: Verificar se as labels batem
WITH filial_labels AS (
  SELECT DISTINCT cia || ' - ' || nomefilial as label
  FROM filial
),
transactions_labels AS (
  SELECT DISTINCT nome_filial as label
  FROM transactions
  WHERE nome_filial IS NOT NULL
)
SELECT
  'Na FILIAL mas NÃO na TRANSACTIONS' as tipo,
  COUNT(*) as total
FROM filial_labels
WHERE label NOT IN (SELECT label FROM transactions_labels)

UNION ALL

SELECT
  'Na TRANSACTIONS mas NÃO na FILIAL' as tipo,
  COUNT(*) as total
FROM transactions_labels
WHERE label NOT IN (SELECT label FROM filial_labels);

-- 4. Ver exemplos de labels que NÃO batem
SELECT 'FILIAL' as origem, cia || ' - ' || nomefilial as label
FROM filial
WHERE (cia || ' - ' || nomefilial) NOT IN (
  SELECT nome_filial FROM transactions WHERE nome_filial IS NOT NULL
)
LIMIT 10;
