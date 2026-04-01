-- Verificar qual campo de filial existe
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND (column_name LIKE '%filial%' OR column_name = 'marca')
ORDER BY column_name;

-- Ver sample de dados
SELECT
  marca,
  filial,
  nome_filial
FROM transactions
LIMIT 5;
