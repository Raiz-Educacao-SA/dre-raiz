-- ═══════════════════════════════════════════════════════════════
-- LIMPEZA COMPLETA: Remover todas as políticas e funções RLS antigas
-- ═══════════════════════════════════════════════════════════════

-- PASSO 1: Remover TODAS as políticas da tabela transactions
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transactions') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', r.policyname);
    END LOOP;
END $$;

-- PASSO 2: Remover função antiga (se existir)
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS can_access_transaction_with_tags(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- PASSO 3: Desabilitar RLS temporariamente
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- LIMPEZA CONCLUÍDA
-- ═══════════════════════════════════════════════════════════════

SELECT 'Limpeza completa realizada!' as status;
SELECT 'Agora execute o script fix_rls_tag01.sql' as proximo_passo;
