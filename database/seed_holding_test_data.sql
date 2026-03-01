-- ============================================
-- SEED: Dados de Teste — Multi-Company Intelligence
-- Execute APÓS create_holding_tables.sql
-- Cria 3 empresas com snapshots financeiros para testar o dashboard
-- ============================================

-- 1. Garantir que o holding Raiz Educação existe
INSERT INTO holdings (name, description, industry_segment)
VALUES ('Raiz Educação', 'Grupo Raiz Educação S.A.', 'educacao')
ON CONFLICT (name) DO NOTHING;

-- 2. Adicionar 3 empresas ao portfólio
-- Empresa 1: Raiz (já pode existir do seed anterior)
INSERT INTO holding_companies (holding_id, organization_id, display_name, portfolio_weight)
SELECT h.id, 'raiz', 'Raiz Educação S.A.', 3.0
FROM holdings h WHERE h.name = 'Raiz Educação'
ON CONFLICT (organization_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  portfolio_weight = EXCLUDED.portfolio_weight;

-- Empresa 2: Colégio São Paulo
INSERT INTO holding_companies (holding_id, organization_id, display_name, portfolio_weight)
SELECT h.id, 'colegio-sp', 'Colégio São Paulo', 2.0
FROM holdings h WHERE h.name = 'Raiz Educação'
ON CONFLICT (organization_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  portfolio_weight = EXCLUDED.portfolio_weight;

-- Empresa 3: Instituto Educar
INSERT INTO holding_companies (holding_id, organization_id, display_name, portfolio_weight)
SELECT h.id, 'instituto-educar', 'Instituto Educar', 1.0
FROM holdings h WHERE h.name = 'Raiz Educação'
ON CONFLICT (organization_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  portfolio_weight = EXCLUDED.portfolio_weight;

-- 3. Snapshots financeiros (período 2026-01 a 2026-02)

-- Raiz Educação — empresa forte, boa margem, crescimento
INSERT INTO company_financial_snapshots
  (organization_id, period, receita_real, receita_orcado, custos_variaveis_real, custos_fixos_real, sga_real, rateio_real, ebitda, margem_contribuicao_pct, health_score, growth_yoy, headcount)
VALUES
  ('raiz', '2026-02', 5200000, 5000000, -1560000, -1040000, -520000, -260000, 1820000, 70.0, 82, 8.5, 450),
  ('raiz', '2026-01', 4800000, 5000000, -1440000, -1020000, -510000, -255000, 1575000, 70.0, 78, 7.2, 445)
ON CONFLICT (organization_id, period) DO UPDATE SET
  receita_real = EXCLUDED.receita_real,
  receita_orcado = EXCLUDED.receita_orcado,
  custos_variaveis_real = EXCLUDED.custos_variaveis_real,
  custos_fixos_real = EXCLUDED.custos_fixos_real,
  sga_real = EXCLUDED.sga_real,
  rateio_real = EXCLUDED.rateio_real,
  ebitda = EXCLUDED.ebitda,
  margem_contribuicao_pct = EXCLUDED.margem_contribuicao_pct,
  health_score = EXCLUDED.health_score,
  growth_yoy = EXCLUDED.growth_yoy,
  headcount = EXCLUDED.headcount;

-- Colégio São Paulo — empresa moderada, margem ok, crescimento estagnado
INSERT INTO company_financial_snapshots
  (organization_id, period, receita_real, receita_orcado, custos_variaveis_real, custos_fixos_real, sga_real, rateio_real, ebitda, margem_contribuicao_pct, health_score, growth_yoy, headcount)
VALUES
  ('colegio-sp', '2026-02', 2800000, 3000000, -980000, -700000, -336000, -140000, 644000, 65.0, 64, 1.2, 220),
  ('colegio-sp', '2026-01', 2650000, 3000000, -927500, -690000, -330000, -138000, 564500, 65.0, 61, 0.8, 218)
ON CONFLICT (organization_id, period) DO UPDATE SET
  receita_real = EXCLUDED.receita_real,
  receita_orcado = EXCLUDED.receita_orcado,
  custos_variaveis_real = EXCLUDED.custos_variaveis_real,
  custos_fixos_real = EXCLUDED.custos_fixos_real,
  sga_real = EXCLUDED.sga_real,
  rateio_real = EXCLUDED.rateio_real,
  ebitda = EXCLUDED.ebitda,
  margem_contribuicao_pct = EXCLUDED.margem_contribuicao_pct,
  health_score = EXCLUDED.health_score,
  growth_yoy = EXCLUDED.growth_yoy,
  headcount = EXCLUDED.headcount;

-- Instituto Educar — empresa fraca, margem baixa, crescimento negativo
INSERT INTO company_financial_snapshots
  (organization_id, period, receita_real, receita_orcado, custos_variaveis_real, custos_fixos_real, sga_real, rateio_real, ebitda, margem_contribuicao_pct, health_score, growth_yoy, headcount)
VALUES
  ('instituto-educar', '2026-02', 950000, 1200000, -380000, -330000, -190000, -85000, -35000, 60.0, 38, -4.5, 85),
  ('instituto-educar', '2026-01', 920000, 1200000, -368000, -325000, -188000, -82000, -43000, 60.0, 35, -5.2, 88)
ON CONFLICT (organization_id, period) DO UPDATE SET
  receita_real = EXCLUDED.receita_real,
  receita_orcado = EXCLUDED.receita_orcado,
  custos_variaveis_real = EXCLUDED.custos_variaveis_real,
  custos_fixos_real = EXCLUDED.custos_fixos_real,
  sga_real = EXCLUDED.sga_real,
  rateio_real = EXCLUDED.rateio_real,
  ebitda = EXCLUDED.ebitda,
  margem_contribuicao_pct = EXCLUDED.margem_contribuicao_pct,
  health_score = EXCLUDED.health_score,
  growth_yoy = EXCLUDED.growth_yoy,
  headcount = EXCLUDED.headcount;

-- 4. Associar usuário admin ao holding
-- IMPORTANTE: substitua 'seu-email@raiz.edu.br' pelo email real do admin
-- Este INSERT usa ON CONFLICT para ser idempotente
INSERT INTO user_holdings (user_email, holding_id, holding_role)
SELECT 'edmilson.serafim@raizeducacao.com.br', h.id, 'admin'
FROM holdings h WHERE h.name = 'Raiz Educação'
ON CONFLICT (user_email, holding_id) DO UPDATE SET holding_role = 'admin';

-- Verificação
SELECT 'Holdings:' AS info, count(*) AS total FROM holdings
UNION ALL
SELECT 'Empresas:', count(*) FROM holding_companies
UNION ALL
SELECT 'Snapshots:', count(*) FROM company_financial_snapshots
UNION ALL
SELECT 'User Holdings:', count(*) FROM user_holdings;
