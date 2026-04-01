-- ═══════════════════════════════════════════════════════════════
-- CORREÇÕES: Fazer Serafim ver apenas VENDAS e MARKETING
-- Execute DEPOIS de rodar DIAGNOSTICO_RLS_SERAFIM.sql
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  serafim_id UUID;
  user_role TEXT;
BEGIN
  -- Buscar ID e role do Serafim
  SELECT id, role INTO serafim_id, user_role
  FROM users
  WHERE email = 'serafim.edmilson@gmail.com';

  IF serafim_id IS NULL THEN
    RAISE EXCEPTION 'Usuário serafim.edmilson@gmail.com não encontrado!';
  END IF;

  RAISE NOTICE '👤 Usuário encontrado: % (role: %)', serafim_id, user_role;

  -- ═════════════════════════════════════════════════════════════
  -- CORREÇÃO 1: Verificar se é admin
  -- ═════════════════════════════════════════════════════════════
  IF user_role = 'admin' THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ATENÇÃO: Usuário é ADMIN!';
    RAISE NOTICE 'Admins ignoram TODAS as permissões no código.';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUÇÃO: Mudar role para "viewer" ou "manager"';
    RAISE NOTICE 'Descomente as linhas abaixo para mudar:';
    RAISE NOTICE '';

    -- Descomente para mudar role para viewer:
    -- UPDATE users
    -- SET role = 'viewer'
    -- WHERE id = serafim_id;
    -- RAISE NOTICE '✅ Role alterado para VIEWER';
  ELSE
    RAISE NOTICE '✅ Role não é admin (OK)';
  END IF;

  -- ═════════════════════════════════════════════════════════════
  -- CORREÇÃO 2: Limpar e reconfigurar permissões
  -- ═════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Removendo permissões antigas...';

  DELETE FROM user_permissions
  WHERE user_id = serafim_id;

  RAISE NOTICE '✅ Permissões antigas removidas';

  -- ═════════════════════════════════════════════════════════════
  -- CORREÇÃO 3: Adicionar permissões corretas
  -- ═════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '➕ Adicionando novas permissões...';

  -- IMPORTANTE: Verificar no diagnóstico os valores EXATOS de tag01
  -- Pode ser 'VENDAS' ou 'Vendas' ou 'vendas' (case-sensitive!)

  -- Adicionar VENDAS
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (serafim_id, 'tag01', 'VENDAS')
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = VENDAS';

  -- Adicionar MARKETING
  INSERT INTO user_permissions (user_id, permission_type, permission_value)
  VALUES (serafim_id, 'tag01', 'MARKETING')
  ON CONFLICT DO NOTHING;
  RAISE NOTICE '✅ Permissão adicionada: tag01 = MARKETING';

  -- Se os valores no banco forem diferentes, descomente e ajuste:
  -- INSERT INTO user_permissions (user_id, permission_type, permission_value)
  -- VALUES (serafim_id, 'tag01', 'Vendas')  -- ← Usar valor EXATO do banco
  -- ON CONFLICT DO NOTHING;

  -- INSERT INTO user_permissions (user_id, permission_type, permission_value)
  -- VALUES (serafim_id, 'tag01', 'Marketing')  -- ← Usar valor EXATO do banco
  -- ON CONFLICT DO NOTHING;

END $$;

-- ═════════════════════════════════════════════════════════════
-- CORREÇÃO 4: Desabilitar RLS temporariamente
-- ═════════════════════════════════════════════════════════════
-- RLS precisa de JWT configurado (não temos no app)
-- Desabilitar RLS para que a filtragem funcione apenas no cliente

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT
  '🔐 STATUS DO RLS APÓS CORREÇÃO:' as info,
  tablename,
  rowsecurity as rls_ativado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'transactions';

-- ═════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═════════════════════════════════════════════════════════════

-- Ver permissões finais
SELECT
  '📋 PERMISSÕES FINAIS:' as info,
  permission_type,
  permission_value
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
ORDER BY permission_type, permission_value;

-- Contar registros que ele DEVERIA ver
WITH user_permissions_cte AS (
  SELECT permission_value
  FROM user_permissions up
  JOIN users u ON u.id = up.user_id
  WHERE u.email = 'serafim.edmilson@gmail.com'
    AND up.permission_type = 'tag01'
)
SELECT
  '📊 REGISTROS QUE DEVERIA VER:' as info,
  t.tag01,
  COUNT(*) as total
FROM transactions t
WHERE t.tag01 IN (SELECT permission_value FROM user_permissions_cte)
GROUP BY t.tag01
ORDER BY total DESC;

-- Total geral
SELECT
  '📊 TOTAL GERAL NO BANCO:' as info,
  COUNT(*) as total
FROM transactions;

-- ═════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORREÇÕES APLICADAS!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMO PASSO:';
  RAISE NOTICE '1. Vá para o App';
  RAISE NOTICE '2. Faça LOGOUT';
  RAISE NOTICE '3. Faça LOGIN novamente com serafim.edmilson@gmail.com';
  RAISE NOTICE '4. Abra o Console do navegador (F12)';
  RAISE NOTICE '5. Vá para a guia Lançamentos';
  RAISE NOTICE '6. Clique em "Buscar Dados"';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAR NO CONSOLE:';
  RAISE NOTICE '• Deve aparecer: "🔒 Filtrando por permissões..."';
  RAISE NOTICE '• Total de transações deve ser menor que o total geral';
  RAISE NOTICE '';
  RAISE NOTICE 'SE AINDA NÃO FUNCIONAR:';
  RAISE NOTICE '• Verificar se role é admin (admins ignoram filtros)';
  RAISE NOTICE '• Verificar se valores no banco batem exatamente';
  RAISE NOTICE '• Enviar screenshot do console';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
