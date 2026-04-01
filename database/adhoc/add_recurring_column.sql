-- Script para adicionar coluna 'recurring' na tabela transactions
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a coluna já existe (não vai dar erro se já existir)
DO $$
BEGIN
    -- Adicionar coluna 'recurring' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'recurring'
    ) THEN
        ALTER TABLE transactions
        ADD COLUMN recurring TEXT DEFAULT 'Sim';

        RAISE NOTICE 'Coluna "recurring" adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna "recurring" já existe na tabela.';
    END IF;
END $$;

-- 2. Atualizar todos os registros existentes que não têm valor (NULL)
UPDATE transactions
SET recurring = 'Sim'
WHERE recurring IS NULL;

-- 3. Verificar o resultado
SELECT
    COUNT(*) as total_registros,
    COUNT(CASE WHEN recurring = 'Sim' THEN 1 END) as recorrentes,
    COUNT(CASE WHEN recurring = 'Não' THEN 1 END) as nao_recorrentes,
    COUNT(CASE WHEN recurring IS NULL THEN 1 END) as sem_valor
FROM transactions;
