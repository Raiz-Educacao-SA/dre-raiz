-- ═══════════════════════════════════════════════════════════════
-- CORREÇÃO: Política RLS - Erro de coluna email
-- ═══════════════════════════════════════════════════════════════

-- O problema: A política RLS está tentando usar email do JWT mas isso causa erro
-- Solução: Desabilitar RLS temporariamente até configurar autenticação corretamente

-- ═══════════════════════════════════════════════════════════════
-- OPÇÃO 1: DESABILITAR RLS (TEMPORÁRIO - PARA DESENVOLVIMENTO)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Remover políticas que causam erro
DROP POLICY IF EXISTS "RLS: Users read with permissions filter" ON transactions;
DROP POLICY IF EXISTS "RLS: Managers and admins insert" ON transactions;
DROP POLICY IF EXISTS "RLS: Managers and admins update" ON transactions;
DROP POLICY IF EXISTS "RLS: Only admins delete" ON transactions;

-- Criar políticas simples e públicas para desenvolvimento
CREATE POLICY "Allow all for development" ON transactions
  FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════

SELECT
  'Status RLS:' as info,
  tablename,
  CASE rowsecurity
    WHEN true THEN '🔒 HABILITADO'
    ELSE '✅ DESABILITADO (modo desenvolvimento)'
  END as status
FROM pg_tables
WHERE tablename = 'transactions';

-- Ver políticas ativas
SELECT
  'Políticas ativas:' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'transactions';

-- ═══════════════════════════════════════════════════════════════
-- MENSAGEM
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS DESABILITADO PARA DESENVOLVIMENTO';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- O painel agora vai carregar dados normalmente';
  RAISE NOTICE '- Todos os usuários verão todos os dados (sem filtro)';
  RAISE NOTICE '- Isso é temporário para desenvolvimento';
  RAISE NOTICE '';
  RAISE NOTICE 'Para ativar RLS novamente no futuro:';
  RAISE NOTICE '- Configure autenticação Firebase/Supabase Auth no frontend';
  RAISE NOTICE '- Execute script que habilita RLS com autenticação correta';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
