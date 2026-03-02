-- ══════════════════════════════════════════════════════════════════════
-- ATUALIZAR TAG0 EM TODAS AS TABELAS VIA TAG0_MAP
-- ══════════════════════════════════════════════════════════════════════
--
-- Tabelas afetadas:
--   - transactions            (Real)
--   - transactions_orcado     (Orçado)
--   - transactions_ano_anterior (A-1)
--
-- Lógica:
--   1. Cria coluna tag0 se não existir
--   2. Limpa tag0 existente (SET NULL)
--   3. Repopula tag0 via JOIN com tag0_map (tag01 → tag0)
--
-- COMO USAR:
--   1. Abra o SQL Editor no Supabase
--   2. Cole este arquivo e clique em Run
--   3. Confira o diagnóstico no final
-- ══════════════════════════════════════════════════════════════════════


-- ── PASSO 1: Garantir que a coluna tag0 existe nas 3 tabelas ────────

ALTER TABLE transactions              ADD COLUMN IF NOT EXISTS tag0 TEXT;
ALTER TABLE transactions_orcado       ADD COLUMN IF NOT EXISTS tag0 TEXT;
ALTER TABLE transactions_ano_anterior ADD COLUMN IF NOT EXISTS tag0 TEXT;


-- ── PASSO 2: Limpar tag0 existente ─────────────────────────────────

UPDATE transactions              SET tag0 = NULL WHERE tag0 IS NOT NULL;
UPDATE transactions_orcado       SET tag0 = NULL WHERE tag0 IS NOT NULL;
UPDATE transactions_ano_anterior SET tag0 = NULL WHERE tag0 IS NOT NULL;


-- ── PASSO 3: Repopular tag0 via tag0_map ────────────────────────────

-- 3a. transactions (Real)
UPDATE transactions t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND t.tag01 IS NOT NULL;

-- 3b. transactions_orcado (Orçado)
UPDATE transactions_orcado t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND t.tag01 IS NOT NULL;

-- 3c. transactions_ano_anterior (A-1)
UPDATE transactions_ano_anterior t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND t.tag01 IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO
-- ══════════════════════════════════════════════════════════════════════

-- Resumo por tabela: quantos com/sem tag0
SELECT 'transactions' AS tabela,
       COUNT(*) AS total,
       COUNT(tag0) AS com_tag0,
       COUNT(*) - COUNT(tag0) AS sem_tag0
FROM transactions
UNION ALL
SELECT 'transactions_orcado',
       COUNT(*),
       COUNT(tag0),
       COUNT(*) - COUNT(tag0)
FROM transactions_orcado
UNION ALL
SELECT 'transactions_ano_anterior',
       COUNT(*),
       COUNT(tag0),
       COUNT(*) - COUNT(tag0)
FROM transactions_ano_anterior;

-- Tag01 que ficaram SEM mapeamento (verificar se falta na tag0_map)
SELECT 'transactions' AS tabela, tag01, COUNT(*) AS qtd
FROM transactions
WHERE tag01 IS NOT NULL AND tag0 IS NULL
GROUP BY tag01
UNION ALL
SELECT 'transactions_orcado', tag01, COUNT(*)
FROM transactions_orcado
WHERE tag01 IS NOT NULL AND tag0 IS NULL
GROUP BY tag01
UNION ALL
SELECT 'transactions_ano_anterior', tag01, COUNT(*)
FROM transactions_ano_anterior
WHERE tag01 IS NOT NULL AND tag0 IS NULL
GROUP BY tag01
ORDER BY tabela, qtd DESC;

-- Distribuição de tag0 por tabela (conferência visual)
SELECT 'transactions' AS tabela, COALESCE(tag0, '(sem tag0)') AS tag0, COUNT(*) AS qtd
FROM transactions WHERE tag01 IS NOT NULL
GROUP BY tag0
UNION ALL
SELECT 'transactions_orcado', COALESCE(tag0, '(sem tag0)'), COUNT(*)
FROM transactions_orcado WHERE tag01 IS NOT NULL
GROUP BY tag0
UNION ALL
SELECT 'transactions_ano_anterior', COALESCE(tag0, '(sem tag0)'), COUNT(*)
FROM transactions_ano_anterior WHERE tag01 IS NOT NULL
GROUP BY tag0
ORDER BY tabela, tag0;
