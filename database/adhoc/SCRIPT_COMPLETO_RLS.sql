-- ═══════════════════════════════════════════════════════════════
-- SCRIPT COMPLETO: RLS + TAG01 + PERMISSÕES
-- Execute TUDO de uma vez no SQL Editor do Supabase!
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: ADICIONAR SUPORTE A TAG01/TAG02/TAG03
-- ═══════════════════════════════════════════════════════════════

-- Remover constraint antiga
ALTER TABLE user_permissions
DROP CONSTRAINT IF EXISTS user_permissions_permission_type_check;

-- Adicionar nova constraint com tag01, tag02, tag03
ALTER TABLE user_permissions
ADD CONSTRAINT user_permissions_permission_type_check
CHECK (permission_type IN ('centro_custo', 'cia', 'filial', 'tag01', 'tag02', 'tag03'));

-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: CRIAR FUNÇÃO DE VERIFICAÇÃO DE ACESSO
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION can_access_transaction_with_tags(
  user_email TEXT,
  transaction_marca TEXT,
  transaction_filial TEXT,
  transaction_tag01 TEXT,
  transaction_tag02 TEXT,
  transaction_tag03 TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_permissions BOOLEAN;
BEGIN
  SELECT role INTO user_role FROM users WHERE email = user_email;
  IF user_role IS NULL THEN RETURN FALSE; END IF;
  IF user_role = 'admin' THEN RETURN TRUE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
  ) INTO has_permissions;

  IF NOT has_permissions THEN RETURN TRUE; END IF;

  -- Verificar TAG01
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag01') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag01' AND up.permission_value = transaction_tag01) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar TAG02
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag02') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag02' AND up.permission_value = transaction_tag02) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar TAG03
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag03') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'tag03' AND up.permission_value = transaction_tag03) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar FILIAL
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'filial') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'filial' AND up.permission_value = transaction_filial) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar CIA
  IF EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'cia') THEN
    IF NOT EXISTS (SELECT 1 FROM user_permissions up JOIN users u ON u.id = up.user_id WHERE u.email = user_email AND up.permission_type = 'cia' AND up.permission_value = transaction_marca) THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_access_transaction_with_tags TO postgres, anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════
-- PARTE 3: RECRIAR POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON transactions;
DROP POLICY IF EXISTS "Users can read transactions based on permissions" ON transactions;
DROP POLICY IF EXISTS "Managers and admins can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Managers and admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RLS: Users read with permissions filter" ON transactions
  FOR SELECT USING (
    can_access_transaction_with_tags(
      current_setting('request.jwt.claims', true)::json->>'email',
      marca,
      filial,
      tag01,
      tag02,
      tag03
    )
  );

CREATE POLICY "RLS: Managers and admins insert" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "RLS: Managers and admins update" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "RLS: Only admins delete" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- PARTE 4: VERIFICAR GABRIEL E SEUS DADOS
-- ═══════════════════════════════════════════════════════════════

-- Ver usuário Gabriel
SELECT
  'USUÁRIO GABRIEL:' as info,
  id,
  email,
  name,
  role
FROM users
WHERE email ILIKE '%gabriel%' OR name ILIKE '%gabriel%';

-- Ver permissões atuais do Gabriel
SELECT
  'PERMISSÕES ATUAIS DO GABRIEL:' as info,
  u.name,
  u.email,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email ILIKE '%gabriel%' OR u.name ILIKE '%gabriel%';

-- Ver valores de TAG01 disponíveis
SELECT
  'VALORES DE TAG01 DISPONÍVEIS:' as info,
  tag01,
  COUNT(*) as total
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY total DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS CONFIGURADO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMO PASSO:';
  RAISE NOTICE 'Veja os resultados acima e configure as permissões do Gabriel';
  RAISE NOTICE 'com base nos valores de TAG01 que ele deve ver.';
  RAISE NOTICE '';
  RAISE NOTICE 'DEPOIS: Me avise qual email do Gabriel e quais tags ele';
  RAISE NOTICE 'deve ver, e eu crio o script para adicionar as permissões!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
