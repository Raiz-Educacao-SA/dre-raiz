-- ================================================================
-- SCRIPT DE LIMPEZA: DRE_FABRIC
-- ================================================================
-- ⚠️ ATENÇÃO: Execute este script APENAS após fazer backup!
-- ================================================================
-- Data: 04/02/2026
-- Objetivo: Liberar espaço no banco deletando a tabela dre_fabric
-- ================================================================

-- ================================================================
-- ANTES DE EXECUTAR: VERIFICAÇÕES DE SEGURANÇA
-- ================================================================

-- 1. Confirmar que a tabela existe
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dre_fabric')
        THEN '✓ Tabela dre_fabric existe'
        ELSE '✗ Tabela dre_fabric NÃO existe - script não precisa ser executado'
    END as status;

-- 2. Verificar tamanho que será liberado
SELECT
    pg_size_pretty(pg_total_relation_size('dre_fabric')) as tamanho_total,
    pg_size_pretty(pg_relation_size('dre_fabric')) as tamanho_dados,
    pg_size_pretty(pg_total_relation_size('dre_fabric') - pg_relation_size('dre_fabric')) as tamanho_indices;

-- 3. Contar registros que serão deletados
SELECT COUNT(*) as total_registros FROM dre_fabric;

-- 4. Verificar período dos dados
SELECT
    MIN(anomes) as mes_mais_antigo,
    MAX(anomes) as mes_mais_recente,
    COUNT(DISTINCT anomes) as quantidade_meses
FROM dre_fabric;

-- ================================================================
-- OPÇÃO 1: DELETAR TABELA COMPLETAMENTE (RECOMENDADO)
-- ================================================================
-- Use esta opção se:
-- - Todos os dados já foram processados e estão em 'transactions'
-- - Não precisa mais sincronizar dados do Fabric
-- - Quer liberar o máximo de espaço possível

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- -- Deletar tabela e todos os objetos relacionados
-- DROP TABLE IF EXISTS dre_fabric CASCADE;
--
-- -- Deletar tabelas relacionadas (se existirem)
-- DROP TABLE IF EXISTS cruzamento_dados_banco_vs_DRE CASCADE;
-- DROP TABLE IF EXISTS cruzamento_resumo CASCADE;
-- DROP TABLE IF EXISTS dre_fabric_agrupado CASCADE;
--
-- -- Confirmar mudanças
-- COMMIT;
--
-- -- Recuperar espaço (pode demorar alguns minutos)
-- VACUUM FULL;
--
-- -- Verificar economia
-- SELECT pg_size_pretty(pg_database_size(current_database())) as tamanho_banco_depois;

-- ================================================================
-- OPÇÃO 2: MANTER APENAS ÚLTIMOS 3 MESES
-- ================================================================
-- Use esta opção se:
-- - Ainda precisa sincronizar dados novos do Fabric
-- - Quer manter um histórico recente para debug
-- - Quer liberar espaço mas manter a tabela

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- -- Verificar quantos registros serão mantidos
-- SELECT COUNT(*) as registros_a_manter
-- FROM dre_fabric
-- WHERE anomes >= TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM');
--
-- -- Verificar quantos registros serão deletados
-- SELECT COUNT(*) as registros_a_deletar
-- FROM dre_fabric
-- WHERE anomes < TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM');
--
-- -- Deletar registros antigos (mais de 3 meses)
-- DELETE FROM dre_fabric
-- WHERE anomes < TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYYMM');
--
-- COMMIT;
--
-- -- Recuperar espaço
-- VACUUM FULL dre_fabric;
--
-- -- Recriar índices
-- REINDEX TABLE dre_fabric;
--
-- -- Atualizar estatísticas
-- ANALYZE dre_fabric;
--
-- -- Verificar resultado
-- SELECT
--     COUNT(*) as registros_restantes,
--     pg_size_pretty(pg_total_relation_size('dre_fabric')) as tamanho_depois
-- FROM dre_fabric;

-- ================================================================
-- OPÇÃO 3: MANTER APENAS ÚLTIMOS 6 MESES
-- ================================================================
-- Variação mais conservadora da Opção 2

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- DELETE FROM dre_fabric
-- WHERE anomes < TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYYMM');
--
-- COMMIT;
--
-- VACUUM FULL dre_fabric;
-- REINDEX TABLE dre_fabric;
-- ANALYZE dre_fabric;

-- ================================================================
-- APÓS EXECUTAR: VERIFICAÇÕES PÓS-LIMPEZA
-- ================================================================

-- 1. Verificar tamanho total do banco
SELECT pg_size_pretty(pg_database_size(current_database())) as tamanho_total_banco;

-- 2. Listar tamanho de todas as tabelas
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- 3. Verificar se dre_fabric ainda existe
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dre_fabric')
        THEN 'dre_fabric ainda existe (Opção 2 ou 3 foi usada)'
        ELSE 'dre_fabric foi deletada (Opção 1 foi usada)'
    END as status_final;

-- ================================================================
-- NOTAS IMPORTANTES
-- ================================================================
-- 1. SEMPRE faça backup antes de executar qualquer opção
-- 2. Execute em horário de baixa utilização
-- 3. O comando VACUUM FULL pode travar a tabela temporariamente
-- 4. Teste a aplicação após a limpeza
-- 5. Monitore o crescimento do banco após a limpeza
-- ================================================================

SELECT 'Script de limpeza carregado. Descomente a opção desejada para executar.' as status;
