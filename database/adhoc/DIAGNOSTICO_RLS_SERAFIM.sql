-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO COMPLETO: Por que Serafim vê tudo?
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Verificar dados do usuário e role
SELECT
  '🔍 DADOS DO USUÁRIO:' as diagnostico,
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = 'serafim.edmilson@gmail.com';

-- 2. Verificar permissões configuradas
SELECT
  '🔒 PERMISSÕES CONFIGURADAS:' as diagnostico,
  up.permission_type,
  up.permission_value,
  up.created_at
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
ORDER BY up.permission_type, up.permission_value;

-- 3. Contar permissões por tipo
SELECT
  '📊 CONTAGEM DE PERMISSÕES:' as diagnostico,
  up.permission_type,
  COUNT(*) as total
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
GROUP BY up.permission_type;

-- 4. Ver valores de TAG01 no banco (case-sensitive)
SELECT
  '🏷️ VALORES DE TAG01 NO BANCO:' as diagnostico,
  DISTINCT tag01,
  LENGTH(tag01) as tamanho,
  COUNT(*) as total_registros
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY total_registros DESC
LIMIT 30;

-- 5. Comparar permissões com dados reais
SELECT
  '⚠️ VERIFICAÇÃO DE MATCH:' as diagnostico,
  up.permission_value as permissao_configurada,
  t.tag01 as valor_no_banco,
  CASE
    WHEN up.permission_value = t.tag01 THEN '✅ MATCH EXATO'
    WHEN LOWER(up.permission_value) = LOWER(t.tag01) THEN '⚠️ Match só ignorando case'
    ELSE '❌ NÃO BATE'
  END as status_match,
  COUNT(*) as registros_afetados
FROM user_permissions up
JOIN users u ON u.id = up.user_id
CROSS JOIN transactions t
WHERE u.email = 'serafim.edmilson@gmail.com'
  AND up.permission_type = 'tag01'
  AND t.tag01 IS NOT NULL
GROUP BY up.permission_value, t.tag01
ORDER BY status_match DESC, registros_afetados DESC
LIMIT 50;

-- 6. Contar quantos registros o usuário DEVERIA ver
WITH user_permissions_cte AS (
  SELECT permission_type, permission_value
  FROM user_permissions up
  JOIN users u ON u.id = up.user_id
  WHERE u.email = 'serafim.edmilson@gmail.com'
)
SELECT
  '📈 REGISTROS QUE DEVERIA VER:' as diagnostico,
  t.tag01,
  COUNT(*) as total
FROM transactions t
WHERE t.tag01 IN (
  SELECT permission_value
  FROM user_permissions_cte
  WHERE permission_type = 'tag01'
)
GROUP BY t.tag01
ORDER BY total DESC;

-- 7. Contar quantos registros TOTAIS existem
SELECT
  '📊 TOTAL DE REGISTROS NO BANCO:' as diagnostico,
  COUNT(*) as total_registros
FROM transactions;

-- 8. Verificar se o RLS está ativado
SELECT
  '🔐 STATUS DO RLS:' as diagnostico,
  tablename,
  rowsecurity as rls_ativado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'transactions';

-- 9. Ver políticas RLS ativas
SELECT
  '📜 POLÍTICAS RLS ATIVAS:' as diagnostico,
  policyname as nome_politica,
  cmd as comando,
  qual as condicao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'transactions';

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL COM INTERPRETAÇÃO
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  user_role TEXT;
  total_permissions INT;
  rls_enabled BOOLEAN;
BEGIN
  -- Pegar role do usuário
  SELECT role INTO user_role
  FROM users
  WHERE email = 'serafim.edmilson@gmail.com';

  -- Contar permissões
  SELECT COUNT(*) INTO total_permissions
  FROM user_permissions up
  JOIN users u ON u.id = up.user_id
  WHERE u.email = 'serafim.edmilson@gmail.com';

  -- Verificar RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'transactions';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNÓSTICO COMPLETO';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Usuário: serafim.edmilson@gmail.com';
  RAISE NOTICE '👑 Role: %', COALESCE(user_role, 'NÃO ENCONTRADO');
  RAISE NOTICE '🔒 Total de permissões: %', total_permissions;
  RAISE NOTICE '🔐 RLS ativado: %', COALESCE(rls_enabled, FALSE);
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'POSSÍVEIS PROBLEMAS:';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  IF user_role = 'admin' THEN
    RAISE NOTICE '❌ PROBLEMA 1: Usuário é ADMIN!';
    RAISE NOTICE '   → Admins ignoram permissões no código';
    RAISE NOTICE '   → Solução: Mudar role para "viewer" ou "manager"';
    RAISE NOTICE '';
  END IF;

  IF total_permissions = 0 THEN
    RAISE NOTICE '❌ PROBLEMA 2: Usuário SEM permissões!';
    RAISE NOTICE '   → Quando não há permissões, o sistema dá acesso total';
    RAISE NOTICE '   → Solução: Adicionar permissões de tag01';
    RAISE NOTICE '';
  END IF;

  IF rls_enabled THEN
    RAISE NOTICE '⚠️ PROBLEMA 3: RLS está ATIVADO!';
    RAISE NOTICE '   → RLS precisa de JWT configurado (não temos)';
    RAISE NOTICE '   → RLS pode estar bloqueando as queries';
    RAISE NOTICE '   → Solução: DESABILITAR RLS temporariamente';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
