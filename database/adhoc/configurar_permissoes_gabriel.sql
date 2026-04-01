-- ═══════════════════════════════════════════════════════════════
-- CONFIGURAR PERMISSÕES DO GABRIEL - TAG01
-- ═══════════════════════════════════════════════════════════════

-- PASSO 1: Verificar se o usuário Gabriel existe
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  gabriel_id UUID;
  gabriel_email TEXT := 'gabriel@raizeducacao.com.br'; -- AJUSTE O EMAIL CORRETO
  gabriel_name TEXT := 'Gabriel';
BEGIN
  -- Buscar o ID do Gabriel
  SELECT id INTO gabriel_id FROM users WHERE email = gabriel_email;

  IF gabriel_id IS NULL THEN
    RAISE NOTICE 'ATENÇÃO: Usuário Gabriel não encontrado com email: %', gabriel_email;
    RAISE NOTICE 'Criando usuário Gabriel...';

    -- Criar usuário Gabriel se não existir
    INSERT INTO users (email, name, role)
    VALUES (gabriel_email, gabriel_name, 'viewer')
    RETURNING id INTO gabriel_id;

    RAISE NOTICE 'Usuário Gabriel criado com ID: %', gabriel_id;
  ELSE
    RAISE NOTICE 'Usuário Gabriel encontrado com ID: %', gabriel_id;
  END IF;

  -- PASSO 2: Limpar permissões antigas do Gabriel (opcional)
  -- Descomente as linhas abaixo se quiser resetar as permissões
  -- DELETE FROM user_permissions WHERE user_id = gabriel_id;
  -- RAISE NOTICE 'Permissões antigas do Gabriel removidas';

  -- PASSO 3: Adicionar permissões de TAG01 para o Gabriel
  -- Exemplo: Gabriel só pode ver tag01 = 'VALOR1' e tag01 = 'VALOR2'

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'CONFIGURANDO PERMISSÕES DE TAG01 PARA GABRIEL';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  -- IMPORTANTE: Ajuste os valores abaixo conforme as tags do seu sistema
  -- Exemplo 1: Permitir tag01 = '001'
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (gabriel_id, 'tag01', '001')
  ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;

  RAISE NOTICE 'Permissão adicionada: tag01 = 001';

  -- Exemplo 2: Permitir tag01 = '002'
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (gabriel_id, 'tag01', '002')
  ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;

  RAISE NOTICE 'Permissão adicionada: tag01 = 002';

  -- ADICIONE MAIS PERMISSÕES CONFORME NECESSÁRIO
  -- INSERT INTO user_permissions (user_id, permission_type, permission_value)
  -- VALUES (gabriel_id, 'tag01', '003')
  -- ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'PERMISSÕES CONFIGURADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- PASSO 4: Verificar as permissões configuradas
-- ═══════════════════════════════════════════════════════════════

SELECT
  u.name,
  u.email,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email ILIKE '%gabriel%'
ORDER BY up.permission_type, up.permission_value;

-- PASSO 5: Listar valores disponíveis de tag01 no sistema
-- ═══════════════════════════════════════════════════════════════

SELECT
  'Valores de TAG01 disponíveis no sistema:' as info,
  tag01,
  COUNT(*) as total_transacoes
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY tag01;

-- INSTRUÇÕES DE USO
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'INSTRUÇÕES PARA AJUSTAR AS PERMISSÕES:';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '1. Verifique o email correto do Gabriel na linha 8 deste script';
  RAISE NOTICE '2. Veja os valores de tag01 disponíveis na query acima';
  RAISE NOTICE '3. Ajuste as linhas 42 e 48 com os valores corretos de tag01';
  RAISE NOTICE '4. Execute este script novamente';
  RAISE NOTICE '5. Execute diagnostico_rls_gabriel.sql para validar';
  RAISE NOTICE '';
  RAISE NOTICE 'PARA ADICIONAR MAIS PERMISSÕES:';
  RAISE NOTICE '- Descomente e ajuste as linhas 52-54';
  RAISE NOTICE '- Adicione quantas permissões forem necessárias';
  RAISE NOTICE '';
  RAISE NOTICE 'PARA REMOVER PERMISSÕES:';
  RAISE NOTICE 'DELETE FROM user_permissions';
  RAISE NOTICE 'WHERE user_id = (SELECT id FROM users WHERE email = ''gabriel@raizeducacao.com.br'')';
  RAISE NOTICE '  AND permission_type = ''tag01''';
  RAISE NOTICE '  AND permission_value = ''001'';';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
