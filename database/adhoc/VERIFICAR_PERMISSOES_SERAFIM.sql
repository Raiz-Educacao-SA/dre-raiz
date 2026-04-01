-- ═══════════════════════════════════════════════════════════════
-- VERIFICAR PERMISSÕES DO USUÁRIO: serafim.edmilson@gmail.com
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Ver dados do usuário
SELECT
  '🔍 USUÁRIO SERAFIM:' as info,
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = 'serafim.edmilson@gmail.com';

-- 2. Ver permissões atuais
SELECT
  '🔒 PERMISSÕES ATUAIS:' as info,
  up.permission_type,
  up.permission_value,
  up.created_at
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
ORDER BY up.permission_type, up.permission_value;

-- 3. Contar quantas permissões de cada tipo
SELECT
  '📊 RESUMO DE PERMISSÕES:' as info,
  up.permission_type,
  COUNT(*) as total
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'serafim.edmilson@gmail.com'
GROUP BY up.permission_type
ORDER BY up.permission_type;

-- 4. Ver valores únicos de TAG01 no banco
SELECT
  '🏷️ VALORES DE TAG01 DISPONÍVEIS:' as info,
  tag01,
  COUNT(*) as total_transacoes
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY total_transacoes DESC
LIMIT 20;

-- 5. Ver valores únicos de MARCA (CIA) no banco
SELECT
  '🏢 VALORES DE MARCA (CIA) DISPONÍVEIS:' as info,
  marca,
  COUNT(*) as total_transacoes
FROM transactions
WHERE marca IS NOT NULL
GROUP BY marca
ORDER BY total_transacoes DESC;

-- 6. Ver valores únicos de FILIAL no banco
SELECT
  '🏪 VALORES DE FILIAL DISPONÍVEIS:' as info,
  filial,
  nome_filial,
  COUNT(*) as total_transacoes
FROM transactions
WHERE filial IS NOT NULL
GROUP BY filial, nome_filial
ORDER BY total_transacoes DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICAÇÃO CONCLUÍDA!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Analise os resultados acima para ver:';
  RAISE NOTICE '1. Dados do usuário Serafim';
  RAISE NOTICE '2. Permissões atuais dele';
  RAISE NOTICE '3. Valores disponíveis de TAG01, MARCA e FILIAL';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMO PASSO:';
  RAISE NOTICE 'Se precisar adicionar/remover permissões, me avise!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
