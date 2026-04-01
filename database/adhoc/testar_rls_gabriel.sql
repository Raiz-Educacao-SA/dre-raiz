-- ═══════════════════════════════════════════════════════════════
-- TESTE: RLS com permissões de TAG01 para Gabriel
-- ═══════════════════════════════════════════════════════════════

-- IMPORTANTE: Ajuste o email do Gabriel na linha abaixo
\set gabriel_email 'gabriel@raizeducacao.com.br'

-- PASSO 1: Ver informações do usuário Gabriel
-- ═══════════════════════════════════════════════════════════════

SELECT
  '═══ USUÁRIO GABRIEL ═══' as secao,
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = :'gabriel_email';

-- PASSO 2: Ver permissões do Gabriel
-- ═══════════════════════════════════════════════════════════════

SELECT
  '═══ PERMISSÕES DO GABRIEL ═══' as secao,
  up.permission_type,
  up.permission_value,
  up.created_at
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = :'gabriel_email'
ORDER BY up.permission_type, up.permission_value;

-- PASSO 3: Testar a função de acesso com valores permitidos
-- ═══════════════════════════════════════════════════════════════

-- Teste 1: Tag01 permitida (deve retornar TRUE)
SELECT
  '═══ TESTE 1: Tag01 = 001 (PERMITIDA) ═══' as secao,
  can_access_transaction_with_tags(
    :'gabriel_email',
    'MARCA_TESTE',
    'FILIAL_TESTE',
    '001',  -- tag01 permitida
    NULL,
    NULL
  ) as tem_acesso;

-- Teste 2: Tag01 NÃO permitida (deve retornar FALSE)
SELECT
  '═══ TESTE 2: Tag01 = 999 (NÃO PERMITIDA) ═══' as secao,
  can_access_transaction_with_tags(
    :'gabriel_email',
    'MARCA_TESTE',
    'FILIAL_TESTE',
    '999',  -- tag01 NÃO permitida
    NULL,
    NULL
  ) as tem_acesso;

-- PASSO 4: Contar transações que Gabriel deveria ver
-- ═══════════════════════════════════════════════════════════════

-- Total de transações no sistema
SELECT
  '═══ TOTAL DE TRANSAÇÕES NO SISTEMA ═══' as secao,
  COUNT(*) as total
FROM transactions;

-- Transações por tag01
SELECT
  '═══ TRANSAÇÕES POR TAG01 ═══' as secao,
  tag01,
  COUNT(*) as total
FROM transactions
GROUP BY tag01
ORDER BY tag01;

-- Transações que Gabriel deveria ver (baseado nas permissões)
WITH gabriel_permissions AS (
  SELECT up.permission_value as tag01_permitida
  FROM users u
  JOIN user_permissions up ON u.id = up.user_id
  WHERE u.email = :'gabriel_email'
    AND up.permission_type = 'tag01'
)
SELECT
  '═══ TRANSAÇÕES QUE GABRIEL PODE VER ═══' as secao,
  t.tag01,
  COUNT(*) as total
FROM transactions t
WHERE t.tag01 IN (SELECT tag01_permitida FROM gabriel_permissions)
GROUP BY t.tag01
ORDER BY t.tag01;

-- Total que Gabriel deveria ver
WITH gabriel_permissions AS (
  SELECT up.permission_value as tag01_permitida
  FROM users u
  JOIN user_permissions up ON u.id = up.user_id
  WHERE u.email = :'gabriel_email'
    AND up.permission_type = 'tag01'
)
SELECT
  '═══ TOTAL QUE GABRIEL DEVERIA VER ═══' as secao,
  COUNT(*) as total_gabriel
FROM transactions t
WHERE t.tag01 IN (SELECT tag01_permitida FROM gabriel_permissions);

-- PASSO 5: Testar consulta simulando o usuário Gabriel
-- ═══════════════════════════════════════════════════════════════

-- NOTA: Em produção, o current_setting('request.jwt.claims') seria
-- preenchido automaticamente pelo Supabase. Aqui simulamos manualmente.

-- Simular contexto do Gabriel (NÃO FUNCIONA EM TESTE LOCAL)
-- SET LOCAL request.jwt.claims = '{"email": "gabriel@raizeducacao.com.br"}';

-- Consulta que Gabriel faria
-- SELECT * FROM transactions LIMIT 10;

-- PASSO 6: Instruções de teste no painel admin
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'INSTRUÇÕES PARA TESTAR NO PAINEL ADMIN:';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '1. Faça login como Gabriel no painel';
  RAISE NOTICE '2. Vá para a página de transações/DRE';
  RAISE NOTICE '3. Verifique se ele vê apenas as transações com tag01 permitidas';
  RAISE NOTICE '4. Compare o total mostrado com o "TOTAL QUE GABRIEL DEVERIA VER" acima';
  RAISE NOTICE '';
  RAISE NOTICE 'TROUBLESHOOTING:';
  RAISE NOTICE '- Se Gabriel vê TUDO: O RLS não está sendo aplicado no frontend';
  RAISE NOTICE '- Verifique se o frontend está usando "supabase.auth.getUser()"';
  RAISE NOTICE '- Verifique se as queries usam ".select()" do Supabase Client';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAR NO CÓDIGO:';
  RAISE NOTICE '- O Supabase Client deve estar configurado com a chave ANON';
  RAISE NOTICE '- As queries devem passar pelo RLS automaticamente';
  RAISE NOTICE '- Não use "service_role" key no frontend (bypass RLS)';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- PASSO 7: Verificar configuração do Supabase Client
-- ═══════════════════════════════════════════════════════════════

SELECT
  '═══ DICAS DE VERIFICAÇÃO NO CÓDIGO ═══' as secao,
  'Verifique se o código usa:' as instrucao,
  'const { data, error } = await supabase.from("transactions").select()' as exemplo_correto;

SELECT
  '═══ ERRO COMUM ═══' as secao,
  'Usar service_role key no frontend bypassa o RLS!' as alerta,
  'Use apenas a ANON key no frontend' as solucao;
