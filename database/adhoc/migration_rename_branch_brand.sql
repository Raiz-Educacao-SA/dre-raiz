-- Migração: Renomear branch → filial e brand → marca
-- Data: 2026-02-03
-- IMPORTANTE: Executar no Supabase SQL Editor

BEGIN;

-- 1. BACKUP
CREATE TABLE IF NOT EXISTS transactions_backup_pre_migration AS
SELECT * FROM transactions;

-- 2. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- 3. RENOMEAR COLUNAS
ALTER TABLE transactions RENAME COLUMN branch TO filial;
ALTER TABLE transactions RENAME COLUMN brand TO marca;

-- 4. ATUALIZAR ÍNDICES
DROP INDEX IF EXISTS idx_transactions_branch;
DROP INDEX IF EXISTS idx_transactions_brand;
CREATE INDEX idx_transactions_filial ON transactions(filial);
CREATE INDEX idx_transactions_marca ON transactions(marca);

-- 5. ATUALIZAR FUNÇÃO RLS
DROP FUNCTION IF EXISTS can_access_transaction(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION can_access_transaction(
  user_email TEXT,
  transaction_marca TEXT,
  transaction_filial TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions RECORD;
  has_cia_permission BOOLEAN := FALSE;
  has_filial_permission BOOLEAN := FALSE;
  cia_match BOOLEAN := FALSE;
  filial_match BOOLEAN := FALSE;
BEGIN
  -- Admin tem acesso total
  IF EXISTS (
    SELECT 1 FROM user_permissions
    WHERE email = user_email
    AND permission_type = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verificar permissões de CIA
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE email = user_email
    AND permission_type = 'cia'
  ) INTO has_cia_permission;

  IF has_cia_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM user_permissions
      WHERE email = user_email
      AND permission_type = 'cia'
      AND permission_value = transaction_marca
    ) INTO cia_match;

    IF NOT cia_match THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar permissões de FILIAL
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE email = user_email
    AND permission_type = 'filial'
  ) INTO has_filial_permission;

  IF has_filial_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM user_permissions
      WHERE email = user_email
      AND permission_type = 'filial'
      AND permission_value = transaction_filial
    ) INTO filial_match;

    IF NOT filial_match THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RECRIAR POLÍTICAS RLS
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_policy" ON transactions
  FOR SELECT USING (
    can_access_transaction(
      current_setting('request.jwt.claims', true)::json->>'email',
      marca,
      filial
    )
  );

CREATE POLICY "transactions_insert_policy" ON transactions
  FOR INSERT WITH CHECK (
    can_access_transaction(
      current_setting('request.jwt.claims', true)::json->>'email',
      marca,
      filial
    )
  );

CREATE POLICY "transactions_update_policy" ON transactions
  FOR UPDATE USING (
    can_access_transaction(
      current_setting('request.jwt.claims', true)::json->>'email',
      marca,
      filial
    )
  );

CREATE POLICY "transactions_delete_policy" ON transactions
  FOR DELETE USING (
    can_access_transaction(
      current_setting('request.jwt.claims', true)::json->>'email',
      marca,
      filial
    )
  );

-- 7. VERIFICAÇÃO
SELECT
  'Verificação de Colunas' as tipo,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('filial', 'marca')
UNION ALL
SELECT
  'Verificação de Índices' as tipo,
  indexname as column_name,
  'index' as data_type
FROM pg_indexes
WHERE tablename = 'transactions'
  AND (indexname LIKE '%filial%' OR indexname LIKE '%marca%');

-- 8. CONTAGEM DE DADOS
SELECT
  COUNT(*) as total_registros,
  COUNT(filial) as registros_com_filial,
  COUNT(marca) as registros_com_marca
FROM transactions;

COMMIT;

-- Mensagem final
SELECT 'Migração concluída com sucesso!' as status;
