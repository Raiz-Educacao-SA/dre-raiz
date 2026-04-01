-- ================================================================================
-- VERIFICAR ESTRUTURA DAS TABELAS
-- ================================================================================
-- Execute este script para ver as colunas reais das tabelas

-- Ver colunas da tabela dre_fabric
SELECT
  'dre_fabric' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dre_fabric'
ORDER BY ordinal_position;

-- Ver colunas da tabela transactions
SELECT
  'transactions' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Ver exemplo de dados do dre_fabric (1 registro)
SELECT * FROM dre_fabric LIMIT 1;

-- Ver exemplo de dados do transactions (1 registro)
SELECT * FROM transactions LIMIT 1;
