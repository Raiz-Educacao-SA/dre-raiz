-- ============================================================
-- REVIEW TRACKING — Parte 3: Adicionar created_at na RPC
-- Rodar POR ULTIMO
-- ============================================================

-- A RPC get_filtered_transactions_page hoje retorna:
--   id, date, description, conta_contabil, category, amount, type, scenario,
--   status, filial, marca, tag0, tag01, tag02, tag03, recurring, ticket,
--   vendor, nat_orc, chave_id, nome_filial, updated_at
--
-- Precisamos adicionar created_at ao SELECT.
--
-- IMPORTANTE: a coluna created_at ja existe na tabela transactions.
-- Se por algum motivo nao existir, rodar antes:
--   ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Verificar se created_at existe (rodar manualmente para confirmar):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'transactions' AND column_name = 'created_at';

-- ============================================================
-- INSTRUCAO MANUAL:
-- ============================================================
-- Abrir o SQL da RPC get_filtered_transactions_page (v3)
-- e adicionar ", created_at::timestamptz" ao final do SELECT.
--
-- Exemplo — de:
--   'SELECT id::text, date::text, ..., updated_at::timestamptz FROM transactions'
-- para:
--   'SELECT id::text, date::text, ..., updated_at::timestamptz, created_at::timestamptz FROM transactions'
--
-- Fazer o mesmo para transactions_manual (se tiver created_at).
--
-- Alternativa segura (nao altera a RPC existente):
-- Usar COALESCE para garantir que funciona mesmo se nao existir:
-- ============================================================

-- Adicionar created_at na tabela transactions (idempotente, caso nao exista)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Adicionar created_at na tabela transactions_manual (idempotente)
ALTER TABLE transactions_manual ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- Limpeza automatica (opcional — pg_cron)
-- Limpa seen com mais de 60 dias para evitar crescimento
-- ============================================================
-- SELECT cron.schedule(
--   'cleanup_old_seen',
--   '0 3 * * 0',  -- todo domingo as 3h
--   $$DELETE FROM user_transaction_seen WHERE seen_at < now() - interval '60 days'$$
-- );
