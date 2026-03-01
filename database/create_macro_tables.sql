-- ============================================
-- Macro Intelligence Layer — Data Structure
-- Tabelas para indicadores macroeconômicos e premissas
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. TABELA: macro_indicators
-- Armazena indicadores macroeconômicos históricos e projetados
CREATE TABLE IF NOT EXISTS macro_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tipo do indicador
  indicator_type TEXT NOT NULL CHECK (indicator_type IN (
    'inflation',       -- IPCA / inflação acumulada (%)
    'interest_rate',   -- SELIC / taxa de juros (%)
    'gdp',             -- PIB crescimento (%)
    'unemployment',    -- Taxa de desemprego (%)
    'sector_growth'    -- Crescimento do setor educacional (%)
  )),

  -- Valor do indicador
  value NUMERIC NOT NULL,

  -- Período de referência (YYYY-MM ou YYYY-QN ou YYYY)
  period TEXT NOT NULL,

  -- Fonte do dado
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual',     -- Inserido manualmente pelo admin
    'bcb',        -- Banco Central do Brasil
    'ibge',       -- IBGE
    'ipea',       -- IPEA
    'market',     -- Consenso de mercado (Focus)
    'internal'    -- Estimativa interna
  )),

  -- Se é dado realizado ou projeção
  is_projection BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidade: um valor por tipo + período + fonte
  UNIQUE(indicator_type, period, source)
);

-- 2. TABELA: macro_assumptions
-- Premissas de sensibilidade da organização ao ambiente macro
CREATE TABLE IF NOT EXISTS macro_assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificador da organização (preparado para multi-tenant)
  organization_id TEXT NOT NULL DEFAULT 'raiz',

  -- Sensibilidade à inflação: quanto 1pp de inflação afeta custos (%)
  -- Ex: 0.7 = 70% do impacto é repassado aos custos
  inflation_sensitivity NUMERIC NOT NULL DEFAULT 0.7
    CHECK (inflation_sensitivity >= 0 AND inflation_sensitivity <= 2),

  -- Elasticidade receita-PIB: quanto 1pp de PIB afeta receita (%)
  -- Ex: 0.5 = receita cresce 0.5pp para cada 1pp de PIB
  revenue_elasticity NUMERIC NOT NULL DEFAULT 0.5
    CHECK (revenue_elasticity >= 0 AND revenue_elasticity <= 3),

  -- Elasticidade custo-inflação: quanto inflação afeta custos variáveis
  cost_elasticity NUMERIC NOT NULL DEFAULT 0.8
    CHECK (cost_elasticity >= 0 AND cost_elasticity <= 3),

  -- Sensibilidade a juros: impacto de 1pp de juros no custo financeiro (%)
  interest_sensitivity NUMERIC NOT NULL DEFAULT 0.3
    CHECK (interest_sensitivity >= 0 AND interest_sensitivity <= 2),

  -- Elasticidade desemprego-inadimplência: quanto desemprego afeta inadimplência
  unemployment_sensitivity NUMERIC NOT NULL DEFAULT 0.4
    CHECK (unemployment_sensitivity >= 0 AND unemployment_sensitivity <= 2),

  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,

  -- Uma premissa por organização
  UNIQUE(organization_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_macro_indicators_type ON macro_indicators(indicator_type);
CREATE INDEX IF NOT EXISTS idx_macro_indicators_period ON macro_indicators(period);
CREATE INDEX IF NOT EXISTS idx_macro_indicators_type_period ON macro_indicators(indicator_type, period DESC);
CREATE INDEX IF NOT EXISTS idx_macro_assumptions_org ON macro_assumptions(organization_id);

-- 4. TRIGGERS updated_at
CREATE OR REPLACE FUNCTION update_macro_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_macro_indicators_updated_at ON macro_indicators;
CREATE TRIGGER trg_macro_indicators_updated_at
  BEFORE UPDATE ON macro_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_macro_indicators_updated_at();

CREATE OR REPLACE FUNCTION update_macro_assumptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_macro_assumptions_updated_at ON macro_assumptions;
CREATE TRIGGER trg_macro_assumptions_updated_at
  BEFORE UPDATE ON macro_assumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_macro_assumptions_updated_at();

-- 5. ROW LEVEL SECURITY
ALTER TABLE macro_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_assumptions ENABLE ROW LEVEL SECURITY;

-- macro_indicators: leitura para todos autenticados, escrita para admin
DROP POLICY IF EXISTS "macro_indicators_select" ON macro_indicators;
CREATE POLICY "macro_indicators_select" ON macro_indicators
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "macro_indicators_insert" ON macro_indicators;
CREATE POLICY "macro_indicators_insert" ON macro_indicators
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "macro_indicators_update" ON macro_indicators;
CREATE POLICY "macro_indicators_update" ON macro_indicators
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "macro_indicators_delete" ON macro_indicators;
CREATE POLICY "macro_indicators_delete" ON macro_indicators
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- macro_assumptions: leitura para autenticados, escrita para admin
DROP POLICY IF EXISTS "macro_assumptions_select" ON macro_assumptions;
CREATE POLICY "macro_assumptions_select" ON macro_assumptions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "macro_assumptions_insert" ON macro_assumptions;
CREATE POLICY "macro_assumptions_insert" ON macro_assumptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "macro_assumptions_update" ON macro_assumptions;
CREATE POLICY "macro_assumptions_update" ON macro_assumptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "macro_assumptions_delete" ON macro_assumptions;
CREATE POLICY "macro_assumptions_delete" ON macro_assumptions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 6. SEED: premissas default para Raiz
INSERT INTO macro_assumptions (organization_id, inflation_sensitivity, revenue_elasticity, cost_elasticity, interest_sensitivity, unemployment_sensitivity)
VALUES ('raiz', 0.7, 0.5, 0.8, 0.3, 0.4)
ON CONFLICT (organization_id) DO NOTHING;

-- 7. COMENTÁRIOS
COMMENT ON TABLE macro_indicators IS 'Indicadores macroeconômicos históricos e projetados (inflação, juros, PIB, desemprego, setor)';
COMMENT ON TABLE macro_assumptions IS 'Premissas de sensibilidade da organização ao ambiente macroeconômico';
COMMENT ON COLUMN macro_assumptions.inflation_sensitivity IS 'Quanto 1pp de inflação afeta custos (0-2). Ex: 0.7 = 70% repassado';
COMMENT ON COLUMN macro_assumptions.revenue_elasticity IS 'Quanto 1pp de PIB afeta receita (0-3). Ex: 0.5 = receita cresce 0.5pp por 1pp PIB';
COMMENT ON COLUMN macro_assumptions.cost_elasticity IS 'Quanto inflação afeta custos variáveis (0-3). Ex: 0.8 = 80% repassado';
