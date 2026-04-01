-- ═══════════════════════════════════════════════════════════════
-- DESATIVAR RLS TEMPORARIAMENTE (APENAS PARA DESENVOLVIMENTO)
-- ⚠️ NÃO USE EM PRODUÇÃO!
-- ═══════════════════════════════════════════════════════════════

-- Desativar RLS na tabela transactions
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Desativar RLS na tabela manual_changes (se existir)
ALTER TABLE manual_changes DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT
  '⚠️ STATUS DO RLS' as aviso,
  tablename,
  CASE
    WHEN rowsecurity THEN '🔒 ATIVO (seguro)'
    ELSE '🔓 INATIVO (todos veem tudo!)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'manual_changes')
ORDER BY tablename;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '⚠️  RLS DESATIVADO!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora QUALQUER usuário pode ver TODOS os dados!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ VANTAGEM:';
  RAISE NOTICE '  • Não precisa fazer login';
  RAISE NOTICE '  • Não precisa configurar permissões';
  RAISE NOTICE '  • Útil para desenvolvimento/testes';
  RAISE NOTICE '';
  RAISE NOTICE '❌ DESVANTAGEM:';
  RAISE NOTICE '  • SEM SEGURANÇA!';
  RAISE NOTICE '  • Todos veem dados de todas as marcas/filiais';
  RAISE NOTICE '  • NÃO usar em produção!';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 PARA REATIVAR:';
  RAISE NOTICE '  Execute: ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;';
  RAISE NOTICE '';
END $$;
