-- =====================================================
-- TESTAR DIRETO NA TABELA TRANSACTIONS
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Contar registros de 2026 DIRETAMENTE na tabela
SELECT COUNT(*) as total_2026_direto
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-12-31';

-- 2. Ver formato do campo DATE
SELECT
  date,
  TYPEOF(date) as tipo_campo,
  LENGTH(date) as tamanho
FROM transactions
LIMIT 5;

-- 3. Testar a condição que a função usa (date é TEXT)
SELECT COUNT(*) as total_com_condicao_funcao
FROM transactions
WHERE date >= '2026-01' || '-01'
  AND date <= '2026-12' || '-31';

-- 4. Ver sample de datas
SELECT DISTINCT
  date,
  substring(date, 1, 7) as year_month
FROM transactions
WHERE date LIKE '2026%'
ORDER BY date
LIMIT 20;

-- 5. Verificar se a função get_dre_summary existe
SELECT COUNT(*) as funcao_existe
FROM pg_proc
WHERE proname = 'get_dre_summary';

-- 6. Testar a query EXATA que está dentro da função (sem GROUP BY)
SELECT COUNT(*) as total_sem_group_by
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE
  (t.date >= '2026-01' || '-01')
  AND (t.date <= '2026-12' || '-31');

-- 7. Testar SEM o JOIN com tag0_map
SELECT COUNT(*) as total_sem_join
FROM transactions t
WHERE
  (t.date >= '2026-01' || '-01')
  AND (t.date <= '2026-12' || '-31');

-- 8. Ver se tag0_map está vazio
SELECT COUNT(*) as total_tag0_map
FROM tag0_map;
