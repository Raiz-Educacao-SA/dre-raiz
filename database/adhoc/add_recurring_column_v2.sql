-- Script simplificado para adicionar coluna 'recurring' na tabela transactions
-- Execute este script no Supabase SQL Editor (https://supabase.com/dashboard)

-- Adicionar coluna 'recurring' com valor padrão 'Sim'
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurring TEXT DEFAULT 'Sim';

-- Atualizar registros existentes que possam estar NULL
UPDATE transactions
SET recurring = 'Sim'
WHERE recurring IS NULL;

-- Verificar o resultado
SELECT
    'Total de registros:' as tipo,
    COUNT(*) as quantidade
FROM transactions
UNION ALL
SELECT
    'Com recurring = Sim:' as tipo,
    COUNT(*) as quantidade
FROM transactions
WHERE recurring = 'Sim'
UNION ALL
SELECT
    'Com recurring = Não:' as tipo,
    COUNT(*) as quantidade
FROM transactions
WHERE recurring = 'Não'
UNION ALL
SELECT
    'Com recurring NULL:' as tipo,
    COUNT(*) as quantidade
FROM transactions
WHERE recurring IS NULL;
