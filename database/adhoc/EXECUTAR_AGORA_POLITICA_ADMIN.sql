-- =====================================================
-- SOLUÇÃO DEFINITIVA: Política RLS para Admin
-- =====================================================
-- ✅ PROBLEMA IDENTIFICADO: RLS bloqueia Admin
-- ✅ TESTE COMPROVOU: Query rápida (0.86s) com SERVICE_ROLE
-- ✅ SOLUÇÃO: Criar política que permite Admin ver tudo
-- =====================================================

-- =====================================================
-- ADMINS CADASTRADOS:
-- - admin@raiz.com
-- - edmilson.serafim@raizeducacao.com.br
-- =====================================================

-- =====================================================
-- PASSO 1: Remover política antiga (se existir)
-- =====================================================

DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;

-- =====================================================
-- PASSO 2: Criar política PERMISSIVA para Admin
-- =====================================================

CREATE POLICY "allow_admin_full_access"
  ON transactions
  FOR SELECT
  TO public
  USING (
    -- Admin vê TUDO (verifica role na tabela users)
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.email = (auth.jwt() ->> 'email')
        AND users.role = 'admin'
    )
  );

-- Adicionar comentário explicativo
COMMENT ON POLICY "allow_admin_full_access" ON transactions
  IS 'Permite usuários com role=admin ver todos os registros sem restrição de RLS';

-- =====================================================
-- PASSO 3: VERIFICAR se foi criada
-- =====================================================

SELECT
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 80) as condicao
FROM pg_policies
WHERE tablename = 'transactions'
  AND policyname = 'allow_admin_full_access';

-- ✅ Deve aparecer a política "allow_admin_full_access"

-- =====================================================
-- PASSO 4: TESTAR com usuário atual
-- =====================================================

-- Ver email atual (deve ser um dos admins)
SELECT
  auth.jwt() ->> 'email' as email_atual,
  (
    SELECT role
    FROM users
    WHERE email = auth.jwt() ->> 'email'
  ) as role_atual;

-- Se retornar role = 'admin', a política vai funcionar

-- Contar registros visíveis
SELECT COUNT(*) as registros_visiveis FROM transactions;

-- ✅ Admin deve ver 125.631 registros
-- ❌ Usuário normal vê menos (com filtro RLS)

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ Política criada
-- ✅ Admin vê todos os 125k registros
-- ✅ DRE Gerencial carrega em < 2 segundos
-- ✅ Usuários normais continuam com RLS (filtrados)
-- =====================================================
