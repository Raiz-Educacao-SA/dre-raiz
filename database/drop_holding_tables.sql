-- ============================================
-- Remover tabelas de Holding (dados de teste)
-- Portfolio agora usa dados reais do DRE (get_soma_tags por marca)
-- ============================================

-- Ordem: tabelas filhas primeiro, depois pais
DROP TABLE IF EXISTS user_holdings CASCADE;
DROP TABLE IF EXISTS company_financial_snapshots CASCADE;
DROP TABLE IF EXISTS holding_companies CASCADE;
DROP TABLE IF EXISTS holdings CASCADE;
