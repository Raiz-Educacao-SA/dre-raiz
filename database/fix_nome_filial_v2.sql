-- ================================================================
-- fix_nome_filial_v2.sql
-- FORCE: nome_filial = marca || ' - ' || filial para TODOS os registros
--
-- O v1 so corrigia null ou sem " - ". Mas existem registros onde
-- nome_filial ja tem " - " porem com marca ERRADA
-- (ex: marca='PHYTUS', filial='BOT', nome_filial='CGS - BOT')
--
-- Este script REESCREVE nome_filial em TODOS os registros.
--
-- EXECUTAR no Supabase SQL Editor
-- ================================================================

SET statement_timeout = 0;

-- 1. DIAGNOSTICO: verificar quantos registros tem nome_filial inconsistente
-- (descomente para rodar antes do fix)
--
-- SELECT marca, filial, nome_filial, marca || ' - ' || filial AS esperado, count(*)
-- FROM transactions
-- WHERE marca IS NOT NULL AND filial IS NOT NULL
--   AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial)
-- GROUP BY 1,2,3,4
-- ORDER BY count(*) DESC
-- LIMIT 50;

-- 2. FORCE UPDATE em todas as 3 tabelas
-- Atualiza TODOS os registros onde marca e filial existem

UPDATE transactions
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial);

UPDATE transactions_orcado
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial);

UPDATE transactions_ano_anterior
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial);

-- 3. Refresh dre_agg
REFRESH MATERIALIZED VIEW dre_agg;

-- 4. Verificacao pos-fix (deve retornar 0 rows)
SELECT 'transactions' AS tabela, count(*) AS inconsistentes
FROM transactions
WHERE marca IS NOT NULL AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial)
UNION ALL
SELECT 'transactions_orcado', count(*)
FROM transactions_orcado
WHERE marca IS NOT NULL AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial)
UNION ALL
SELECT 'transactions_ano_anterior', count(*)
FROM transactions_ano_anterior
WHERE marca IS NOT NULL AND filial IS NOT NULL
  AND nome_filial IS DISTINCT FROM (marca || ' - ' || filial);

RESET statement_timeout;
