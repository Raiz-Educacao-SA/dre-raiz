-- ═══════════════════════════════════════════════════════════════
-- APLICAR RLS NAS TABELAS DE CENÁRIOS
-- ═══════════════════════════════════════════════════════════════
-- Data: 11/02/2026
-- Objetivo: Aplicar os mesmos filtros de RLS que existem em
--           transactions nas tabelas transactions_orcado e
--           transactions_ano_anterior
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PASSO 1: Adicionar campo nome_filial (se não existir)
-- ═══════════════════════════════════════════════════════════════

-- Adicionar em transactions_orcado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions_orcado'
    AND column_name = 'nome_filial'
  ) THEN
    ALTER TABLE transactions_orcado ADD COLUMN nome_filial TEXT;
    COMMENT ON COLUMN transactions_orcado.nome_filial IS 'Nome completo da filial (ex: CLV - Alfa)';
  END IF;
END $$;

-- Adicionar em transactions_ano_anterior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions_ano_anterior'
    AND column_name = 'nome_filial'
  ) THEN
    ALTER TABLE transactions_ano_anterior ADD COLUMN nome_filial TEXT;
    COMMENT ON COLUMN transactions_ano_anterior.nome_filial IS 'Nome completo da filial (ex: CLV - Alfa)';
  END IF;
END $$;

-- Criar índices para nome_filial
CREATE INDEX IF NOT EXISTS idx_transactions_orcado_nome_filial
  ON transactions_orcado(nome_filial);

CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_nome_filial
  ON transactions_ano_anterior(nome_filial);

-- Criar índices para tag01, tag02, tag03 (se não existirem)
CREATE INDEX IF NOT EXISTS idx_transactions_orcado_tag01
  ON transactions_orcado(tag01);
CREATE INDEX IF NOT EXISTS idx_transactions_orcado_tag02
  ON transactions_orcado(tag02);
CREATE INDEX IF NOT EXISTS idx_transactions_orcado_tag03
  ON transactions_orcado(tag03);

CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_tag01
  ON transactions_ano_anterior(tag01);
CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_tag02
  ON transactions_ano_anterior(tag02);
CREATE INDEX IF NOT EXISTS idx_transactions_ano_anterior_tag03
  ON transactions_ano_anterior(tag03);

-- ═══════════════════════════════════════════════════════════════
-- PASSO 2: Função auxiliar para buscar permissões do usuário
-- ═══════════════════════════════════════════════════════════════

-- Função: get_user_permissions
-- Retorna as permissões do usuário atual baseado no email da sessão
CREATE OR REPLACE FUNCTION get_user_permissions(permission_type TEXT)
RETURNS TEXT[] AS $$
DECLARE
  user_email TEXT;
  user_id_var UUID;
  permissions TEXT[];
BEGIN
  -- Obter email do usuário autenticado
  user_email := current_setting('request.jwt.claims', true)::json->>'email';

  IF user_email IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Buscar ID do usuário
  SELECT id INTO user_id_var
  FROM users
  WHERE email = user_email;

  IF user_id_var IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Buscar permissões do tipo especificado
  SELECT ARRAY_AGG(permission_value)
  INTO permissions
  FROM user_permissions
  WHERE user_id = user_id_var
    AND permission_type = $1;

  RETURN COALESCE(permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- PASSO 3: Remover políticas antigas (permissivas)
-- ═══════════════════════════════════════════════════════════════

-- transactions_orcado
DROP POLICY IF EXISTS "Allow SELECT for all users" ON transactions_orcado;
DROP POLICY IF EXISTS "Allow INSERT for all users" ON transactions_orcado;
DROP POLICY IF EXISTS "Allow UPDATE for all users" ON transactions_orcado;
DROP POLICY IF EXISTS "Allow DELETE for all users" ON transactions_orcado;
DROP POLICY IF EXISTS "Permitir SELECT para usuários autenticados" ON transactions_orcado;
DROP POLICY IF EXISTS "Permitir INSERT para usuários autenticados" ON transactions_orcado;
DROP POLICY IF EXISTS "Permitir UPDATE para usuários autenticados" ON transactions_orcado;
DROP POLICY IF EXISTS "Permitir DELETE para usuários autenticados" ON transactions_orcado;

-- transactions_ano_anterior
DROP POLICY IF EXISTS "Allow SELECT for all users" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Allow INSERT for all users" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Allow UPDATE for all users" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Allow DELETE for all users" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Permitir SELECT para usuários autenticados" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Permitir INSERT para usuários autenticados" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Permitir UPDATE para usuários autenticados" ON transactions_ano_anterior;
DROP POLICY IF EXISTS "Permitir DELETE para usuários autenticados" ON transactions_ano_anterior;

-- ═══════════════════════════════════════════════════════════════
-- PASSO 4: Habilitar RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE transactions_orcado ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_ano_anterior ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- PASSO 5: Criar políticas RLS RESTRITAS
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ TRANSACTIONS_ORCADO - Políticas com filtros de permissão   │
-- └─────────────────────────────────────────────────────────────┘

-- SELECT: Filtrar por marca, nome_filial, tag01, tag02, tag03
CREATE POLICY "RLS SELECT transactions_orcado"
ON transactions_orcado
FOR SELECT
USING (
  -- Sem permissões definidas = ver tudo
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email') = 0
  )
  OR
  -- Filtro por MARCA (CIA)
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'cia') = 0
    OR
    marca = ANY(get_user_permissions('cia'))
  )
  AND
  -- Filtro por FILIAL (nome_filial)
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'filial') = 0
    OR
    nome_filial = ANY(get_user_permissions('filial'))
  )
  AND
  -- Filtro por TAG01
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag01') = 0
    OR
    tag01 = ANY(get_user_permissions('tag01'))
  )
  AND
  -- Filtro por TAG02
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag02') = 0
    OR
    tag02 = ANY(get_user_permissions('tag02'))
  )
  AND
  -- Filtro por TAG03
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag03') = 0
    OR
    tag03 = ANY(get_user_permissions('tag03'))
  )
);

