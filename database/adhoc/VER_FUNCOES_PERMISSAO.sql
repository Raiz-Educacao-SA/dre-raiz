-- =====================================================
-- VER CÓDIGO DAS FUNÇÕES DE PERMISSÃO
-- =====================================================

-- =====================================================
-- 1. Ver código de get_user_permissions
-- =====================================================

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_permissions';

-- =====================================================
-- 2. Ver código de has_permission
-- =====================================================

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'has_permission';

-- =====================================================
-- 3. Ver onde essas funções são usadas
-- =====================================================

-- Procurar em políticas RLS (se ainda houver)
SELECT
  tablename,
  policyname,
  qual::text as condicao
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%get_user_permissions%'
    OR qual::text ILIKE '%has_permission%'
  );

-- =====================================================
-- 4. Ver se get_dre_summary usa essas funções
-- =====================================================

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_dre_summary';

-- Procurar por "permission" no código
-- Se aparecer = função aplica filtros internamente!

-- =====================================================
-- 5. Verificar triggers ativos
-- =====================================================

SELECT
  t.tgname as trigger_name,
  c.relname as tabela,
  p.proname as funcao_chamada,
  t.tgenabled as ativo
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND t.tgname NOT LIKE 'RI_%'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Se get_dre_summary chama get_user_permissions
-- = Filtros aplicados DENTRO da função RPC!
-- Solução: Modificar get_dre_summary para não filtrar
-- =====================================================
