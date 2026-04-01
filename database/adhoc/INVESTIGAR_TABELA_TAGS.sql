-- =====================================================
-- INVESTIGAR ESTRUTURA DA TABELA TAGS
-- Execute no Supabase SQL Editor e me envie o resultado
-- =====================================================

-- 1. Ver colunas da tabela tags
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tags'
ORDER BY ordinal_position;

-- 2. Ver alguns registros de exemplo (10 primeiros)
SELECT *
FROM tags
LIMIT 10;

-- 3. Contar registros por tag01 (ver hierarquia)
SELECT tag01, COUNT(*) as total_tag02
FROM tags
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY total_tag02 DESC
LIMIT 10;

-- 4. Ver exemplo completo da hierarquia
SELECT tag01, tag02, tag03, COUNT(*) as count
FROM tags
WHERE tag01 IS NOT NULL AND tag02 IS NOT NULL
GROUP BY tag01, tag02, tag03
ORDER BY tag01, tag02, tag03
LIMIT 20;
