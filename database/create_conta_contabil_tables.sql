-- =============================================
-- De-Para Conta Contábil
-- Mapeamento de conta_de → conta_para para
-- normalização automática em transactions
-- =============================================
CREATE TABLE IF NOT EXISTS depara_conta_contabil (
  conta_de      TEXT PRIMARY KEY,
  descricao_de  TEXT NOT NULL DEFAULT '',
  conta_para    TEXT NOT NULL,
  descricao_para TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE depara_conta_contabil ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_depara_conta_contabil" ON depara_conta_contabil
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Usuários autenticados: somente leitura
CREATE POLICY "authenticated_read_depara_conta_contabil" ON depara_conta_contabil
  FOR SELECT USING (auth.email() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_depara_conta_contabil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_depara_conta_contabil_updated_at ON depara_conta_contabil;
CREATE TRIGGER trg_depara_conta_contabil_updated_at
  BEFORE UPDATE ON depara_conta_contabil
  FOR EACH ROW EXECUTE FUNCTION update_depara_conta_contabil_updated_at();

-- =============================================
-- Contas Inativadas
-- Lista de contas contábeis que devem ser
-- excluídas/ignoradas no processamento da DRE
-- =============================================
CREATE TABLE IF NOT EXISTS contas_inativadas (
  conta      TEXT PRIMARY KEY,
  descricao  TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contas_inativadas ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_full_contas_inativadas" ON contas_inativadas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Usuários autenticados: somente leitura
CREATE POLICY "authenticated_read_contas_inativadas" ON contas_inativadas
  FOR SELECT USING (auth.email() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_contas_inativadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contas_inativadas_updated_at ON contas_inativadas;
CREATE TRIGGER trg_contas_inativadas_updated_at
  BEFORE UPDATE ON contas_inativadas
  FOR EACH ROW EXECUTE FUNCTION update_contas_inativadas_updated_at();
