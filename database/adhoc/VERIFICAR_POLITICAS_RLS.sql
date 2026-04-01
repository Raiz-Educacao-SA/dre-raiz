-- =====================================================
-- VERIFICAR POLÍTICAS RLS ATUAIS
-- =====================================================

-- =====================================================
-- 1. Ver todas as políticas RLS na tabela transactions
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as condicao_filtro,
  with_check as condicao_insert_update
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- =====================================================
-- 2. Ver política específica (detalhes)
-- =====================================================

\d+ transactions

-- =====================================================
-- 3. Testar se Admin tem acesso a TODOS os dados
-- =====================================================

-- Ver quantos registros o Admin vê
SELECT COUNT(*) as registros_visiveis FROM transactions;

-- Se retornar 0 ou número pequeno: RLS está bloqueando
-- Se retornar 125k+: RLS não está bloqueando

-- =====================================================
-- 4. Ver permissões do usuário atual
-- =====================================================

SELECT
  current_user as usuario_atual,
  current_role as role_atual,
  session_user as sessao_usuario;

-- =====================================================
-- 5. Verificar se há função get_user_permissions()
-- =====================================================

SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%permission%'
ORDER BY routine_name;

-- =====================================================
-- 6. Testar função de permissões (se existir)
-- =====================================================

-- Se existir get_user_permissions(), testar:
-- SELECT * FROM get_user_permissions('cia');
-- SELECT * FROM get_user_permissions('filial');
-- SELECT * FROM get_user_permissions('tag01');

-- Se retornar vazio para Admin: explicaria por que RLS bloqueia

-- =====================================================
-- 7. Ver emails com permissões cadastradas
-- =====================================================

SELECT
  u.email,
  u.role,
  COUNT(p.id) as total_permissoes
FROM users u
LEFT JOIN permissions p ON u.id = p.user_id
GROUP BY u.email, u.role
ORDER BY total_permissoes DESC;

-- ✅ Se Admin tem 0 permissões: RLS vai bloquear
-- ✅ Se Admin tem role = 'admin': deve ter acesso total

-- =====================================================
-- 8. SOLUÇÃO: Política RLS específica para Admin
-- =====================================================

-- Se Admin não consegue ver dados, criar política permissiva:

-- DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;

-- CREATE POLICY "allow_admin_full_access"
--   ON transactions
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--         AND users.role = 'admin'
--     )
--   );

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Se Admin tem role='admin' → deve ver TODOS os dados
-- Se Admin não tem permissões → RLS bloqueia → loop
-- =====================================================
