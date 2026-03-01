-- ============================================
-- Benchmark Aggregates - Benchmark Intelligence Layer
-- Dados anonimizados de mercado para comparacao
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. TABELA PRINCIPAL (apenas agregados, sem dados identificaveis)
CREATE TABLE IF NOT EXISTS benchmark_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Segmento e faixa (anonimizado)
  industry_segment TEXT NOT NULL,
  revenue_range TEXT NOT NULL CHECK (revenue_range IN (
    'micro', 'small', 'medium', 'large', 'enterprise'
  )),

  -- Metricas agregadas (medias do segmento)
  avg_margin NUMERIC NOT NULL DEFAULT 0,
  avg_ebitda NUMERIC NOT NULL DEFAULT 0,
  avg_growth NUMERIC NOT NULL DEFAULT 0,
  avg_score NUMERIC NOT NULL DEFAULT 0 CHECK (avg_score >= 0 AND avg_score <= 100),

  -- Distribuicao por percentil
  percentile_25_margin NUMERIC NOT NULL DEFAULT 0,
  percentile_50_margin NUMERIC NOT NULL DEFAULT 0,
  percentile_75_margin NUMERIC NOT NULL DEFAULT 0,

  percentile_25_ebitda NUMERIC NOT NULL DEFAULT 0,
  percentile_50_ebitda NUMERIC NOT NULL DEFAULT 0,
  percentile_75_ebitda NUMERIC NOT NULL DEFAULT 0,

  percentile_25_score NUMERIC NOT NULL DEFAULT 0,
  percentile_50_score NUMERIC NOT NULL DEFAULT 0,
  percentile_75_score NUMERIC NOT NULL DEFAULT 0,

  percentile_25_growth NUMERIC NOT NULL DEFAULT 0,
  percentile_50_growth NUMERIC NOT NULL DEFAULT 0,
  percentile_75_growth NUMERIC NOT NULL DEFAULT 0,

  -- Minimo de empresas para publicar agregado (privacidade)
  sample_count INT NOT NULL DEFAULT 0 CHECK (sample_count >= 5),

  -- Periodo de referencia
  reference_period TEXT NOT NULL,

  -- Metadata
  source TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal', 'external', 'mixed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidade: um agregado por segmento + faixa + periodo
  UNIQUE(industry_segment, revenue_range, reference_period)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_benchmark_agg_segment ON benchmark_aggregates(industry_segment);
CREATE INDEX IF NOT EXISTS idx_benchmark_agg_revenue ON benchmark_aggregates(revenue_range);
CREATE INDEX IF NOT EXISTS idx_benchmark_agg_period ON benchmark_aggregates(reference_period);
CREATE INDEX IF NOT EXISTS idx_benchmark_agg_segment_revenue ON benchmark_aggregates(industry_segment, revenue_range);
CREATE INDEX IF NOT EXISTS idx_benchmark_agg_segment_period ON benchmark_aggregates(industry_segment, reference_period DESC);

-- 3. TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_benchmark_aggregates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_benchmark_aggregates_updated_at ON benchmark_aggregates;
CREATE TRIGGER trg_benchmark_aggregates_updated_at
  BEFORE UPDATE ON benchmark_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_benchmark_aggregates_updated_at();

-- 4. ROW LEVEL SECURITY
ALTER TABLE benchmark_aggregates ENABLE ROW LEVEL SECURITY;

-- SELECT: leitura para todos autenticados (dados ja sao anonimizados)
DROP POLICY IF EXISTS "benchmark_aggregates_select" ON benchmark_aggregates;
CREATE POLICY "benchmark_aggregates_select" ON benchmark_aggregates
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: somente admin
DROP POLICY IF EXISTS "benchmark_aggregates_insert" ON benchmark_aggregates;
CREATE POLICY "benchmark_aggregates_insert" ON benchmark_aggregates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "benchmark_aggregates_update" ON benchmark_aggregates;
CREATE POLICY "benchmark_aggregates_update" ON benchmark_aggregates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "benchmark_aggregates_delete" ON benchmark_aggregates;
CREATE POLICY "benchmark_aggregates_delete" ON benchmark_aggregates
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 5. COMENTARIOS
COMMENT ON TABLE benchmark_aggregates IS 'Dados anonimizados de benchmark por segmento. Minimo 5 empresas por agregado para garantir privacidade.';
COMMENT ON COLUMN benchmark_aggregates.sample_count IS 'Numero de empresas no agregado. Minimo 5 para evitar reconstrucao de dados individuais.';
COMMENT ON COLUMN benchmark_aggregates.revenue_range IS 'Faixa de receita: micro, small, medium, large, enterprise';
COMMENT ON COLUMN benchmark_aggregates.source IS 'Origem dos dados: internal (plataforma), external (pesquisa), mixed';
COMMENT ON COLUMN benchmark_aggregates.reference_period IS 'Periodo de referencia (ex: 2026-Q1, 2026-01)';
