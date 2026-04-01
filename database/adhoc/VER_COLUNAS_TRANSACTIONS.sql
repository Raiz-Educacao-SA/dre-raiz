-- =====================================================
-- VER ESTRUTURA DA TABELA TRANSACTIONS
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver todas as colunas da tabela transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Ver uma linha de exemplo
SELECT *
FROM transactions
LIMIT 1;

-- 3. Procurar colunas com 'tag' no nome
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name LIKE '%tag%'
ORDER BY column_name;
