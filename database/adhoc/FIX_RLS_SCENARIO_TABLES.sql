-- =====================================================
-- CORREÇÃO CRÍTICA: RLS nas tabelas de cenários
-- =====================================================
-- Problema: RLS pode estar bloqueando queries em
--           transactions_orcado e transactions_ano_anterior
-- Solução: Desabilitar RLS nessas tabelas (controle via app)
-- =====================================================

-- =====================================================
-- PASSO 1: VERIFICAR STATUS ATUAL
-- =====================================================

SELECT
  tablename,
  CASE WHEN rowsecurity THEN 'HABILITADO' ELSE 'DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'transactions%'
ORDER BY tablename;

-- =====================================================
-- PASSO 2: DESABILITAR RLS nas tabelas de cenários
-- =====================================================

-- Desabilitar RLS em transactions_orcado
ALTER TABLE transactions_orcado DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS em transactions_ano_anterior
ALTER TABLE transactions_ano_anterior DISABLE ROW LEVEL SECURITY;

-- MANTER RLS em transactions (tabela principal)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;  -- Manter como está

-- =====================================================
-- PASSO 3: REMOVER POLÍTICAS RLS dessas tabelas
-- =====================================================

-- Listar políticas existentes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('transactions_orcado', 'transactions_ano_anterior')
ORDER BY tablename, policyname;

-- Remover políticas (ajustar nomes conforme output acima)
-- DROP POLICY IF EXISTS "RLS SELECT transactions_orcado" ON transactions_orcado;
-- DROP POLICY IF EXISTS "RLS SELECT transactions_ano_anterior" ON transactions_ano_anterior;

-- =====================================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- =====================================================

-- Testar query nas tabelas de cenários (deve retornar dados)
SELECT COUNT(*) as total_orcado FROM transactions_orcado;
SELECT COUNT(*) as total_ano_anterior FROM transactions_ano_anterior;

-- Testar UNION (como get_dre_summary faz)
SELECT
  'transactions' as origem,
  COUNT(*) as total
FROM transactions
WHERE date >= '2026-01-01' AND date <= '2026-12-31'

UNION ALL

SELECT
  'transactions_orcado' as origem,
  COUNT(*) as total
FROM transactions_orcado
WHERE date >= '2026-01-01' AND date <= '2026-12-31'

UNION ALL

SELECT
  'transactions_ano_anterior' as origem,
  COUNT(*) as total
FROM transactions_ano_anterior
WHERE date >= '2026-01-01' AND date <= '2026-12-31';

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ RLS desabilitado em tabelas de cenários
-- ✅ Políticas removidas (se existirem)
-- ✅ UNION retorna dados de todas as 3 tabelas
-- ✅ DRE Gerencial deve carregar todos os cenários
-- =====================================================