-- INSERT: Permitir para usuários autenticados
CREATE POLICY "RLS INSERT transactions_orcado"
ON transactions_orcado
FOR INSERT
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- UPDATE: Permitir para usuários autenticados
CREATE POLICY "RLS UPDATE transactions_orcado"
ON transactions_orcado
FOR UPDATE
USING (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- DELETE: Permitir para usuários autenticados
CREATE POLICY "RLS DELETE transactions_orcado"
ON transactions_orcado
FOR DELETE
USING (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- ┌─────────────────────────────────────────────────────────────┐
-- │ TRANSACTIONS_ANO_ANTERIOR - Mesmas políticas                │
-- └─────────────────────────────────────────────────────────────┘

-- SELECT: Filtrar por marca, nome_filial, tag01, tag02, tag03
CREATE POLICY "RLS SELECT transactions_ano_anterior"
ON transactions_ano_anterior
FOR SELECT
USING (
  -- Sem permissões definidas = ver tudo
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email') = 0
  )
  OR
  -- Filtro por MARCA (CIA)
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'cia') = 0
    OR
    marca = ANY(get_user_permissions('cia'))
  )
  AND
  -- Filtro por FILIAL (nome_filial)
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'filial') = 0
    OR
    nome_filial = ANY(get_user_permissions('filial'))
  )
  AND
  -- Filtro por TAG01
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag01') = 0
    OR
    tag01 = ANY(get_user_permissions('tag01'))
  )
  AND
  -- Filtro por TAG02
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag02') = 0
    OR
    tag02 = ANY(get_user_permissions('tag02'))
  )
  AND
  -- Filtro por TAG03
  (
    (SELECT COUNT(*) FROM user_permissions up
     JOIN users u ON up.user_id = u.id
     WHERE u.email = current_setting('request.jwt.claims', true)::json->>'email'
     AND up.permission_type = 'tag03') = 0
    OR
    tag03 = ANY(get_user_permissions('tag03'))
  )
);

-- INSERT: Permitir para usuários autenticados
CREATE POLICY "RLS INSERT transactions_ano_anterior"
ON transactions_ano_anterior
FOR INSERT
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- UPDATE: Permitir para usuários autenticados
CREATE POLICY "RLS UPDATE transactions_ano_anterior"
ON transactions_ano_anterior
FOR UPDATE
USING (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- DELETE: Permitir para usuários autenticados
CREATE POLICY "RLS DELETE transactions_ano_anterior"
ON transactions_ano_anterior
FOR DELETE
USING (
  current_setting('request.jwt.claims', true)::json->>'email' IS NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- PASSO 6: Verificar políticas criadas
-- ═══════════════════════════════════════════════════════════════

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  LEFT(qual::text, 50) as qual_preview
FROM pg_policies
WHERE tablename IN ('transactions_orcado', 'transactions_ano_anterior')
ORDER BY tablename, cmd;

-- Verificar se RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('transactions_orcado', 'transactions_ano_anterior');

-- ═══════════════════════════════════════════════════════════════
-- PASSO 7: Teste básico
-- ═══════════════════════════════════════════════════════════════

-- Ver total de registros em cada tabela
SELECT 'transactions_orcado' as tabela, COUNT(*) as total
FROM transactions_orcado
UNION ALL
SELECT 'transactions_ano_anterior' as tabela, COUNT(*) as total
FROM transactions_ano_anterior;

-- Ver marcas/filiais/tags disponíveis
SELECT 'transactions_orcado' as tabela,
       COUNT(DISTINCT marca) as marcas,
       COUNT(DISTINCT nome_filial) as nome_filiais,
       COUNT(DISTINCT filial) as filiais,
       COUNT(DISTINCT tag01) as tag01s
FROM transactions_orcado
UNION ALL
SELECT 'transactions_ano_anterior' as tabela,
       COUNT(DISTINCT marca) as marcas,
       COUNT(DISTINCT nome_filial) as nome_filiais,
       COUNT(DISTINCT filial) as filiais,
       COUNT(DISTINCT tag01) as tag01s
FROM transactions_ano_anterior;

-- ═══════════════════════════════════════════════════════════════
-- CONCLUÍDO ✅
-- ═══════════════════════════════════════════════════════════════
--
-- Execute este script no SQL Editor do Supabase.
--
-- As tabelas transactions_orcado e transactions_ano_anterior agora:
-- ✅ Têm o campo nome_filial
-- ✅ Filtram por marca, nome_filial, tag01, tag02, tag03
-- ✅ Aplicam as mesmas regras de RLS que transactions
--
-- ═══════════════════════════════════════════════════════════════
