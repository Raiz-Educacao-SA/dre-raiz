-- =====================================================
-- REMOVER TODAS AS POLÍTICAS RLS (TESTE EXTREMO)
-- =====================================================
-- ⚠️ Isso APAGA as políticas completamente
-- ⚠️ Será necessário recriar depois
-- ⚠️ Use apenas se DISABLE não funcionou
-- =====================================================

-- =====================================================
-- PASSO 1: Listar todas as políticas para confirmar
-- =====================================================

SELECT
  tablename,
  policyname,
  'Será removida' as acao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- PASSO 2: Remover TODAS as políticas de transactions
-- =====================================================

-- ⚠️ CUIDADO: Isso remove PERMANENTEMENTE as políticas!
-- Só execute se você tiver certeza

DO $$
DECLARE
  pol record;
BEGIN
  -- Loop por todas as políticas da tabela transactions
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'transactions'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END $$;

-- =====================================================
-- PASSO 3: Remover políticas de outras tabelas
-- =====================================================

DO $$
DECLARE
  pol record;
BEGIN
  -- transactions_orcado
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'transactions_orcado'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions_orcado', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;

  -- transactions_ano_anterior
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'transactions_ano_anterior'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions_ano_anterior', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;

  -- users
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'users'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;

  -- permissions
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'permissions'
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON permissions', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END $$;

-- =====================================================
-- PASSO 4: VERIFICAR que não há mais políticas
-- =====================================================

SELECT
  tablename,
  COUNT(*) as politicas_restantes
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions'
  )
GROUP BY tablename;

-- ✅ Não deve retornar NENHUMA linha (0 políticas)

-- =====================================================
-- PASSO 5: TAMBÉM desabilitar RLS (dupla garantia)
-- =====================================================

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_orcado DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_ano_anterior DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 6: VERIFICAR STATUS FINAL
-- =====================================================

SELECT
  tablename,
  rowsecurity,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
  ) as politicas_ativas
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions'
  )
ORDER BY tablename;

-- ✅ TODAS devem ter:
-- rowsecurity = FALSE
-- politicas_ativas = 0

-- =====================================================
-- AGORA TESTE NO NAVEGADOR:
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como USUÁRIO NORMAL
-- 3. Abrir DRE Gerencial
-- 4. Verificar se vê TODOS os dados (sem filtro)
--
-- ✅ Se vê tudo: RLS foi completamente removido
-- ❌ Se ainda filtra: Problema não é RLS (é no código)
-- =====================================================

-- =====================================================
-- ⚠️ IMPORTANTE: Recriar políticas depois do teste!
-- =====================================================
-- Após confirmar que o problema era RLS,
-- será necessário recriar as políticas corretamente
-- =====================================================
