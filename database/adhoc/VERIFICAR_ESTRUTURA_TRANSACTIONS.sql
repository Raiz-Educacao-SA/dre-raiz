-- =====================================================
-- VERIFICAR estrutura da tabela transactions
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver todas as colunas da tabela transactions
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Ver sample de dados (5 linhas)
SELECT *
FROM transactions
WHERE date >= '2026-01-01'
LIMIT 5;

-- 3. Ver função RPC antiga (se existir)
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dre_summary'
  AND routine_type = 'FUNCTION';
