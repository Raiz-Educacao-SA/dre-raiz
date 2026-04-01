-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: RLS e Permissões do Usuário Gabriel
-- ═══════════════════════════════════════════════════════════════

-- 1. Verificar se o usuário Gabriel existe
SELECT
  'Usuário Gabriel' as tipo,
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email ILIKE '%gabriel%' OR name ILIKE '%gabriel%';

-- 2. Verificar permissões do Gabriel
SELECT
  'Permissões do Gabriel' as tipo,
  u.name as usuario,
  up.permission_type,
  up.permission_value,
  up.created_at
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email ILIKE '%gabriel%' OR u.name ILIKE '%gabriel%';

-- 3. Verificar tipos de permissão permitidos
SELECT
  'Constraint de permission_type' as tipo,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_permissions'::regclass
  AND conname LIKE '%permission_type%';

-- 4. Verificar políticas RLS ativas em transactions
SELECT
  'Políticas RLS em transactions' as tipo,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- 5. Verificar se RLS está habilitado
SELECT
  'Status RLS' as tipo,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('transactions', 'users', 'user_permissions');

-- 6. Contar transações por tag01
SELECT
  'Total por tag01' as tipo,
  tag01,
  COUNT(*) as total
FROM transactions
GROUP BY tag01
ORDER BY tag01;

-- 7. Verificar se a coluna tag01 existe na tabela transactions
SELECT
  'Estrutura da coluna tag01' as tipo,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'tag01';
