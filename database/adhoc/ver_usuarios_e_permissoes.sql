-- ═══════════════════════════════════════════════════════════════
-- VISUALIZAR USUÁRIOS E PERMISSÕES RLS
-- ═══════════════════════════════════════════════════════════════

-- 1. VER TODOS OS USUÁRIOS
-- ═══════════════════════════════════════════════════════════════
SELECT
  id,
  email,
  name,
  role,
  created_at,
  last_login
FROM users
ORDER BY name;

-- 2. VER TODAS AS PERMISSÕES (COM NOME DO USUÁRIO)
-- ═══════════════════════════════════════════════════════════════
SELECT
  u.name as usuario,
  u.email,
  u.role,
  up.permission_type as tipo_permissao,
  up.permission_value as valor_permitido,
  up.created_at
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
ORDER BY u.name, up.permission_type, up.permission_value;

-- 3. VER APENAS USUÁRIOS COM PERMISSÕES ESPECÍFICAS
-- ═══════════════════════════════════════════════════════════════
SELECT
  u.name as usuario,
  u.email,
  u.role,
  COUNT(up.id) as total_permissoes,
  STRING_AGG(DISTINCT up.permission_type, ', ') as tipos_permissao
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
GROUP BY u.id, u.name, u.email, u.role
HAVING COUNT(up.id) > 0
ORDER BY u.name;

-- 4. VER PERMISSÕES POR TIPO
-- ═══════════════════════════════════════════════════════════════

-- Permissões de TAG01
SELECT
  u.name as usuario,
  u.email,
  up.permission_value as tag01_permitida
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE up.permission_type = 'tag01'
ORDER BY u.name, up.permission_value;

-- Permissões de FILIAL
SELECT
  u.name as usuario,
  u.email,
  up.permission_value as filial_permitida
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE up.permission_type = 'filial'
ORDER BY u.name, up.permission_value;

-- Permissões de CIA (Marca)
SELECT
  u.name as usuario,
  u.email,
  up.permission_value as cia_permitida
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE up.permission_type = 'cia'
ORDER BY u.name, up.permission_value;

-- 5. VER ESTRUTURA DETALHADA DAS TABELAS
-- ═══════════════════════════════════════════════════════════════

-- Estrutura da tabela USERS
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Estrutura da tabela USER_PERMISSIONS
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_permissions'
ORDER BY ordinal_position;

-- 6. BUSCAR USUÁRIO ESPECÍFICO (Gabriel como exemplo)
-- ═══════════════════════════════════════════════════════════════
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'tipo', up.permission_type,
        'valor', up.permission_value
      )
    ) FILTER (WHERE up.id IS NOT NULL),
    '[]'::json
  ) as permissoes
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email ILIKE '%gabriel%' OR u.name ILIKE '%gabriel%'
GROUP BY u.id, u.email, u.name, u.role, u.created_at;
