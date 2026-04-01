-- ═══════════════════════════════════════════════════════════════
-- CORREÇÃO: RLS com filtro por TAG01
-- ═══════════════════════════════════════════════════════════════

-- PASSO 1: Adicionar 'tag01' aos tipos de permissão permitidos
-- ═══════════════════════════════════════════════════════════════

-- Remover constraint antiga
ALTER TABLE user_permissions
DROP CONSTRAINT IF EXISTS user_permissions_permission_type_check;

-- Adicionar nova constraint com tag01, tag02, tag03
ALTER TABLE user_permissions
ADD CONSTRAINT user_permissions_permission_type_check
CHECK (permission_type IN ('centro_custo', 'cia', 'filial', 'tag01', 'tag02', 'tag03'));

-- PASSO 2: Criar função para verificar acesso a transações com tag01
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
  -- Buscar role do usuário
  SELECT role INTO user_role FROM users WHERE email = user_email;

  -- Se não existe, não tem acesso
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin tem acesso total
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Verificar se usuário tem permissões específicas
  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
  ) INTO has_permissions;

  -- Se não tem permissões específicas, tem acesso total
  IF NOT has_permissions THEN
    RETURN TRUE;
  END IF;

  -- Verificar permissões específicas de TAG01
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = 'tag01'
  ) THEN
    -- Se tem permissão de tag01, verificar se a transação tem tag01 permitida
    IF NOT EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
        AND up.permission_type = 'tag01'
        AND up.permission_value = transaction_tag01
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar permissões específicas de TAG02
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = 'tag02'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
        AND up.permission_type = 'tag02'
        AND up.permission_value = transaction_tag02
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar permissões específicas de TAG03
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = 'tag03'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
        AND up.permission_type = 'tag03'
        AND up.permission_value = transaction_tag03
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar permissões de FILIAL
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = 'filial'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
        AND up.permission_type = 'filial'
        AND up.permission_value = transaction_filial
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Verificar permissões de CIA (marca)
  IF EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = 'cia'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
        AND up.permission_type = 'cia'
        AND up.permission_value = transaction_marca
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Se passou todas as verificações, tem acesso
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION can_access_transaction_with_tags TO postgres, anon, authenticated, service_role;

-- PASSO 3: Recriar políticas RLS para transactions
-- ═══════════════════════════════════════════════════════════════

-- Remover políticas antigas
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

-- Garantir que RLS está habilitado
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- POLÍTICA DE LEITURA: Filtra com base nas permissões do usuário
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

-- POLÍTICA DE INSERÇÃO: Apenas managers e admins
CREATE POLICY "RLS: Managers and admins insert" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role IN ('manager', 'admin')
    )
  );

-- POLÍTICA DE ATUALIZAÇÃO: Apenas managers e admins
CREATE POLICY "RLS: Managers and admins update" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role IN ('manager', 'admin')
    )
  );

-- POLÍTICA DE DELEÇÃO: Apenas admins
CREATE POLICY "RLS: Only admins delete" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role = 'admin'
    )
  );

-- PASSO 4: Verificação
-- ═══════════════════════════════════════════════════════════════

-- Verificar políticas criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- Verificar constraint de permission_type
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_permissions'::regclass
  AND conname LIKE '%permission_type%';

-- MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'RLS COM TAG01 CONFIGURADO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Execute o script diagnostico_rls_gabriel.sql para verificar as permissões do Gabriel';
  RAISE NOTICE '2. Configure as permissões de tag01 para o Gabriel na tabela user_permissions';
  RAISE NOTICE '3. Teste o acesso do Gabriel para validar o filtro';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- O filtro RLS agora está ATIVO e verifica permissões de tag01, tag02, tag03, filial e cia';
  RAISE NOTICE '- Admins sempre têm acesso total';
  RAISE NOTICE '- Usuários sem permissões específicas têm acesso total';
  RAISE NOTICE '- Usuários com permissões específicas só veem dados permitidos';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
