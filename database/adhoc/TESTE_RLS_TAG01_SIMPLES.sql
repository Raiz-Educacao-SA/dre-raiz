-- ════════════════════════════════════════════════════════════════════════
-- TESTE SIMPLES: VALIDAR PERMISSÕES DE TAG01
-- ════════════════════════════════════════════════════════════════════════
-- Execute este script no SQL Editor do Supabase para criar um usuário
-- de teste com permissão APENAS para tag01 = "Marketing"
-- ════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 1: Criar usuário de teste
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO users (id, email, name, role, created_at)
VALUES (
  gen_random_uuid(),
  'teste.marketing@raizeducacao.com.br',
  'Teste Marketing',
  'viewer',
  NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 2: Obter ID do usuário criado
-- ═══════════════════════════════════════════════════════════════════════

SELECT id, email, name, role
FROM users
WHERE email = 'teste.marketing@raizeducacao.com.br';

-- ⚠️ COPIAR O ID RETORNADO E SUBSTITUIR 'USER_ID_AQUI' ABAIXO

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 3: Criar permissão de tag01 = "Marketing"
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO user_permissions (id, user_id, permission_type, permission_value, created_at)
VALUES (
  gen_random_uuid(),
  'USER_ID_AQUI',  -- ⚠️ SUBSTITUIR PELO ID DO USUÁRIO
  'tag01',
  'Marketing',
  NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 4: VALIDAR - Verificar permissões criadas
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
  u.email,
  u.name,
  u.role,
  up.permission_type,
  up.permission_value
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'teste.marketing@raizeducacao.com.br';

-- Resultado esperado:
-- email: teste.marketing@raizeducacao.com.br
-- name: Teste Marketing
-- role: viewer
-- permission_type: tag01
-- permission_value: Marketing

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 5: TESTE - Verificar quais tag01 existem no banco
-- ═══════════════════════════════════════════════════════════════════════

SELECT DISTINCT tag01, COUNT(*) as total_transacoes
FROM transactions
WHERE tag01 IS NOT NULL
  AND date >= '2026-01-01'
  AND date <= '2026-12-31'
GROUP BY tag01
ORDER BY total_transacoes DESC
LIMIT 20;

-- Resultado esperado:
-- Lista de todas as tag01 disponíveis e quantas transações cada uma tem
-- Ex:
-- Marketing | 2500
-- Vendas    | 3200
-- Operações | 1800
-- ...

-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 6: LIMPAR - Remover usuário de teste (após validação)
-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ EXECUTAR SOMENTE DEPOIS DE CONCLUIR OS TESTES!

-- Deletar permissões
DELETE FROM user_permissions
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'teste.marketing@raizeducacao.com.br'
);

-- Deletar usuário
DELETE FROM users
WHERE email = 'teste.marketing@raizeducacao.com.br';

-- Validar exclusão
SELECT * FROM users WHERE email = 'teste.marketing@raizeducacao.com.br';
-- (deve retornar 0 linhas)

-- ════════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ════════════════════════════════════════════════════════════════════════
