-- ════════════════════════════════════════════════════════════════════════
-- RENOMEAR_TAG0_PARA_06_RATEIO.sql
-- Renomeia '05. RATEIO RAIZ' → '06. RATEIO RAIZ' em todas as tabelas
--
-- CONTEXTO:
--   A ordem da DRE foi reorganizada:
--   01. RECEITA → 02. CUSTOS VARIÁVEIS → 03. CUSTOS FIXOS
--   → 04. MARGEM DE CONTRIBUIÇÃO (calculada)
--   → 05. EBITDA (S/ RATEIO RAIZ CSC) (a implementar)
--   → 06. RATEIO RAIZ (era 05., agora 06.)
--
-- EXECUTE NA ORDEM NO SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: Diagnóstico — quantos registros serão afetados ─────────────
SELECT
  'tag0_map'                AS tabela,
  COUNT(*)                  AS registros_afetados
FROM tag0_map
WHERE tag0 = '05. RATEIO RAIZ'

UNION ALL

SELECT
  'transactions'            AS tabela,
  COUNT(*)                  AS registros_afetados
FROM transactions
WHERE tag0 = '05. RATEIO RAIZ'

UNION ALL

SELECT
  'transactions_orcado'     AS tabela,
  COUNT(*)                  AS registros_afetados
FROM transactions_orcado
WHERE tag0 = '05. RATEIO RAIZ'

UNION ALL

SELECT
  'transactions_ano_anterior' AS tabela,
  COUNT(*)                    AS registros_afetados
FROM transactions_ano_anterior
WHERE tag0 = '05. RATEIO RAIZ';


-- ─── PASSO 2: Atualizar tag0_map ─────────────────────────────────────────
UPDATE tag0_map
SET tag0 = '06. RATEIO RAIZ'
WHERE tag0 = '05. RATEIO RAIZ';

-- Verificar:
SELECT tag1_norm, tag0 FROM tag0_map WHERE tag0 = '06. RATEIO RAIZ';


-- ─── PASSO 3: Atualizar transactions (Real/Orçado) ───────────────────────
UPDATE transactions
SET tag0 = '06. RATEIO RAIZ'
WHERE tag0 = '05. RATEIO RAIZ';

-- Verificar:
SELECT COUNT(*) AS atualizados FROM transactions WHERE tag0 = '06. RATEIO RAIZ';


-- ─── PASSO 4: Atualizar transactions_orcado ──────────────────────────────
UPDATE transactions_orcado
SET tag0 = '06. RATEIO RAIZ'
WHERE tag0 = '05. RATEIO RAIZ';

-- Verificar:
SELECT COUNT(*) AS atualizados FROM transactions_orcado WHERE tag0 = '06. RATEIO RAIZ';


-- ─── PASSO 5: Atualizar transactions_ano_anterior ────────────────────────
UPDATE transactions_ano_anterior
SET tag0 = '06. RATEIO RAIZ'
WHERE tag0 = '05. RATEIO RAIZ';

-- Verificar:
SELECT COUNT(*) AS atualizados FROM transactions_ano_anterior WHERE tag0 = '06. RATEIO RAIZ';


-- ─── PASSO 6: Confirmar que não restou nenhum '05. RATEIO RAIZ' ──────────
SELECT 'tag0_map'               AS tabela, COUNT(*) AS restantes FROM tag0_map               WHERE tag0 = '05. RATEIO RAIZ'
UNION ALL
SELECT 'transactions'           AS tabela, COUNT(*) AS restantes FROM transactions           WHERE tag0 = '05. RATEIO RAIZ'
UNION ALL
SELECT 'transactions_orcado'    AS tabela, COUNT(*) AS restantes FROM transactions_orcado    WHERE tag0 = '05. RATEIO RAIZ'
UNION ALL
SELECT 'transactions_ano_anterior' AS tabela, COUNT(*) AS restantes FROM transactions_ano_anterior WHERE tag0 = '05. RATEIO RAIZ';
-- Todos devem retornar 0
