-- ═══════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICAÇÃO: Estado Atual do Sistema
-- Execute no SQL Editor do Supabase para diagnosticar
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ VERIFICAR SE TABELAS EXISTEM
SELECT
  '1️⃣ TABELAS DO SISTEMA' as secao,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('transactions', 'users', 'user_permissions', 'manual_changes')
ORDER BY table_name;

-- 2️⃣ VERIFICAR USUÁRIOS CADASTRADOS
SELECT
  '2️⃣ USUÁRIOS CADASTRADOS' as secao,
  id,
  email,
  name,
  role,
  created_at
FROM users
ORDER BY created_at DESC;

-- 3️⃣ VERIFICAR PERMISSÕES CONFIGURADAS
SELECT
  '3️⃣ PERMISSÕES CONFIGURADAS' as secao,
  u.name as usuario,
  u.email,
  u.role,
  up.permission_type,
  up.permission_value,
  up.created_at
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
ORDER BY u.name, up.permission_type, up.permission_value;

-- 4️⃣ VERIFICAR SE RLS ESTÁ ATIVO
SELECT
  '4️⃣ STATUS DO RLS' as secao,
  schemaname,
  tablename,
  rowsecurity as rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'users', 'user_permissions', 'manual_changes');

-- 5️⃣ VERIFICAR POLÍTICAS RLS ATIVAS
SELECT
  '5️⃣ POLÍTICAS RLS ATIVAS' as secao,
  tablename,
  policyname,
  cmd as comando,
  qual as condicao_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'users', 'user_permissions', 'manual_changes')
ORDER BY tablename, policyname;

-- 6️⃣ CONTAR TRANSAÇÕES NO BANCO
SELECT
  '6️⃣ TOTAL DE TRANSAÇÕES' as secao,
  COUNT(*) as total_registros,
  COUNT(DISTINCT marca) as marcas_unicas,
  COUNT(DISTINCT filial) as filiais_unicas,
  COUNT(DISTINCT tag01) as tag01_unicas,
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente
FROM transactions;

-- 7️⃣ VALORES ÚNICOS PARA PERMISSÕES
SELECT '7️⃣ VALORES DE MARCA (CIA)' as secao, marca as valor, COUNT(*) as registros
FROM transactions WHERE marca IS NOT NULL GROUP BY marca ORDER BY registros DESC LIMIT 10
UNION ALL
SELECT '7️⃣ VALORES DE FILIAL' as secao, filial as valor, COUNT(*) as registros
FROM transactions WHERE filial IS NOT NULL GROUP BY filial ORDER BY registros DESC LIMIT 10
UNION ALL
SELECT '7️⃣ VALORES DE TAG01' as secao, tag01 as valor, COUNT(*) as registros
FROM transactions WHERE tag01 IS NOT NULL GROUP BY tag01 ORDER BY registros DESC LIMIT 10
UNION ALL
SELECT '7️⃣ VALORES DE TAG02' as secao, tag02 as valor, COUNT(*) as registros
FROM transactions WHERE tag02 IS NOT NULL GROUP BY tag02 ORDER BY registros DESC LIMIT 10
UNION ALL
SELECT '7️⃣ VALORES DE TAG03' as secao, tag03 as valor, COUNT(*) as registros
FROM transactions WHERE tag03 IS NOT NULL GROUP BY tag03 ORDER BY registros DESC LIMIT 10;

-- 8️⃣ TESTAR ACESSO DIRETO (SEM RLS)
-- Execute como usuário postgres/service_role
SELECT
  '8️⃣ TESTE ACESSO DIRETO' as secao,
  COUNT(*) as registros_visiveis,
  'Se você vê este número, o banco tem dados!' as mensagem
FROM transactions;

-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO AUTOMÁTICO
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  total_transactions INTEGER;
  total_users INTEGER;
  total_permissions INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_transactions FROM transactions;
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO total_permissions FROM user_permissions;
  SELECT COUNT(*) > 0 INTO rls_enabled FROM pg_tables WHERE tablename = 'transactions' AND rowsecurity = true;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNÓSTICO AUTOMÁTICO';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  RAISE NOTICE '📊 DADOS:';
  RAISE NOTICE '  • Transações: % registros', total_transactions;
  RAISE NOTICE '  • Usuários: % cadastrados', total_users;
  RAISE NOTICE '  • Permissões: % configuradas', total_permissions;
  RAISE NOTICE '';

  RAISE NOTICE '🔐 SEGURANÇA:';
  IF rls_enabled THEN
    RAISE NOTICE '  • RLS: ✅ ATIVO (bloqueando acesso)';
  ELSE
    RAISE NOTICE '  • RLS: ❌ INATIVO';
  END IF;
  RAISE NOTICE '';

  RAISE NOTICE '💡 DIAGNÓSTICO:';
  IF total_transactions = 0 THEN
    RAISE NOTICE '  ⚠️  Banco vazio - precisa importar dados';
  ELSIF total_users = 0 THEN
    RAISE NOTICE '  ⚠️  Sem usuários cadastrados';
  ELSIF rls_enabled AND total_permissions = 0 THEN
    RAISE NOTICE '  ⚠️  RLS ativo mas sem permissões configuradas';
    RAISE NOTICE '      → Usuários não conseguem ver nenhum dado!';
  ELSIF rls_enabled AND total_permissions > 0 THEN
    RAISE NOTICE '  ✅ Sistema configurado corretamente';
    RAISE NOTICE '      → Usuário precisa fazer LOGIN para ver dados';
  ELSE
    RAISE NOTICE '  ⚠️  RLS inativo - todos veem tudo';
  END IF;
  RAISE NOTICE '';

  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  IF total_transactions = 0 THEN
    RAISE NOTICE '  1. Importar dados (execute dados_teste.sql)';
  END IF;
  IF total_users = 0 THEN
    RAISE NOTICE '  2. Criar usuário (veja CRIAR_USUARIO.sql)';
  END IF;
  IF total_permissions = 0 THEN
    RAISE NOTICE '  3. Configurar permissões (veja ADICIONAR_PERMISSOES.sql)';
  END IF;
  IF rls_enabled THEN
    RAISE NOTICE '  4. Fazer LOGIN no app (Firebase Auth)';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
