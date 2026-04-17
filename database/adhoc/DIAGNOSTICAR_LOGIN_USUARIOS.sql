-- ═══════════════════════════════════════════════════════════
-- DIAGNÓSTICO: Usuários não conseguem fazer login
-- Execute no SQL Editor do Supabase para entender o problema
-- ═══════════════════════════════════════════════════════════

-- 1. Verificar se tabela users existe e tem dados
SELECT
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'pending') as pendentes,
  COUNT(*) FILTER (WHERE role = 'viewer') as viewers
FROM users;

-- 2. Verificar RLS na tabela users
SELECT
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename IN ('users', 'user_permissions')
  AND schemaname = 'public';

-- 3. Ver TODAS as policies da tabela users
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as condicao
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 4. Ver TODAS as policies de user_permissions
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as condicao
FROM pg_policies
WHERE tablename = 'user_permissions'
ORDER BY cmd, policyname;

-- 5. Verificar GRANTs para roles anon e authenticated na tabela users
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name IN ('users', 'user_permissions')
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY table_name, grantee, privilege_type;

-- ═══════════════════════════════════════════════════════════
-- CORREÇÃO RÁPIDA (se GRANTs estiverem faltando):
-- ═══════════════════════════════════════════════════════════
-- GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
-- GRANT SELECT ON public.user_permissions TO anon, authenticated;
-- ═══════════════════════════════════════════════════════════
