-- ============================================================
-- Performance Indexes — transactions & manual_changes
-- Executar no Supabase SQL Editor
-- Seguro: CREATE INDEX IF NOT EXISTS (idempotente)
-- ============================================================

-- Indexes individuais para filtros mais comuns
CREATE INDEX IF NOT EXISTS idx_tx_tag01 ON transactions(tag01);
CREATE INDEX IF NOT EXISTS idx_tx_tag02 ON transactions(tag02);
CREATE INDEX IF NOT EXISTS idx_tx_marca ON transactions(marca);
CREATE INDEX IF NOT EXISTS idx_tx_nome_filial ON transactions(nome_filial);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_recurring ON transactions(recurring);
CREATE INDEX IF NOT EXISTS idx_tx_scenario ON transactions(scenario);

-- Index composto para queries com múltiplos filtros simultâneos
CREATE INDEX IF NOT EXISTS idx_tx_composite_filters ON transactions(marca, nome_filial, tag01, tag02, date);

-- manual_changes — filtro por status (pendente/aprovado) e ordenação por data
CREATE INDEX IF NOT EXISTS idx_mc_status ON manual_changes(status);
CREATE INDEX IF NOT EXISTS idx_mc_requested_at ON manual_changes(requested_at DESC);

-- ============================================================
-- RPC: get_distinct_marcas_filiais
-- Retorna combinações únicas de marca + nome_filial (DISTINCT)
-- Substitui full table scan de 50K+ rows
-- ============================================================
CREATE OR REPLACE FUNCTION get_distinct_marcas_filiais()
RETURNS TABLE(marca text, nome_filial text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT t.marca, t.nome_filial
  FROM transactions t
  WHERE t.marca IS NOT NULL AND t.nome_filial IS NOT NULL
  ORDER BY t.marca, t.nome_filial;
$$;
