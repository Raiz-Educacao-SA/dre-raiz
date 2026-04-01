-- Execute este SQL no Supabase para verificar os usuários

-- Ver todos os usuários e suas roles
SELECT
  email,
  name,
  role,
  created_at,
  last_login
FROM users
ORDER BY created_at DESC;

-- Contar usuários por role
SELECT
  role,
  COUNT(*) as total
FROM users
GROUP BY role;

-- Ver apenas usuários pending
SELECT
  email,
  name,
  role,
  created_at
FROM users
WHERE role = 'pending'
ORDER BY created_at DESC;
