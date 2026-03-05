-- Corrige statement_timeout para as roles da API do Supabase
-- O default é 8s, insuficiente para queries com COUNT ou JOINs em ~50K+ rows
-- Executar no Supabase SQL Editor

-- 1. Aumentar timeout para 30s nas roles que a API usa
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '30s';

-- 2. Atualizar estatísticas do planner para usar os novos índices
ANALYZE transactions;
ANALYZE transactions_orcado;
ANALYZE transactions_ano_anterior;

-- 3. Verificar que os índices estão sendo usados
-- (executar separadamente para ver o plano)
-- EXPLAIN ANALYZE SELECT count(*) FROM transactions WHERE (scenario IS NULL OR scenario = 'Real');
