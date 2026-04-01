-- ═══════════════════════════════════════════════════════════════
-- CORRIGIR FUNÇÃO RLS - BUG: column "email" does not exist
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Remover função antiga (com erro)
DROP FUNCTION IF EXISTS can_access_transaction_with_tags(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Criar função corrigida
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
  user_exists BOOLEAN;
  has_permissions BOOLEAN;
BEGIN
  -- DEBUG: Log entrada
  RAISE NOTICE 'RLS CHECK: user_email=%, marca=%, filial=%, tag01=%',
    user_email, transaction_marca, transaction_filial, transaction_tag01;

  -- 1. Verificar se email foi fornecido
  IF user_email IS NULL OR user_email = '' THEN
    RAISE NOTICE 'RLS: Email nulo ou vazio - BLOQUEADO';
    RETURN FALSE;
  END IF;

  -- 2. Verificar se usuário existe
  SELECT EXISTS(SELECT 1 FROM users WHERE email = user_email) INTO user_exists;

  IF NOT user_exists THEN
    RAISE NOTICE 'RLS: Usuario % nao existe - BLOQUEADO', user_email;
    RETURN FALSE;
  END IF;

  -- 3. Buscar role do usuário
  SELECT role INTO user_role
  FROM users
  WHERE email = user_email;

  RAISE NOTICE 'RLS: Usuario % tem role=%', user_email, user_role;

  -- 4. Se é admin = libera tudo
  IF user_role = 'admin' THEN
    RAISE NOTICE 'RLS: Admin - LIBERADO';
    RETURN TRUE;
  END IF;

  -- 5. Verificar se tem permissões configuradas
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
  ) INTO has_permissions;

  RAISE NOTICE 'RLS: has_permissions=%', has_permissions;

  -- 6. Se não tem permissões configuradas
  IF NOT has_permissions THEN
    -- Manager sem permissões = vê tudo
    IF user_role = 'manager' THEN
      RAISE NOTICE 'RLS: Manager sem permissoes - LIBERADO';
      RETURN TRUE;
    END IF;

    -- Viewer sem permissões = bloqueia tudo
    RAISE NOTICE 'RLS: Viewer sem permissoes - BLOQUEADO';
    RETURN FALSE;
  END IF;

  -- 7. Verificar permissões específicas

  -- TAG01
  IF EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
    AND up.permission_type = 'tag01'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
      AND up.permission_type = 'tag01'
      AND up.permission_value = transaction_tag01
    ) THEN
      RAISE NOTICE 'RLS: TAG01 nao permitida - BLOQUEADO';
      RETURN FALSE;
    END IF;
  END IF;

  -- TAG02
  IF EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
    AND up.permission_type = 'tag02'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
      AND up.permission_type = 'tag02'
      AND up.permission_value = transaction_tag02
    ) THEN
      RAISE NOTICE 'RLS: TAG02 nao permitida - BLOQUEADO';
      RETURN FALSE;
    END IF;
  END IF;

  -- TAG03
  IF EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
    AND up.permission_type = 'tag03'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
      AND up.permission_type = 'tag03'
      AND up.permission_value = transaction_tag03
    ) THEN
      RAISE NOTICE 'RLS: TAG03 nao permitida - BLOQUEADO';
      RETURN FALSE;
    END IF;
  END IF;

  -- FILIAL
  IF EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
    AND up.permission_type = 'filial'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
      AND up.permission_type = 'filial'
      AND up.permission_value = transaction_filial
    ) THEN
      RAISE NOTICE 'RLS: FILIAL nao permitida - BLOQUEADO';
      RETURN FALSE;
    END IF;
  END IF;

  -- CIA (MARCA)
  IF EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.email = user_email
    AND up.permission_type = 'cia'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = user_email
      AND up.permission_type = 'cia'
      AND up.permission_value = transaction_marca
    ) THEN
      RAISE NOTICE 'RLS: CIA nao permitida - BLOQUEADO';
      RETURN FALSE;
    END IF;
  END IF;

  -- Se passou por todas as verificações
  RAISE NOTICE 'RLS: Todas verificacoes passaram - LIBERADO';
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Dar permissões
GRANT EXECUTE ON FUNCTION can_access_transaction_with_tags TO postgres, anon, authenticated, service_role;

-- 4. Testar a função
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'TESTANDO FUNÇÃO RLS';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Teste 1: Admin
  RAISE NOTICE 'Teste 1: edmilson.serafim@raizeducacao.com.br (admin)';
  IF can_access_transaction_with_tags(
    'edmilson.serafim@raizeducacao.com.br',
    'RAIZ',
    'SP01',
    'Mensalidades',
    NULL,
    NULL
  ) THEN
    RAISE NOTICE '  Resultado: LIBERADO (esperado)';
  ELSE
    RAISE NOTICE '  Resultado: BLOQUEADO (ERRO!)';
  END IF;

  RAISE NOTICE '';

  -- Teste 2: Viewer com permissões
  RAISE NOTICE 'Teste 2: gabriel.araujo@raizeducacao.com.br (viewer)';
  IF can_access_transaction_with_tags(
    'gabriel.araujo@raizeducacao.com.br',
    'RAIZ',
    'SP01',
    'Mensalidades',
    NULL,
    NULL
  ) THEN
    RAISE NOTICE '  Resultado: LIBERADO ou BLOQUEADO (depende das permissoes)';
  ELSE
    RAISE NOTICE '  Resultado: BLOQUEADO';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 5. Verificar se está funcionando
SELECT
  '✅ FUNCAO CORRIGIDA!' as status,
  'Execute uma query agora para testar' as proximos_passos;
