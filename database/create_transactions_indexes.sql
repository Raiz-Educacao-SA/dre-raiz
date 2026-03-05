-- Índices para otimizar queries da guia Lançamentos
-- Resolve statement_timeout em queries com filtros recurring/scenario/date
-- Executar no Supabase SQL Editor

-- Índice composto para a query mais comum: cenário Real + ordenação por data
-- Cobre: scenario IS NULL OR scenario = 'Real', ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_transactions_scenario_date
ON transactions (scenario, date DESC);

-- Índice para filtro de recorrência (usado com IN em vez de ILIKE)
CREATE INDEX IF NOT EXISTS idx_transactions_recurring
ON transactions (recurring);

-- Índice para filtro de marca (cascata de filtros)
CREATE INDEX IF NOT EXISTS idx_transactions_marca
ON transactions (marca);

-- Índice para filtro de data (range queries gte/lte)
CREATE INDEX IF NOT EXISTS idx_transactions_date
ON transactions (date);

-- Índice para tag01 (cascata de filtros e permissões)
CREATE INDEX IF NOT EXISTS idx_transactions_tag01
ON transactions (tag01);

-- Índice para tag02 (cascata tag01→tag02)
CREATE INDEX IF NOT EXISTS idx_transactions_tag02
ON transactions (tag02);
