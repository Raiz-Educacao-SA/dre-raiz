-- =====================================================
-- DESABILITAR RLS EM TODAS AS TABELAS (TESTE)
-- =====================================================
-- ⚠️ ATENÇÃO: Remove TODAS as restrições!
-- ⚠️ Executar apenas para TESTE
-- ⚠️ REABILITAR depois do teste
-- =====================================================

-- =====================================================
-- DESABILITAR RLS em TODAS as tabelas relacionadas
-- =====================================================

-- Tabela principal
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Tabelas de cenários
ALTER TABLE transactions_orcado DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_ano_anterior DISABLE ROW LEVEL SECURITY;

-- Tabelas de controle (se existirem)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tag0_map DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS filiais DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAR STATUS DE TODAS
-- =====================================================

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '🔴 AINDA ATIVO' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions',
    'tag0_map',
    'filiais'
  )
ORDER BY tablename;

-- ✅ TODAS devem mostrar: DESABILITADO

-- =====================================================
-- VERIFICAR SE AINDA HÁ POLÍTICAS ATIVAS
-- =====================================================

SELECT
  tablename,
  policyname,
  'ATIVA' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'transactions_orcado',
    'transactions_ano_anterior',
    'users',
    'permissions'
  )
ORDER BY tablename, policyname;

-- Se aparecer QUALQUER política aqui, significa que
-- mesmo com DISABLE, as políticas ainda existem
-- (PostgreSQL mantém as políticas, só não as aplica)

-- =====================================================
-- AGORA TESTE NO NAVEGADOR:
-- =====================================================
-- 1. Hard Refresh (Ctrl+Shift+R)
-- 2. Login como USUÁRIO NORMAL (não admin)
-- 3. Abrir DRE Gerencial
-- 4. Ver se consegue ver TODOS os dados (sem filtro)
--
-- ✅ Se usuário normal vê TUDO: RLS foi desabilitado
-- ❌ Se ainda vê só os dele: RLS ainda ativo (problema)
-- =====================================================

-- =====================================================
-- DEPOIS DO TESTE: REABILITAR RLS
-- =====================================================
-- ⚠️ NÃO ESQUECER DE REABILITAR!
--
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions_orcado ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions_ano_anterior ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
-- =====================================================
