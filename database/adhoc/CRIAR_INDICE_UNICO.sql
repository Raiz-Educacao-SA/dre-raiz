-- ================================================================================
-- CRIAR ÍNDICE ÚNICO EM transactions.chave_id
-- ================================================================================
-- Necessário para usar ON CONFLICT na sincronização
-- ================================================================================

-- Verificar se há duplicatas antes de criar o índice
SELECT
  chave_id,
  COUNT(*) as quantidade
FROM transactions
WHERE chave_id IS NOT NULL
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Se a query acima retornar registros, há duplicatas!
-- Nesse caso, precisamos limpar antes de criar o índice.

-- Criar o índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_chave_id_unique
ON transactions(chave_id)
WHERE chave_id IS NOT NULL;

-- Verificar se foi criado
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND indexname LIKE '%chave_id%';

-- Resultado esperado:
-- ✅ idx_transactions_chave_id_unique criado com sucesso

SELECT '✅ ÍNDICE ÚNICO CRIADO COM SUCESSO!' as status;
