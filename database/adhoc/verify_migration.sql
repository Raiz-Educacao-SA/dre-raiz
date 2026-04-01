-- VERIFICAÇÃO DA MIGRAÇÃO
-- Execute este script no Supabase SQL Editor para confirmar que tudo está correto

-- 1. Verificar estrutura das colunas
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('filial', 'marca', 'branch', 'brand')
ORDER BY column_name;

-- Resultado esperado: Deve mostrar apenas 'filial' e 'marca'
-- Se mostrar 'branch' ou 'brand', a migração não foi completa

-- 2. Verificar índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND (indexname LIKE '%filial%' OR indexname LIKE '%marca%'
       OR indexname LIKE '%branch%' OR indexname LIKE '%brand%');

-- Resultado esperado:
-- idx_transactions_filial
-- idx_transactions_marca

-- 3. Contar registros com dados
SELECT
  COUNT(*) as total_registros,
  COUNT(filial) as com_filial,
  COUNT(marca) as com_marca,
  COUNT(CASE WHEN filial IS NULL THEN 1 END) as sem_filial,
  COUNT(CASE WHEN marca IS NULL THEN 1 END) as sem_marca
FROM transactions;

-- 4. Verificar função RLS
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'can_access_transaction';

-- Resultado esperado: Função deve ter parâmetros transaction_marca e transaction_filial

-- 5. Amostra de dados (primeiros 5 registros)
SELECT
  id,
  filial,
  marca,
  category,
  amount,
  date
FROM transactions
ORDER BY date DESC
LIMIT 5;
