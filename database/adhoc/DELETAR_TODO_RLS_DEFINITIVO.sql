-- =====================================================
-- DELETAR **TODO** O RLS - TODAS AS TABELAS
-- =====================================================
-- Remove RLS de TODAS as tabelas do schema public
-- =====================================================

-- =====================================================
-- PASSO 1: LISTAR TODAS AS TABELAS COM RLS ATIVO
-- =====================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- =====================================================
-- PASSO 2: DESABILITAR RLS EM **TODAS** AS TABELAS
-- =====================================================

DO $$
DECLARE
  tbl record;
  contador integer := 0;
BEGIN
  RAISE NOTICE '🗑️  DESABILITANDO RLS EM TODAS AS TABELAS...';

  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    contador := contador + 1;
    RAISE NOTICE '✅ [%] RLS desabilitado: %', contador, tbl.tablename;
  END LOOP;

  RAISE NOTICE '🎯 TOTAL: % tabelas com RLS desabilitado', contador;
END $$;

-- =====================================================
-- PASSO 3: REMOVER **TODAS** AS POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
  pol record;
  contador integer := 0;
BEGIN
  RAISE NOTICE '🗑️  REMOVENDO TODAS AS POLÍTICAS RLS...';

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
    contador := contador + 1;
    RAISE NOTICE '✅ [%] Política removida: %.% - %',
      contador, pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '🎯 TOTAL: % políticas removidas', contador;
END $$;

-- =====================================================
-- PASSO 4: VERIFICAR QUE NÃO RESTA NADA
-- =====================================================

-- Contar tabelas com RLS ainda ativo
SELECT
  COUNT(*) as tabelas_com_rls,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA tabela com RLS'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' tabelas com RLS!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Contar políticas restantes
SELECT
  COUNT(*) as politicas_restantes,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ NENHUMA política RLS'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' políticas!'
  END as status
FROM pg_policies
WHERE schemaname = 'public';

-- Listar tabelas (todas devem ter rowsecurity = false)
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '❌ AINDA ATIVO'
    ELSE '✅ DESABILITADO'
  END as rls_status,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
  ) as politicas_ativas
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- PASSO 5: TESTAR CONTAGEM SEM FILTRO
-- =====================================================

-- Deve ver TODOS os 125k registros
SELECT
  'transactions' as tabela,
  COUNT(*) as total_registros,
  CASE
    WHEN COUNT(*) > 100000 THEN '✅ Vendo TUDO'
    ELSE '❌ Ainda filtrado'
  END as diagnostico
FROM transactions;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ 0 tabelas com RLS ativo
-- ✅ 0 políticas RLS restantes
-- ✅ 125.631 registros visíveis
-- ✅ Todas as tabelas: rowsecurity = FALSE
-- =====================================================

-- =====================================================
-- 🎯 SE AINDA HOUVER FILTRO APÓS ISSO:
-- =====================================================
-- Então o problema NÃO é RLS no banco
-- É 100% CÓDIGO FRONTEND aplicando filtros
-- =====================================================
