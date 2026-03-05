-- Índice composto para ORDER BY date DESC, id ASC (usado pela RPC paginada)
-- Evita sort em disco para admin (sem filtros de permissão = muitos rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_date_desc_id_asc
ON transactions (date DESC, id ASC);
