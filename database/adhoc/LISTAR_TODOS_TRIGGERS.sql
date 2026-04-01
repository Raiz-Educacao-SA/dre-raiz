-- =====================================================
-- LISTAR TODOS OS TRIGGERS
-- =====================================================
-- Trigger pode estar aplicando filtros automaticamente
-- =====================================================

-- =====================================================
-- 1. LISTAR TODOS OS TRIGGERS nas tabelas
-- =====================================================

SELECT
  trigger_schema,
  trigger_name,
  event_manipulation, -- INSERT, UPDATE, DELETE, TRUNCATE
  event_object_table as tabela,
  action_timing, -- BEFORE, AFTER
  action_statement -- Código do trigger
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 2. LISTAR TRIGGERS ESPECÍFICOS em transactions
-- =====================================================

SELECT
  tgname as trigger_name,
  tgtype as tipo,
  tgenabled as ativo,
  pg_get_triggerdef(oid) as definicao_completa
FROM pg_trigger
WHERE tgrelid = 'public.transactions'::regclass
  AND tgname NOT LIKE 'RI_%' -- Ignora triggers internos de FK
ORDER BY tgname;

-- =====================================================
-- 3. VER FUNÇÕES CHAMADAS PELOS TRIGGERS
-- =====================================================

SELECT
  p.proname as funcao_trigger,
  pg_get_functiondef(p.oid) as codigo_completo
FROM pg_proc p
WHERE p.proname ILIKE '%trigger%'
  OR p.proname ILIKE '%filter%'
  OR p.proname ILIKE '%permission%'
ORDER BY p.proname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Se aparecer triggers relacionados a:
-- - filter, permission, rls, user, auth
-- Esses triggers estão aplicando filtros!
-- =====================================================
