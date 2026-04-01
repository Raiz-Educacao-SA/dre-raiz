-- =====================================================
-- SOLUÇÃO: Criar política RLS específica para Admin
-- =====================================================
-- Problema: Admin não tem permissões → RLS bloqueia
-- Solução: Política que permite Admin ver TUDO
-- =====================================================

-- =====================================================
-- PASSO 1: Verificar se Admin existe e tem role correto
-- =====================================================

SELECT
  id,
  email,
  role,
  created_at
FROM users
WHERE role = 'admin'
ORDER BY email;

-- ✅ Deve aparecer o email do Admin

-- =====================================================
-- PASSO 2: Criar política RLS para Admin (acesso total)
-- =====================================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;

-- Criar nova política permissiva para Admin
CREATE POLICY "allow_admin_full_access"
  ON transactions
  FOR SELECT
  USING (
    -- Admin vê TUDO (sem filtros)
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

COMMENT ON POLICY "allow_admin_full_access" ON transactions
  IS 'Permite Admin ver todos os dados sem restrição';

-- =====================================================
-- PASSO 3: Verificar ordem das políticas
-- =====================================================

-- Listar todas as políticas (Admin deve aparecer PRIMEIRO)
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 50) as condicao
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- ✅ "allow_admin_full_access" deve aparecer na lista

-- =====================================================
-- PASSO 4: TESTAR como Admin
-- =====================================================

-- Simular usuário Admin (trocar pelo email real)
-- SET SESSION "request.jwt.claim.email" = 'admin@raiz.com';

-- Contar registros como Admin
SELECT COUNT(*) as total_visivel FROM transactions;

-- ✅ Deve retornar 125k+ (todos os registros)
-- ❌ Se retornar 0 ou pouco: política não funcionou

-- =====================================================
-- PASSO 5: Testar query DRE como Admin
-- =====================================================

EXPLAIN ANALYZE
SELECT
  scenario,
  year_month,
  COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- ✅ Se executar em < 10s: política funcionou
-- ❌ Se timeout: problema é volume de dados

-- =====================================================
-- ALTERNATIVA: Política mais simples (PERMISSIVE)
-- =====================================================

-- Se a política acima não funcionar, usar PERMISSIVE:

DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;

CREATE POLICY "allow_admin_full_access"
  ON transactions
  FOR SELECT
  TO public
  USING (
    -- Verifica se existe usuário com role admin autenticado
    EXISTS (
      SELECT 1
      FROM auth.users au
      JOIN users u ON u.email = au.email
      WHERE au.id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- =====================================================
-- PASSO 6: TESTAR NO NAVEGADOR
-- =====================================================

-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como Admin
-- 3. Abrir DRE Gerencial
-- 4. ✅ Deve carregar (pode demorar se tiver muitos dados)
-- 5. ✅ Não deve dar erro de RLS

-- =====================================================
-- PASSO 7: Se ainda estiver lento (volume de dados)
-- =====================================================

-- Problema não é RLS, é volume de dados (125k registros)
-- Solução:
-- 1. Executar: USAR_CACHE_MATERIALIZADO.sql
-- 2. Ou limitar período padrão para Admin (já implementado no código)

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ Admin vê todos os dados (sem filtro RLS)
-- ✅ Usuários normais continuam com RLS (filtrados)
-- ✅ DRE carrega para Admin (pode ser lento se muitos dados)
-- =====================================================

-- =====================================================
-- IMPORTANTE: Ordem das políticas importa!
-- =====================================================

-- PostgreSQL avalia políticas na ordem:
-- 1. Políticas PERMISSIVE (OR lógico)
-- 2. Políticas RESTRICTIVE (AND lógico)

-- Se houver outras políticas RESTRICTIVE, Admin pode ser bloqueado
-- Solução: Usar apenas PERMISSIVE OU adicionar exceção em RESTRICTIVE

-- =====================================================
-- DEBUG: Ver todas as políticas e ordem
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as condicao_completa
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY permissive DESC, policyname;

-- Políticas PERMISSIVE devem vir primeiro
-- Se Admin ainda for bloqueado, verificar políticas RESTRICTIVE

-- =====================================================
