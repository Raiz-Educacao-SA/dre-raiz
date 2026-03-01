-- ============================================
-- Multi-Company Intelligence Platform — Data Structure
-- Holdings e associações holding↔empresa
-- Isolamento total por organização
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. TABELA: holdings
-- Representa um grupo/holding que agrega múltiplas empresas
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Nome do holding/grupo
  name TEXT NOT NULL,

  -- Descrição opcional
  description TEXT,

  -- Setor principal
  industry_segment TEXT NOT NULL DEFAULT 'educacao',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidade: um holding por nome
  UNIQUE(name)
);

-- 2. TABELA: holding_companies
-- Associação N:N entre holdings e organizações (empresas)
-- Cada empresa pertence a exatamente 1 holding (enforced por UNIQUE)
CREATE TABLE IF NOT EXISTS holding_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referência ao holding
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,

  -- Identificador da organização/empresa
  -- Corresponde ao organization_id usado em macro_assumptions e futuras tabelas
  organization_id TEXT NOT NULL,

  -- Nome de exibição da empresa
  display_name TEXT NOT NULL,

  -- Peso no portfólio (para cálculos de consolidação ponderada)
  -- Default 1.0 = peso igual. Pode ser por receita, por relevância, etc.
  portfolio_weight NUMERIC NOT NULL DEFAULT 1.0
    CHECK (portfolio_weight > 0 AND portfolio_weight <= 100),

  -- Se a empresa está ativa no portfólio
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma empresa por holding (isolamento: empresa não pode estar em 2 holdings)
  UNIQUE(organization_id),
  -- Sem duplicata dentro do mesmo holding
  UNIQUE(holding_id, organization_id)
);

-- 3. TABELA: company_financial_snapshots
-- Snapshot financeiro periódico por empresa (para consolidação no holding)
-- Dados já calculados — engine não precisa acessar dados brutos de cada empresa
CREATE TABLE IF NOT EXISTS company_financial_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Referência à empresa (FK para holding_companies garante integridade)
  organization_id TEXT NOT NULL REFERENCES holding_companies(organization_id) ON DELETE CASCADE,

  -- Período do snapshot (YYYY-MM ou YYYY)
  period TEXT NOT NULL,

  -- Métricas financeiras
  receita_real NUMERIC NOT NULL DEFAULT 0,
  receita_orcado NUMERIC NOT NULL DEFAULT 0,
  custos_variaveis_real NUMERIC NOT NULL DEFAULT 0,
  custos_fixos_real NUMERIC NOT NULL DEFAULT 0,
  sga_real NUMERIC NOT NULL DEFAULT 0,
  rateio_real NUMERIC NOT NULL DEFAULT 0,
  ebitda NUMERIC NOT NULL DEFAULT 0,
  margem_contribuicao_pct NUMERIC NOT NULL DEFAULT 0,

  -- Score e saúde
  health_score NUMERIC NOT NULL DEFAULT 0
    CHECK (health_score >= 0 AND health_score <= 100),

  -- Crescimento YoY (%)
  growth_yoy NUMERIC NOT NULL DEFAULT 0,

  -- Headcount (para métricas de eficiência)
  headcount INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um snapshot por empresa por período
  UNIQUE(organization_id, period)
);

