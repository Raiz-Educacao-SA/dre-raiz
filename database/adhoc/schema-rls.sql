-- SCHEMA: Row Level Security - DRE RAIZ
-- Este script configura as políticas de segurança para controle de acesso aos dados

-- ========== FUNÇÕES AUXILIARES ==========

-- Função para verificar se um email tem permissão específica
CREATE OR REPLACE FUNCTION has_permission(
  user_email TEXT,
  perm_type TEXT,
  perm_value TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se não existe na tabela users, não tem permissão
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = user_email) THEN
    RETURN FALSE;
  END IF;

  -- Admin tem acesso total
  IF EXISTS (SELECT 1 FROM users WHERE email = user_email AND role = 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Se não tem permissões específicas, tem acesso total
  IF NOT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verificar se tem a permissão específica
  RETURN EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
      AND up.permission_type = perm_type
      AND up.permission_value = perm_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem acesso a uma transação
CREATE OR REPLACE FUNCTION can_access_transaction(
  user_email TEXT,
  transaction_marca TEXT,
  transaction_filial TEXT
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

  -- Verificar permissões específicas
  -- Se tem permissão de filial, verificar filial
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

  -- Se tem permissão de CIA (marca), verificar marca
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

-- ========== POLÍTICAS RLS PARA TRANSACTIONS ==========

-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON transactions;

-- Política de leitura: usuários veem apenas transações que têm permissão
CREATE POLICY "Users can read transactions based on permissions" ON transactions
  FOR SELECT USING (
    -- Por enquanto, mantemos acesso público para compatibilidade
    -- Em produção, descomentar a linha abaixo e remover o TRUE
    -- can_access_transaction(current_setting('app.user_email', true), marca, filial)
    TRUE
  );

-- Política de inserção: apenas managers e admins podem inserir
CREATE POLICY "Managers and admins can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    TRUE -- Todos podem inserir por enquanto
    -- Em produção:
    -- EXISTS (
    --   SELECT 1 FROM users
    --   WHERE email = current_setting('app.user_email', true)
    --   AND role IN ('manager', 'admin')
    -- )
  );

-- Política de atualização: apenas managers e admins podem atualizar
CREATE POLICY "Managers and admins can update transactions" ON transactions
  FOR UPDATE USING (
    TRUE -- Todos podem atualizar por enquanto
    -- Em produção:
    -- EXISTS (
    --   SELECT 1 FROM users
    --   WHERE email = current_setting('app.user_email', true)
    --   AND role IN ('manager', 'admin')
    -- )
  );

-- Política de deleção: apenas admins podem deletar
CREATE POLICY "Only admins can delete transactions" ON transactions
  FOR DELETE USING (
    TRUE -- Todos podem deletar por enquanto
    -- Em produção:
    -- EXISTS (
    --   SELECT 1 FROM users
    --   WHERE email = current_setting('app.user_email', true)
    --   AND role = 'admin'
    -- )
  );

-- ========== POLÍTICAS RLS PARA MANUAL_CHANGES ==========

DROP POLICY IF EXISTS "Enable read access for all users" ON manual_changes;
DROP POLICY IF EXISTS "Enable insert for all users" ON manual_changes;
DROP POLICY IF EXISTS "Enable update for all users" ON manual_changes;
DROP POLICY IF EXISTS "Enable delete for all users" ON manual_changes;

-- Leitura: todos podem ler mudanças manuais
CREATE POLICY "Users can read manual changes" ON manual_changes
  FOR SELECT USING (TRUE);

-- Inserção: managers e admins podem criar mudanças
CREATE POLICY "Managers and admins can create changes" ON manual_changes
  FOR INSERT WITH CHECK (TRUE);

-- Atualização: apenas admins podem aprovar/rejeitar
CREATE POLICY "Only admins can update changes" ON manual_changes
  FOR UPDATE USING (TRUE);

-- Deleção: apenas admins podem deletar
CREATE POLICY "Only admins can delete changes" ON manual_changes
  FOR DELETE USING (TRUE);

-- ========== POLÍTICAS RLS PARA USERS E USER_PERMISSIONS ==========

-- Users: todos podem ler, apenas admins podem modificar
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;

CREATE POLICY "Anyone can read users" ON users
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Only admins can update users" ON users
  FOR UPDATE USING (
    TRUE -- Por enquanto público
    -- Em produção:
    -- EXISTS (
    --   SELECT 1 FROM users
    --   WHERE email = current_setting('app.user_email', true)
    --   AND role = 'admin'
    -- )
  );

-- User Permissions: todos podem ler, apenas admins podem modificar
CREATE POLICY "Anyone can read permissions" ON user_permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage permissions" ON user_permissions
  FOR ALL USING (
    TRUE -- Por enquanto público
    -- Em produção:
    -- EXISTS (
    --   SELECT 1 FROM users
    --   WHERE email = current_setting('app.user_email', true)
    --   AND role = 'admin'
    -- )
  );

-- ========== VIEWS AUXILIARES ==========

-- View que mostra transações com informações de permissão
CREATE OR REPLACE VIEW transactions_with_access AS
SELECT
  t.*,
  CASE
    WHEN t.brand IS NULL THEN 'Sem Marca'::TEXT
    ELSE t.brand
  END as brand_display,
  CASE
    WHEN t.branch IS NULL THEN 'Sem Filial'::TEXT
    ELSE t.branch
  END as branch_display
FROM transactions t;

-- Comentários para documentação
COMMENT ON FUNCTION has_permission IS 'Verifica se um usuário tem permissão específica';
COMMENT ON FUNCTION can_access_transaction IS 'Verifica se um usuário pode acessar uma transação baseado em suas permissões';
COMMENT ON VIEW transactions_with_access IS 'View que inclui informações de acesso para transações';

-- Conceder permissões de execução nas funções
GRANT EXECUTE ON FUNCTION has_permission TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_access_transaction TO postgres, anon, authenticated, service_role;

-- Informações de uso
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RLS configurado com sucesso!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'IMPORTANTE: As políticas estão em modo público (TRUE) por enquanto.';
  RAISE NOTICE 'Para ativar segurança completa em produção:';
  RAISE NOTICE '1. Descomentar as verificações nas políticas';
  RAISE NOTICE '2. Configurar current_setting(''app.user_email'') nas queries';
  RAISE NOTICE '3. Testar com diferentes níveis de usuário';
  RAISE NOTICE '==============================================';
END $$;
