-- =====================================================
-- TESTE DIAGNÓSTICO: Desabilitar RLS Temporariamente
-- =====================================================
-- Objetivo: Descobrir se o problema é RLS ou tempo de servidor
-- =====================================================

-- =====================================================
-- PASSO 1: DESABILITAR RLS em transactions (TEMPORÁRIO)
-- =====================================================

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 2: VERIFICAR STATUS
-- =====================================================

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '🔴 HABILITADO' ELSE '✅ DESABILITADO' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'transactions';

-- Deve mostrar: ✅ DESABILITADO

-- =====================================================
-- PASSO 3: TESTAR QUERY (Admin sem filtros)
-- =====================================================

-- ⏱️ Medir tempo de execução
EXPLAIN ANALYZE
SELECT
  scenario,
  conta_contabil,
  year_month,
  tag0,
  tag01,
  tipo,
  total_amount,
  tx_count
FROM get_dre_summary('2026-01', '2026-12')
LIMIT 100;

-- ✅ Se executar em < 10 segundos: problema é RLS
-- ❌ Se demorar > 30 segundos: problema é volume de dados

-- =====================================================
-- PASSO 4: TESTAR NO NAVEGADOR
-- =====================================================

-- Agora faça o teste:
-- 1. Hard Refresh (Ctrl+Shift+R) no navegador
-- 2. Login como Admin
-- 3. Abrir DRE Gerencial
-- 4. Aguardar carregamento

-- ✅ Se carregar rápido: problema é RLS
-- ❌ Se ainda ficar lento/loop: problema é volume de dados

-- =====================================================
-- PASSO 5: REABILITAR RLS (IMPORTANTE!)
-- =====================================================

-- ⚠️ NÃO ESQUECER DE REABILITAR APÓS O TESTE!

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verificar se foi reabilitado
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ HABILITADO (SEGURO)' ELSE '🔴 DESABILITADO (INSEGURO)' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'transactions';

-- Deve mostrar: ✅ HABILITADO (SEGURO)

-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- =====================================================

-- CENÁRIO A: Admin carrega RÁPIDO com RLS desabilitado
-- Conclusão: Problema é RLS (políticas estão bloqueando)
-- Solução: Ajustar políticas RLS para Admin

-- CENÁRIO B: Admin continua LENTO mesmo com RLS desabilitado
-- Conclusão: Problema é volume de dados (125k registros)
-- Solução: Cache materializado ou limite de período

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================

-- Se problema for RLS (Cenário A):
-- 1. Verificar políticas: SELECT * FROM pg_policies WHERE tablename = 'transactions';
-- 2. Ajustar política para permitir Admin ver tudo
-- 3. Ou criar role específico para Admin

-- Se problema for volume (Cenário B):
-- 1. Executar: USAR_CACHE_MATERIALIZADO.sql
-- 2. Ou forçar limite de período para Admin (já implementado no código)
-- 3. Ou adicionar mais índices

-- =====================================================
-- IMPORTANTE: REABILITAR RLS ANTES DE SAIR!
-- =====================================================