-- 4. TABELA: user_holdings
-- Associação usuário↔holding para isolamento de dados
-- Define qual holding cada usuário pode ver/gerenciar
CREATE TABLE IF NOT EXISTS user_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Email do usuário (referência à tabela users)
  user_email TEXT NOT NULL,

  -- Referência ao holding
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,

  -- Papel no holding
  holding_role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (holding_role IN ('admin', 'manager', 'viewer')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um usuário por holding
  UNIQUE(user_email, holding_id)
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_holdings_name ON holdings(name);
CREATE INDEX IF NOT EXISTS idx_holding_companies_holding ON holding_companies(holding_id);
CREATE INDEX IF NOT EXISTS idx_holding_companies_org ON holding_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_holding_companies_active ON holding_companies(holding_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_snapshots_org ON company_financial_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_snapshots_period ON company_financial_snapshots(organization_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_user_holdings_email ON user_holdings(user_email);
CREATE INDEX IF NOT EXISTS idx_user_holdings_holding ON user_holdings(holding_id);

-- 5. TRIGGERS updated_at
CREATE OR REPLACE FUNCTION update_holdings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_holdings_updated_at ON holdings;
CREATE TRIGGER trg_holdings_updated_at
  BEFORE UPDATE ON holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_holdings_updated_at();

CREATE OR REPLACE FUNCTION update_holding_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_holding_companies_updated_at ON holding_companies;
CREATE TRIGGER trg_holding_companies_updated_at
  BEFORE UPDATE ON holding_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_holding_companies_updated_at();

CREATE OR REPLACE FUNCTION update_company_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_snapshots_updated_at ON company_financial_snapshots;
CREATE TRIGGER trg_company_snapshots_updated_at
  BEFORE UPDATE ON company_financial_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_company_snapshots_updated_at();

-- 7. ROW LEVEL SECURITY
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE holding_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_holdings ENABLE ROW LEVEL SECURITY;

-- holdings: leitura apenas para membros do holding via user_holdings
DROP POLICY IF EXISTS "holdings_select" ON holdings;
CREATE POLICY "holdings_select" ON holdings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holdings.id
        AND uh.user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "holdings_insert" ON holdings;
CREATE POLICY "holdings_insert" ON holdings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "holdings_update" ON holdings;
CREATE POLICY "holdings_update" ON holdings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holdings.id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "holdings_delete" ON holdings;
CREATE POLICY "holdings_delete" ON holdings
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- holding_companies: leitura restrita ao holding do usuário
DROP POLICY IF EXISTS "holding_companies_select" ON holding_companies;
CREATE POLICY "holding_companies_select" ON holding_companies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holding_companies.holding_id
        AND uh.user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "holding_companies_insert" ON holding_companies;
CREATE POLICY "holding_companies_insert" ON holding_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holding_companies.holding_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "holding_companies_update" ON holding_companies;
CREATE POLICY "holding_companies_update" ON holding_companies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holding_companies.holding_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "holding_companies_delete" ON holding_companies;
CREATE POLICY "holding_companies_delete" ON holding_companies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_holdings uh
      WHERE uh.holding_id = holding_companies.holding_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

-- company_financial_snapshots: leitura restrita ao holding do usuário
DROP POLICY IF EXISTS "company_snapshots_select" ON company_financial_snapshots;
CREATE POLICY "company_snapshots_select" ON company_financial_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holding_companies hc
      JOIN user_holdings uh ON uh.holding_id = hc.holding_id
      WHERE hc.organization_id = company_financial_snapshots.organization_id
        AND uh.user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "company_snapshots_insert" ON company_financial_snapshots;
CREATE POLICY "company_snapshots_insert" ON company_financial_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM holding_companies hc
      JOIN user_holdings uh ON uh.holding_id = hc.holding_id
      WHERE hc.organization_id = company_financial_snapshots.organization_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company_snapshots_update" ON company_financial_snapshots;
CREATE POLICY "company_snapshots_update" ON company_financial_snapshots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holding_companies hc
      JOIN user_holdings uh ON uh.holding_id = hc.holding_id
      WHERE hc.organization_id = company_financial_snapshots.organization_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company_snapshots_delete" ON company_financial_snapshots;
CREATE POLICY "company_snapshots_delete" ON company_financial_snapshots
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holding_companies hc
      JOIN user_holdings uh ON uh.holding_id = hc.holding_id
      WHERE hc.organization_id = company_financial_snapshots.organization_id
        AND uh.user_email = auth.email()
        AND uh.holding_role = 'admin'
    )
  );

-- user_holdings: cada usuário só vê seus próprios registros
DROP POLICY IF EXISTS "user_holdings_select" ON user_holdings;
CREATE POLICY "user_holdings_select" ON user_holdings
  FOR SELECT TO authenticated
  USING (user_email = auth.email());

DROP POLICY IF EXISTS "user_holdings_insert" ON user_holdings;
CREATE POLICY "user_holdings_insert" ON user_holdings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "user_holdings_update" ON user_holdings;
CREATE POLICY "user_holdings_update" ON user_holdings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

DROP POLICY IF EXISTS "user_holdings_delete" ON user_holdings;
CREATE POLICY "user_holdings_delete" ON user_holdings
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 7. SEED: holding Raiz Educação
INSERT INTO holdings (name, description, industry_segment)
VALUES ('Raiz Educação', 'Grupo Raiz Educação S.A.', 'educacao')
ON CONFLICT (name) DO NOTHING;

-- Associar empresa principal
INSERT INTO holding_companies (holding_id, organization_id, display_name, portfolio_weight)
SELECT h.id, 'raiz', 'Raiz Educação S.A.', 1.0
FROM holdings h
WHERE h.name = 'Raiz Educação'
ON CONFLICT (organization_id) DO NOTHING;

-- 8. COMENTÁRIOS
COMMENT ON TABLE holdings IS 'Holdings/grupos que agregam múltiplas empresas para consolidação estratégica';
COMMENT ON TABLE holding_companies IS 'Associação entre holdings e empresas do portfólio';
COMMENT ON TABLE company_financial_snapshots IS 'Snapshots financeiros periódicos por empresa para consolidação no holding';
COMMENT ON COLUMN holding_companies.portfolio_weight IS 'Peso da empresa no portfólio (1.0 = igual, proporcional à relevância)';
COMMENT ON COLUMN holding_companies.organization_id IS 'ID da organização — isolamento total, nunca compartilha dados entre organizações';
