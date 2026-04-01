-- ═══════════════════════════════════════════════════════════════
-- VALIDAÇÃO: Verificar se RLS está funcionando para Gabriel
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. VERIFICAR USUÁRIO GABRIEL
-- ═══════════════════════════════════════════════════════════════

SELECT
  '👤 USUÁRIO GABRIEL:' as info,
  id,
  email,
  name,
  role
FROM users
WHERE email = 'gabriel.araujo@raizeducacao.com.br';

-- ═══════════════════════════════════════════════════════════════
-- 2. VERIFICAR PERMISSÕES DO GABRIEL
-- ═══════════════════════════════════════════════════════════════

SELECT
  '🔐 PERMISSÕES DO GABRIEL:' as info,
  up.permission_type as tipo,
  up.permission_value as valor,
  up.created_at as criado_em
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'gabriel.araujo@raizeducacao.com.br'
ORDER BY up.permission_type, up.permission_value;

-- ═══════════════════════════════════════════════════════════════
-- 3. VERIFICAR SE A FUNÇÃO RLS EXISTE
-- ═══════════════════════════════════════════════════════════════

SELECT
  '⚙️ FUNÇÃO RLS:' as info,
  proname as nome_funcao,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'can_access_transaction_with_tags';

-- ═══════════════════════════════════════════════════════════════
-- 4. VERIFICAR POLÍTICAS RLS ATIVAS
-- ═══════════════════════════════════════════════════════════════

SELECT
  '🛡️ POLÍTICAS RLS ATIVAS:' as info,
  policyname as politica,
  cmd as comando,
  CASE
    WHEN qual::text LIKE '%can_access_transaction_with_tags%' THEN '✅ Usa filtro RLS'
    WHEN qual::text = 'true' THEN '❌ Acesso público (TRUE)'
    ELSE '⚠️ Outro filtro'
  END as status
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════
-- 5. TESTAR FUNÇÃO RLS MANUALMENTE
-- ═══════════════════════════════════════════════════════════════

-- Teste 1: Tag permitida (deve retornar TRUE)
SELECT
  '🧪 TESTE 1 - Tag RECEITAS (permitida):' as info,
  can_access_transaction_with_tags(
    'gabriel.araujo@raizeducacao.com.br',
    'MARCA_TESTE',
    'FILIAL_TESTE',
    'RECEITAS',
    NULL,
    NULL
  ) as tem_acesso;

-- Teste 2: Tag permitida (deve retornar TRUE)
SELECT
  '🧪 TESTE 2 - Tag VENDAS (permitida):' as info,
  can_access_transaction_with_tags(
    'gabriel.araujo@raizeducacao.com.br',
    'MARCA_TESTE',
    'FILIAL_TESTE',
    'VENDAS',
    NULL,
    NULL
  ) as tem_acesso;

-- Teste 3: Tag NÃO permitida (deve retornar FALSE)
SELECT
  '🧪 TESTE 3 - Tag OUTRA (NÃO permitida):' as info,
  can_access_transaction_with_tags(
    'gabriel.araujo@raizeducacao.com.br',
    'MARCA_TESTE',
    'FILIAL_TESTE',
    'ADMINISTRATIVA',
    NULL,
    NULL
  ) as tem_acesso;

-- ═══════════════════════════════════════════════════════════════
-- 6. CONTAR TRANSAÇÕES POR TAG01
-- ═══════════════════════════════════════════════════════════════

SELECT
  '📊 TOTAL DE TRANSAÇÕES POR TAG01:' as info,
  tag01,
  COUNT(*) as total,
  CASE
    WHEN tag01 IN (
      SELECT permission_value
      FROM user_permissions up
      JOIN users u ON u.id = up.user_id
      WHERE u.email = 'gabriel.araujo@raizeducacao.com.br'
      AND permission_type = 'tag01'
    ) THEN '✅ Gabriel pode ver'
    ELSE '❌ Gabriel NÃO pode ver'
  END as acesso_gabriel
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY total DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- 7. TOTAIS: Sistema vs Gabriel
-- ═══════════════════════════════════════════════════════════════

WITH gabriel_tags AS (
  SELECT permission_value
  FROM user_permissions up
  JOIN users u ON u.id = up.user_id
  WHERE u.email = 'gabriel.araujo@raizeducacao.com.br'
  AND permission_type = 'tag01'
)
SELECT
  '📈 COMPARAÇÃO:' as info,
  (SELECT COUNT(*) FROM transactions) as total_sistema,
  (SELECT COUNT(*) FROM transactions WHERE tag01 IN (SELECT * FROM gabriel_tags)) as total_gabriel,
  ROUND(
    (SELECT COUNT(*) FROM transactions WHERE tag01 IN (SELECT * FROM gabriel_tags))::numeric /
    (SELECT COUNT(*) FROM transactions)::numeric * 100,
    2
  ) as percentual_gabriel
;

-- ═══════════════════════════════════════════════════════════════
-- 8. VERIFICAR SE RLS ESTÁ HABILITADO
-- ═══════════════════════════════════════════════════════════════

SELECT
  '🔒 STATUS RLS:' as info,
  tablename as tabela,
  CASE rowsecurity
    WHEN true THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESABILITADO'
  END as status
FROM pg_tables
WHERE tablename = 'transactions';

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📋 VALIDAÇÃO COMPLETA!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifique os resultados acima:';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Se TESTE 1 e 2 retornaram TRUE = Função OK';
  RAISE NOTICE '✅ Se TESTE 3 retornou FALSE = Filtro funcionando!';
  RAISE NOTICE '✅ Se políticas mostram "Usa filtro RLS" = RLS ativo';
  RAISE NOTICE '✅ Se total_gabriel < total_sistema = Filtro aplicado';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMO PASSO:';
  RAISE NOTICE 'Teste no painel com o usuário Gabriel!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
