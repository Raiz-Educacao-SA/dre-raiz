-- ============================================
-- Cronograma Financeiro — Tabela + Trigger + Realtime
-- RLS desabilitado — controle de acesso via frontend (AdminPanel = admin only)
-- ============================================

-- 1. Tabela principal
CREATE TABLE IF NOT EXISTS cronograma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  date_label TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  area_color TEXT NOT NULL DEFAULT '#6B7280',
  deliverable TEXT NOT NULL DEFAULT '',
  action_description TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL CHECK (item_type IN ('task', 'meeting')),
  meeting_day TEXT,
  meeting_time TEXT,
  meeting_brand TEXT,
  meeting_obs TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index para queries por mês/ano
CREATE INDEX IF NOT EXISTS idx_cronograma_year_month_active
  ON cronograma_items (year, month, is_active);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION update_cronograma_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cronograma_updated_at ON cronograma_items;
CREATE TRIGGER trg_cronograma_updated_at
  BEFORE UPDATE ON cronograma_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

-- 4. RLS desabilitado (acesso controlado pelo frontend)
ALTER TABLE cronograma_items DISABLE ROW LEVEL SECURITY;

-- 5. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cronograma_items;
