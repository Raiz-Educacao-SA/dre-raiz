-- ══════════════════════════════════════════════════════════════════════
-- ATUALIZAR TAG01, TAG02, TAG03 VIA CONTA_CONTABIL (TABELA TAGS)
-- ══════════════════════════════════════════════════════════════════════
--
-- Tabelas afetadas:
--   - transactions              (Real)
--   - transactions_orcado       (Orçado)
--   - transactions_ano_anterior (A-1)
--
-- Mapeamento (PROCV):
--   *.conta_contabil  →  tags.cod_conta   (chave de lookup)
--   *.tag01           ←  tags.tag1
--   *.tag02           ←  tags.tag2
--   *.tag03           ←  tags.tag3
--
-- COMO USAR:
--   1. Abra o SQL Editor no Supabase
--   2. Execute o PASSO 1 (diagnóstico) para conferir
--   3. Execute o PASSO 2 (update) para aplicar
--   4. Execute o PASSO 3 (verificação) para confirmar
-- ══════════════════════════════════════════════════════════════════════


-- ── PASSO 1: DIAGNÓSTICO — quantos registros têm match na tabela tags ──

SELECT 'transactions' AS tabela,
       COUNT(*) AS total,
       COUNT(tg.cod_conta) AS com_match,
       COUNT(*) - COUNT(tg.cod_conta) AS sem_match
FROM transactions tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta

UNION ALL

SELECT 'transactions_orcado',
       COUNT(*),
       COUNT(tg.cod_conta),
       COUNT(*) - COUNT(tg.cod_conta)
FROM transactions_orcado tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta

UNION ALL

SELECT 'transactions_ano_anterior',
       COUNT(*),
       COUNT(tg.cod_conta),
       COUNT(*) - COUNT(tg.cod_conta)
FROM transactions_ano_anterior tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta;


-- ── PASSO 2: UPDATE — aplica o PROCV nas 3 tabelas ─────────────────────

-- 2a. transactions (Real)
UPDATE transactions AS tr
SET
  tag01 = tg.tag1,
  tag02 = tg.tag2,
  tag03 = tg.tag3
FROM tags tg
WHERE tr.conta_contabil = tg.cod_conta
  AND tr.conta_contabil IS NOT NULL;

-- 2b. transactions_orcado (Orçado)
UPDATE transactions_orcado AS tr
SET
  tag01 = tg.tag1,
  tag02 = tg.tag2,
  tag03 = tg.tag3
FROM tags tg
WHERE tr.conta_contabil = tg.cod_conta
  AND tr.conta_contabil IS NOT NULL;

-- 2c. transactions_ano_anterior (A-1)
UPDATE transactions_ano_anterior AS tr
SET
  tag01 = tg.tag1,
  tag02 = tg.tag2,
  tag03 = tg.tag3
FROM tags tg
WHERE tr.conta_contabil = tg.cod_conta
  AND tr.conta_contabil IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 3: VERIFICAÇÃO PÓS-UPDATE
-- ══════════════════════════════════════════════════════════════════════

-- 3a. Resumo por tabela: quantos com/sem tag01 preenchido
SELECT 'transactions' AS tabela,
       COUNT(*) AS total,
       COUNT(tag01) AS com_tag01,
       COUNT(*) - COUNT(tag01) AS sem_tag01
FROM transactions
UNION ALL
SELECT 'transactions_orcado', COUNT(*), COUNT(tag01), COUNT(*) - COUNT(tag01)
FROM transactions_orcado
UNION ALL
SELECT 'transactions_ano_anterior', COUNT(*), COUNT(tag01), COUNT(*) - COUNT(tag01)
FROM transactions_ano_anterior;

-- 3b. Conta_contabil que ficaram SEM match (não existe na tabela tags)
SELECT 'transactions' AS tabela, tr.conta_contabil, COUNT(*) AS qtd
FROM transactions tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta
WHERE tg.cod_conta IS NULL AND tr.conta_contabil IS NOT NULL
GROUP BY tr.conta_contabil
UNION ALL
SELECT 'transactions_orcado', tr.conta_contabil, COUNT(*)
FROM transactions_orcado tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta
WHERE tg.cod_conta IS NULL AND tr.conta_contabil IS NOT NULL
GROUP BY tr.conta_contabil
UNION ALL
SELECT 'transactions_ano_anterior', tr.conta_contabil, COUNT(*)
FROM transactions_ano_anterior tr
LEFT JOIN tags tg ON tr.conta_contabil = tg.cod_conta
WHERE tg.cod_conta IS NULL AND tr.conta_contabil IS NOT NULL
GROUP BY tr.conta_contabil
ORDER BY tabela, qtd DESC;

-- 3c. Distribuição de tag01 por tabela (top 20)
SELECT 'transactions' AS tabela, COALESCE(tag01, '(vazio)') AS tag01, COUNT(*) AS qtd
FROM transactions GROUP BY tag01
UNION ALL
SELECT 'transactions_orcado', COALESCE(tag01, '(vazio)'), COUNT(*)
FROM transactions_orcado GROUP BY tag01
UNION ALL
SELECT 'transactions_ano_anterior', COALESCE(tag01, '(vazio)'), COUNT(*)
FROM transactions_ano_anterior GROUP BY tag01
ORDER BY tabela, qtd DESC;
