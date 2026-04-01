-- =====================================================
-- 🔥 OPÇÃO NUCLEAR: DELETAR **ABSOLUTAMENTE TUDO** DE RLS
-- =====================================================
-- Remove TUDO relacionado a RLS/Permissões
-- =====================================================

-- =====================================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
  pol record;
  contador integer := 0;
BEGIN
  RAISE NOTICE '🗑️  === REMOVENDO TODAS AS POLÍTICAS RLS ===';

  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
      pol.policyname, pol.schemaname, pol.tablename);
    contador := contador + 1;
    RAISE NOTICE '✅ [%] Política removida: %.% → %',
      contador, pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '🎯 TOTAL: % políticas removidas', contador;
END $$;

-- =====================================================
-- PARTE 2: DESABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

DO $$
DECLARE
  tbl record;
  contador integer := 0;
BEGIN
  RAISE NOTICE '🔓 === DESABILITANDO RLS EM TODAS AS TABELAS ===';

  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    contador := contador + 1;
    RAISE NOTICE '✅ [%] RLS desabilitado: %', contador, tbl.tablename;
  END LOOP;

  RAISE NOTICE '🎯 TOTAL: % tabelas processadas', contador;
END $$;

-- =====================================================
-- PARTE 3: DELETAR FUNÇÕES DE PERMISSÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  === DELETANDO FUNÇÕES DE PERMISSÃO ===';

  -- has_permission (todas as variações)
  DROP FUNCTION IF EXISTS has_permission(text, text, text) CASCADE;
  DROP FUNCTION IF EXISTS has_permission(uuid, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.has_permission CASCADE;
  RAISE NOTICE '✅ has_permission() removida';

  -- can_access_transaction
  DROP FUNCTION IF EXISTS can_access_transaction(text, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.can_access_transaction CASCADE;
  RAISE NOTICE '✅ can_access_transaction() removida';

  -- get_user_permissions
  DROP FUNCTION IF EXISTS get_user_permissions(text) CASCADE;
  DROP FUNCTION IF EXISTS public.get_user_permissions CASCADE;
  RAISE NOTICE '✅ get_user_permissions() removida';

  RAISE NOTICE '🎯 Todas as funções de permissão deletadas';
END $$;

-- =====================================================
-- PARTE 4: REMOVER TRIGGERS RELACIONADOS A PERMISSÕES
-- =====================================================

DO $$
DECLARE
  trig record;
  contador integer := 0;
BEGIN
  RAISE NOTICE '🗑️  === REMOVENDO TRIGGERS DE PERMISSÃO ===';

  FOR trig IN
    SELECT
      t.tgname as trigger_name,
      c.relname as table_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relnamespace = 'public'::regnamespace
      AND t.tgname NOT LIKE 'RI_%'
      AND (
        t.tgname ILIKE '%permission%'
        OR t.tgname ILIKE '%rls%'
        OR t.tgname ILIKE '%filter%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE',
      trig.trigger_name, trig.table_name);
    contador := contador + 1;
    RAISE NOTICE '✅ [%] Trigger removido: % (tabela: %)',
      contador, trig.trigger_name, trig.table_name;
  END LOOP;

  IF contador = 0 THEN
    RAISE NOTICE '✅ Nenhum trigger de permissão encontrado';
  ELSE
    RAISE NOTICE '🎯 TOTAL: % triggers removidos', contador;
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL COMPLETA
-- =====================================================

SELECT '════════════════════════════════════════' as info;
SELECT '📊 VERIFICAÇÃO FINAL' as info;
SELECT '════════════════════════════════════════' as info;

-- 1. Políticas RLS restantes
SELECT
  COUNT(*) as politicas_rls,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ ZERO políticas'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' políticas!'
  END as status
FROM pg_policies
WHERE schemaname = 'public';

-- 2. Tabelas com RLS ativo
SELECT
  COUNT(*) as tabelas_com_rls,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ ZERO tabelas com RLS'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' tabelas!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- 3. Funções de permissão
SELECT
  COUNT(*) as funcoes_permissao,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ ZERO funções'
    ELSE '❌ AINDA HÁ ' || COUNT(*) || ' funções!'
  END as status
FROM pg_proc
WHERE proname IN ('has_permission', 'can_access_transaction', 'get_user_permissions');

-- 4. Contagem de registros (deve ver TUDO)
SELECT
  'transactions' as tabela,
  COUNT(*) as registros_visiveis,
  CASE
    WHEN COUNT(*) > 100000 THEN '✅ Vendo TUDO (125k+)'
    WHEN COUNT(*) > 50000 THEN '⚠️ Vendo parte (50k-100k)'
    ELSE '❌ Ainda filtrado (< 50k)'
  END as diagnostico
FROM transactions;

-- 5. Status de cada tabela
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '❌ RLS ATIVO'
    ELSE '✅ RLS OFF'
  END as rls_status,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
  ) as politicas
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ 0 políticas RLS
-- ✅ 0 tabelas com RLS ativo
-- ✅ 0 funções de permissão
-- ✅ 125.631 registros visíveis
-- ✅ TODAS as tabelas: RLS OFF, 0 políticas
-- =====================================================
