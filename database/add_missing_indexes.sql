-- ═══════════════════════════════════════════════════════════════════
-- add_missing_indexes.sql
-- Índices faltantes para filtros da guia Lançamentos
-- Melhora performance de: tag03, conta_contabil, vendor, ticket
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- transactions
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_tx_tag03 ON transactions(tag03);
CREATE INDEX IF NOT EXISTS idx_tx_conta_contabil ON transactions(conta_contabil);
CREATE INDEX IF NOT EXISTS idx_tx_vendor ON transactions USING gin(vendor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tx_chave_id ON transactions(chave_id);

-- ══════════════════════════════════════════════════════════════
-- transactions_orcado
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_txo_tag03 ON transactions_orcado(tag03);
CREATE INDEX IF NOT EXISTS idx_txo_conta_contabil ON transactions_orcado(conta_contabil);
CREATE INDEX IF NOT EXISTS idx_txo_vendor ON transactions_orcado USING gin(vendor gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════
-- transactions_ano_anterior
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_txa_tag03 ON transactions_ano_anterior(tag03);
CREATE INDEX IF NOT EXISTS idx_txa_conta_contabil ON transactions_ano_anterior(conta_contabil);
CREATE INDEX IF NOT EXISTS idx_txa_vendor ON transactions_ano_anterior USING gin(vendor gin_trgm_ops);

-- Nota: os índices gin_trgm_ops requerem a extensão pg_trgm.
-- Se der erro, execute primeiro: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Ou substitua por índices btree simples:
--   CREATE INDEX IF NOT EXISTS idx_tx_vendor ON transactions(vendor);
