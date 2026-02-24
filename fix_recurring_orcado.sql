-- ═══════════════════════════════════════════════════════════════════
-- fix_recurring_orcado.sql
-- Corrige coluna recurring em transactions_orcado e transactions_ano_anterior
-- Problema: scripts de carga mapeavam células vazias para 'Nao'/'Não'
-- ao invés de NULL. COALESCE(NULL, 'Sim') = 'Sim', logo NULL é o correto.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Orçado: todos os 'Nao'/'Não' vieram de células vazias no Excel
--    Tabela Orçado não usa recurring de forma significativa —
--    NULL garante que COALESCE trate como 'Sim' (recorrente padrão)
UPDATE transactions_orcado
SET recurring = NULL
WHERE recurring IN ('Nao', 'Não', 'nao', 'não', 'NAO', 'NÃO');

-- 2. A-1 (ano anterior): mesma correção
UPDATE transactions_ano_anterior
SET recurring = NULL
WHERE recurring IN ('Nao', 'Não', 'nao', 'não', 'NAO', 'NÃO');

-- 3. Atualizar a view materializada para refletir a correção dos dados
SET statement_timeout = 0;
REFRESH MATERIALIZED VIEW dre_agg;
