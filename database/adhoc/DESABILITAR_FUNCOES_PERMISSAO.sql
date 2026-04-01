-- =====================================================
-- DESABILITAR TEMPORARIAMENTE FUNÇÕES DE PERMISSÃO
-- =====================================================
-- Faz as funções retornarem "SEM FILTRO"
-- =====================================================

-- =====================================================
-- BACKUP: Salvar funções originais primeiro
-- =====================================================

-- Copiar código original de get_user_permissions
SELECT pg_get_functiondef(oid) as codigo_original_get_user_permissions
FROM pg_proc
WHERE proname = 'get_user_permissions';

-- Copiar código original de has_permission
SELECT pg_get_functiondef(oid) as codigo_original_has_permission
FROM pg_proc
WHERE proname = 'has_permission';

-- ⚠️ SALVE O RESULTADO ACIMA EM UM ARQUIVO!

-- =====================================================
-- OPÇÃO 1: Modificar get_user_permissions (retorna tudo)
-- =====================================================

-- Descobrir assinatura da função
SELECT
  proname,
  pg_get_function_arguments(oid) as argumentos,
  pg_get_function_result(oid) as retorno
FROM pg_proc
WHERE proname = 'get_user_permissions';

-- ⚠️ Ajustar comando abaixo conforme assinatura acima

-- Exemplo (ajustar conforme necessário):
CREATE OR REPLACE FUNCTION get_user_permissions(permission_type text)
RETURNS text[]
LANGUAGE sql STABLE
AS $$
  -- Retorna array vazio = SEM FILTRO (permite tudo)
  SELECT ARRAY[]::text[];
$$;

COMMENT ON FUNCTION get_user_permissions IS 'TEMPORÁRIO - Desabilitado para teste';

-- =====================================================
-- OPÇÃO 2: Modificar has_permission (retorna sempre true)
-- =====================================================

-- Descobrir assinatura
SELECT
  proname,
  pg_get_function_arguments(oid) as argumentos,
  pg_get_function_result(oid) as retorno
FROM pg_proc
WHERE proname = 'has_permission';

-- ⚠️ Ajustar comando abaixo conforme assinatura acima

-- Exemplo (ajustar conforme necessário):
CREATE OR REPLACE FUNCTION has_permission(p_user_id uuid, p_type text, p_value text)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  -- Retorna sempre TRUE = permite tudo
  SELECT true;
$$;

COMMENT ON FUNCTION has_permission IS 'TEMPORÁRIO - Desabilitado para teste';

-- =====================================================
-- VERIFICAR que funções foram modificadas
-- =====================================================

SELECT
  proname,
  pg_get_functiondef(oid) as nova_definicao
FROM pg_proc
WHERE proname IN ('get_user_permissions', 'has_permission')
ORDER BY proname;

-- Deve mostrar código simples (retorna array vazio ou true)

-- =====================================================
-- AGORA TESTE NO NAVEGADOR:
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como USUÁRIO NORMAL
-- 3. Abrir DRE Gerencial
-- 4. Verificar se vê TODOS os dados
--
-- ✅ Se vê tudo: Essas funções eram o problema!
-- ❌ Se ainda filtra: Há outro filtro (código frontend?)
-- =====================================================

-- =====================================================
-- PARA REVERTER: Executar código original salvo no BACKUP
-- =====================================================
