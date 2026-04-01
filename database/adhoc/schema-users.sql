-- SCHEMA: Sistema de Usuários e Permissões - DRE RAIZ

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Tabela de Permissões
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('centro_custo', 'cia', 'filial')),
  permission_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_type, permission_value)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_type ON user_permissions(permission_type);

-- Adicionar colunas de auditoria em manual_changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_changes' AND column_name = 'requested_by_email'
  ) THEN
    ALTER TABLE manual_changes ADD COLUMN requested_by_email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_changes' AND column_name = 'approved_by_email'
  ) THEN
    ALTER TABLE manual_changes ADD COLUMN approved_by_email TEXT;
  END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Inserir admin inicial
INSERT INTO users (email, name, role)
VALUES (
  'edmilson.serafim@raizeducacao.com.br',
  'Edmilson Serafim',
  'admin'
)
ON CONFLICT (email)
DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (temporárias - públicas)
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON users;
CREATE POLICY "Enable update for all users" ON users
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON user_permissions;
CREATE POLICY "Enable read access for all users" ON user_permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON user_permissions;
CREATE POLICY "Enable insert for all users" ON user_permissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON user_permissions;
CREATE POLICY "Enable update for all users" ON user_permissions
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON user_permissions;
CREATE POLICY "Enable delete for all users" ON user_permissions
  FOR DELETE USING (true);

-- View útil: usuários com suas permissões
CREATE OR REPLACE VIEW users_with_permissions AS
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  u.last_login,
  COALESCE(
    json_agg(
      json_build_object(
        'type', up.permission_type,
        'value', up.permission_value
      )
    ) FILTER (WHERE up.id IS NOT NULL),
    '[]'::json
  ) as permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
GROUP BY u.id, u.email, u.name, u.role, u.created_at, u.last_login;
