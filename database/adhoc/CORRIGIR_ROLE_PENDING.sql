-- ============================================
-- CORREÇÃO: Adicionar 'pending' aos valores permitidos de role
-- ============================================

-- PASSO 1: Remover o constraint antigo
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

-- PASSO 2: Criar novo constraint incluindo 'pending'
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'manager', 'viewer', 'pending'));

-- PASSO 3: Verificar se foi criado corretamente
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- Resultado esperado:
-- constraint_name   | check_clause
-- users_role_check  | (role = ANY (ARRAY['admin'::text, 'manager'::text, 'viewer'::text, 'pending'::text]))
