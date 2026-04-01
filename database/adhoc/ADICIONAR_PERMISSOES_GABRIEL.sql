-- ═══════════════════════════════════════════════════════════════
-- ADICIONAR PERMISSÕES DO GABRIEL
-- Email: gabriel.araujo@raizeducacao.com.br
-- TAG01 permitidas: RECEITAS, VENDAS, MARKETING
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  gabriel_id UUID;
  gabriel_email TEXT := 'gabriel.araujo@raizeducacao.com.br';
BEGIN
  -- Buscar o ID do Gabriel
  SELECT id INTO gabriel_id FROM users WHERE email = gabriel_email;

  IF gabriel_id IS NULL THEN
    RAISE EXCEPTION 'Usuário Gabriel não encontrado com email: %', gabriel_email;
  END IF;

  RAISE NOTICE 'Usuário Gabriel encontrado com ID: %', gabriel_id;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'ADICIONANDO PERMISSÕES DE TAG01 PARA GABRIEL';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  -- Remover permissões antigas de tag01 (opcional - descomente se quiser limpar)
  -- DELETE FROM user_permissions WHERE user_id = gabriel_id AND permission_type = 'tag01';
  -- RAISE NOTICE 'Permissões antigas de tag01 removidas';

  -- Adicionar permissão: RECEITAS
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (gabriel_id, 'tag01', 'RECEITAS')
  ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = RECEITAS';

  -- Adicionar permissão: VENDAS
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (gabriel_id, 'tag01', 'VENDAS')
  ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = VENDAS';

  -- Adicionar permissão: MARKETING
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (gabriel_id, 'tag01', 'MARKETING')
  ON CONFLICT (user_id, permission_type, permission_value) DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = MARKETING';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ PERMISSÕES CONFIGURADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAR PERMISSÕES CONFIGURADAS
-- ═══════════════════════════════════════════════════════════════

SELECT
  '🔍 VERIFICAÇÃO - Permissões do Gabriel:' as info,
  u.name,
  u.email,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'gabriel.araujo@raizeducacao.com.br'
ORDER BY up.permission_type, up.permission_value;

-- ═══════════════════════════════════════════════════════════════
-- TESTAR: Quantas transações Gabriel deveria ver
-- ═══════════════════════════════════════════════════════════════

SELECT
  '📊 TOTAL que Gabriel deveria ver:' as info,
  tag01,
  COUNT(*) as total_transacoes
FROM transactions
WHERE tag01 IN ('RECEITAS', 'VENDAS', 'MARKETING')
GROUP BY tag01
ORDER BY tag01;

SELECT
  '📈 TOTAL GERAL que Gabriel pode ver:' as info,
  COUNT(*) as total
FROM transactions
WHERE tag01 IN ('RECEITAS', 'VENDAS', 'MARKETING');

-- ═══════════════════════════════════════════════════════════════
-- COMPARAÇÃO: Total no sistema vs Total do Gabriel
-- ═══════════════════════════════════════════════════════════════

SELECT
  '🌍 TOTAL NO SISTEMA (todos):' as info,
  COUNT(*) as total
FROM transactions;

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PRÓXIMO PASSO: TESTAR!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '1. Faça login como Gabriel no painel';
  RAISE NOTICE '2. Vá para a página de transações';
  RAISE NOTICE '3. Verifique se ele vê APENAS transações com:';
  RAISE NOTICE '   - TAG01 = RECEITAS';
  RAISE NOTICE '   - TAG01 = VENDAS';
  RAISE NOTICE '   - TAG01 = MARKETING';
  RAISE NOTICE '';
  RAISE NOTICE '4. Compare o total mostrado com o resultado acima';
  RAISE NOTICE '';
  RAISE NOTICE 'Se ele ainda vê tudo, me avise para investigar!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
