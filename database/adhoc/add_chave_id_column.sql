-- Adicionar coluna chave_id na tabela transactions
-- Execute este script no SQL Editor do Supabase
-- Data: 2026-02-03

BEGIN;

-- 1. Adicionar coluna chave_id
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS chave_id TEXT;

-- 2. Criar índice para melhor performance (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_transactions_chave_id ON transactions(chave_id);

-- 3. Adicionar comentário na coluna (documentação)
COMMENT ON COLUMN transactions.chave_id IS 'Chave de identificação externa ou código de referência';

-- 4. Verificação - Mostrar a estrutura da coluna criada
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'chave_id';

-- 5. Contar registros com chave_id preenchida
SELECT
  COUNT(*) as total_registros,
  COUNT(chave_id) as com_chave_id,
  COUNT(CASE WHEN chave_id IS NULL THEN 1 END) as sem_chave_id
FROM transactions;

COMMIT;

-- Mensagem de sucesso
SELECT 'Coluna chave_id adicionada com sucesso!' as status;
