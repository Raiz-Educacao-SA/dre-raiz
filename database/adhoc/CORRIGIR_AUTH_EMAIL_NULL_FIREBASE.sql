-- ═══════════════════════════════════════════════════════════
-- CORREÇÃO: auth.email() retorna NULL com Firebase OIDC
-- Causa: signInWithIdToken com Firebase não mapeia email no JWT
-- ═══════════════════════════════════════════════════════════

-- 1. Garantir GRANTs básicos na tabela users
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.user_permissions TO anon, authenticated;

-- 2. Ver policies atuais da tabela users (para diagnóstico)
SELECT policyname, permissive, roles, cmd, qual::text as condicao
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd;

-- 3. Remover qualquer policy que cheque auth.email() na tabela users
--    (se existir alguma aplicada via dashboard que não está nos arquivos SQL)
DROP POLICY IF EXISTS "Users can see themselves" ON users;
DROP POLICY IF EXISTS "Allow authenticated users" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- 4. Garantir policies abertas na tabela users (padrão do projeto)
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Enable update for all users" ON users;
DROP POLICY IF EXISTS "Only admins can update users" ON users;

CREATE POLICY "users_select_open"   ON users FOR SELECT  USING (true);
CREATE POLICY "users_insert_open"   ON users FOR INSERT  WITH CHECK (true);
CREATE POLICY "users_update_open"   ON users FOR UPDATE  USING (true);

-- 5. Garantir policies abertas na tabela user_permissions
DROP POLICY IF EXISTS "Enable read access for all users" ON user_permissions;
DROP POLICY IF EXISTS "Anyone can read permissions" ON user_permissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON user_permissions;
DROP POLICY IF EXISTS "Only admins can manage permissions" ON user_permissions;
DROP POLICY IF EXISTS "Enable update for all users" ON user_permissions;
DROP POLICY IF EXISTS "Enable delete for all users" ON user_permissions;

CREATE POLICY "perms_select_open" ON user_permissions FOR SELECT  USING (true);
CREATE POLICY "perms_insert_open" ON user_permissions FOR INSERT  WITH CHECK (true);
CREATE POLICY "perms_update_open" ON user_permissions FOR UPDATE  USING (true);
CREATE POLICY "perms_delete_open" ON user_permissions FOR DELETE  USING (true);

-- 6. Verificar resultado
SELECT
  tablename,
  policyname,
  cmd,
  qual::text as condicao
FROM pg_policies
WHERE tablename IN ('users', 'user_permissions')
ORDER BY tablename, cmd;

-- ═══════════════════════════════════════════════════════════
-- RESULTADO ESPERADO: todas as policies com USING (true)
-- ═══════════════════════════════════════════════════════════
