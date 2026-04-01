-- ═══════════════════════════════════════════════════════════════
-- CONFIGURAR PERMISSÕES DE TESTE PARA: serafim.edmilson@gmail.com
-- Execute APENAS DEPOIS de verificar com VERIFICAR_PERMISSOES_SERAFIM.sql
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  serafim_id UUID;
BEGIN
  -- Buscar ID do Serafim
  SELECT id INTO serafim_id
  FROM users
  WHERE email = 'serafim.edmilson@gmail.com';

  IF serafim_id IS NULL THEN
    RAISE EXCEPTION 'Usuário serafim.edmilson@gmail.com não encontrado!';
  END IF;

  RAISE NOTICE '👤 Usuário encontrado: %', serafim_id;

  -- ═════════════════════════════════════════════════════════════
  -- OPÇÃO 1: REMOVER TODAS AS PERMISSÕES (Acesso Total)
  -- ═════════════════════════════════════════════════════════════
  -- Descomente as linhas abaixo para dar acesso total ao Serafim:

  -- DELETE FROM user_permissions WHERE user_id = serafim_id;
  -- RAISE NOTICE '✅ Todas as permissões removidas - Acesso Total';

  -- ═════════════════════════════════════════════════════════════
  -- OPÇÃO 2: CONFIGURAR PERMISSÃO ESPECÍFICA DE TAG01
  -- ═════════════════════════════════════════════════════════════
  -- Exemplo: Restringir apenas para ver TAG01 = 'RECEITAS'

  -- Primeiro, remover permissões antigas de tag01
  DELETE FROM user_permissions
  WHERE user_id = serafim_id
  AND permission_type IN ('tag01', 'tag02', 'tag03');
  RAISE NOTICE '🗑️ Permissões antigas de tag01/02/03 removidas';

  -- Adicionar permissão para TAG01 = 'RECEITAS' (exemplo)
  -- IMPORTANTE: Substitua 'RECEITAS' pelo valor correto da sua base!
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (serafim_id, 'tag01', 'RECEITAS')
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = RECEITAS';

  -- Se quiser adicionar mais tags, descomente e ajuste:
  -- INSERT INTO user_permissions (user_id, permission_type, permission_value)
  -- VALUES (serafim_id, 'tag01', 'VENDAS')
  -- ON CONFLICT DO NOTHING;
  -- RAISE NOTICE '✅ Permissão adicionada: tag01 = VENDAS';

  -- ═════════════════════════════════════════════════════════════
  -- OPÇÃO 3: CONFIGURAR PERMISSÃO DE MARCA (CIA)
  -- ═════════════════════════════════════════════════════════════
  -- Exemplo: Restringir para ver apenas marca = 'MARCA_TESTE'

  -- DELETE FROM user_permissions
  -- WHERE user_id = serafim_id
  -- AND permission_type = 'cia';
  -- RAISE NOTICE '🗑️ Permissões antigas de cia removidas';

  -- INSERT INTO user_permissions (user_id, permission_type, permission_value)
  -- VALUES (serafim_id, 'cia', 'MARCA_TESTE')
  -- ON CONFLICT DO NOTHING;
  -- RAISE NOTICE '✅ Permissão adicionada: cia = MARCA_TESTE';

  -- ═════════════════════════════════════════════════════════════
  -- VER RESULTADO FINAL
  -- ═════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📋 PERMISSÕES FINAIS DO SERAFIM:';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- Ver permissões finais
SELECT
  permission_type,
  permission_value,
  created_at
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
ORDER BY permission_type, permission_value;

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ CONFIGURAÇÃO CONCLUÍDA!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMO PASSO:';
  RAISE NOTICE '1. Faça logout no app';
  RAISE NOTICE '2. Faça login novamente com serafim.edmilson@gmail.com';
  RAISE NOTICE '3. Vá para a guia Lançamentos';
  RAISE NOTICE '4. Verifique se só aparecem transações com TAG01 = RECEITAS';
  RAISE NOTICE '5. Vá para a guia DRE Gerencial';
  RAISE NOTICE '6. Verifique se carrega sem loop';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
