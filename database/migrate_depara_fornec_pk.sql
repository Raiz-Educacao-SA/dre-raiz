-- ============================================
-- Migração: depara_fornec — fornecedor_de como PRIMARY KEY
-- Remover coluna id, promover fornecedor_de a PK
-- ============================================

-- 1. Dropar policies (dependem da tabela)
DROP POLICY IF EXISTS "depara_fornec_select" ON depara_fornec;
DROP POLICY IF EXISTS "depara_fornec_insert_admin" ON depara_fornec;
DROP POLICY IF EXISTS "depara_fornec_update_admin" ON depara_fornec;
DROP POLICY IF EXISTS "depara_fornec_delete_admin" ON depara_fornec;

-- 2. Dropar trigger
DROP TRIGGER IF EXISTS trg_depara_fornec_updated_at ON depara_fornec;

-- 3. Recriar tabela (sem dados — ainda não tem carga)
DROP TABLE IF EXISTS depara_fornec;

CREATE TABLE depara_fornec (
  fornecedor_de TEXT PRIMARY KEY,
  fornecedor_para TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE depara_fornec IS 'De-Para para normalização de nomes de fornecedores em transactions';
COMMENT ON COLUMN depara_fornec.fornecedor_de IS 'Nome original do fornecedor (PK — não pode duplicar)';
COMMENT ON COLUMN depara_fornec.fornecedor_para IS 'Nome normalizado do fornecedor';

-- 4. RLS
ALTER TABLE depara_fornec ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depara_fornec_select" ON depara_fornec
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "depara_fornec_insert_admin" ON depara_fornec
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "depara_fornec_update_admin" ON depara_fornec
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "depara_fornec_delete_admin" ON depara_fornec
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- 5. Trigger updated_at
CREATE TRIGGER trg_depara_fornec_updated_at
  BEFORE UPDATE ON depara_fornec
  FOR EACH ROW
  EXECUTE FUNCTION update_depara_fornec_updated_at();
