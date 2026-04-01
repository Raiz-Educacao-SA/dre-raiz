-- ═══════════════════════════════════════════════════════════════
-- CRIAR USUÁRIO ADMIN SEM RESTRIÇÕES
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ⚠️ IMPORTANTE: Substitua o email abaixo pelo seu email!
DO $$
DECLARE
  admin_email TEXT := 'seu-email@exemplo.com';  -- ← ALTERE AQUI!
  admin_name TEXT := 'Admin';  -- ← ALTERE AQUI!
  user_id UUID;
BEGIN
  -- Verificar se já existe
  SELECT id INTO user_id FROM users WHERE email = admin_email;

  IF user_id IS NULL THEN
    -- Criar novo usuário admin
    INSERT INTO users (email, name, role)
    VALUES (admin_email, admin_name, 'admin')
    RETURNING id INTO user_id;

    RAISE NOTICE '✅ Usuário ADMIN criado: % (ID: %)', admin_email, user_id;
  ELSE
    -- Atualizar para admin se já existe
    UPDATE users
    SET role = 'admin', name = admin_name
    WHERE id = user_id;

    RAISE NOTICE '✅ Usuário % promovido para ADMIN', admin_email;
  END IF;

  -- Admin não precisa de permissões específicas
  -- (tem acesso a tudo por padrão via RLS)
  DELETE FROM user_permissions WHERE user_id = user_id;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🎉 PRONTO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuário: %', admin_email;
  RAISE NOTICE 'Role: ADMIN (acesso total)';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 PRÓXIMO PASSO:';
  RAISE NOTICE 'Faça LOGIN no app com este email via Firebase Auth';
  RAISE NOTICE '(Google Sign-in ou Email/Senha)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE 'O email cadastrado aqui DEVE ser o mesmo usado no Firebase!';
  RAISE NOTICE '';
END $$;

-- Verificar resultado
SELECT
  '✅ USUÁRIOS ADMIN' as status,
  email,
  name,
  role,
  created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;
