-- =====================================================
-- DELETAR COMPLETAMENTE TODO O CONTROLE DE RLS
-- =====================================================
-- ✅ Remove TODAS as políticas
-- ✅ Desabilita RLS em TODAS as tabelas
-- ✅ Deixa banco SEM NENHUM controle RLS
-- =====================================================

-- =====================================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS
-- =====================================================

DO $$
DECLARE
  pol record;
BEGIN
  RAISE NOTICE '🗑️  REMOVENDO TODAS AS POLÍTICAS RLS...';

  -- Loop por TODAS as políticas do schema public
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
    RAISE NOTICE '✅ Removida: %.% - %', pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '✅ TODAS as políticas foram removidas!';
END $$;

-- =====================================================
-- PASSO 2: DESABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

DO $$
DECLARE
  tbl record;
BEGIN
  RAISE NOTICE '🔓 DESABILITANDO RLS EM TODAS AS TABELAS...';

  -- Loop por TODAS as tabelas com RLS ativo
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE '✅ RLS desabilitado em: %', tbl.tablename;
  END LOOP;

  RAISE NOTICE '✅ RLS desabilitado em TODAS as tabelas!';
END $$;

-- =====================================================
-- PASSO 3: VERIFICAR QUE NÃO HÁ MAIS NADA
-- =====================================================

-- Contar políticas restantes
SELECT
  COUNT(*) as total_politicas_restantes,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA política RLS ativa'
    ELSE '❌ AINDA HÁ políticas ativas!'
  END as status
FROM pg_policies
WHERE schemaname = 'public';

-- Listar tabelas com RLS ainda ativo
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '❌ AINDA ATIVO'
    ELSE '✅ DESABILITADO'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Se não retornar nenhuma linha = sucesso!

-- =====================================================
-- PASSO 4: TESTAR CONTAGEM SEM FILTRO
-- =====================================================

-- Deve ver TODOS os 125k registros
SELECT
  COUNT(*) as total_registros,
  CASE
    WHEN COUNT(*) > 100000 THEN '✅ Vendo TUDO (RLS removido)'
    ELSE '❌ Ainda filtrado (problema no código)'
  END as diagnostico
FROM transactions;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ 0 políticas restantes
-- ✅ 0 tabelas com RLS ativo
-- ✅ 125.631 registros visíveis
-- =====================================================

-- =====================================================
-- 🎯 PRÓXIMO PASSO: Testar no navegador
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como USUÁRIO NORMAL
-- 3. Abrir DRE Gerencial
-- 4. Verificar se vê TODOS os dados
--
-- ✅ Se vê tudo: Era RLS mesmo
-- ❌ Se ainda filtra: PROBLEMA É NO CÓDIGO (não RLS)
-- =====================================================
