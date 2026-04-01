-- ================================================================
-- SCRIPT DE LIMPEZA: TRANSACTIONS ANTIGAS
-- ================================================================
-- ⚠️ ATENÇÃO: Execute este script APENAS após fazer backup!
-- ================================================================
-- Data: 04/02/2026
-- Objetivo: Arquivar e deletar transações antigas para liberar espaço
-- ================================================================

-- ================================================================
-- ETAPA 1: ANÁLISE DE DADOS ANTIGOS
-- ================================================================

-- 1.1. Verificar distribuição por ano
SELECT
    EXTRACT(YEAR FROM date::date) as ano,
    COUNT(*) as quantidade,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
GROUP BY ano
ORDER BY ano DESC;

-- 1.2. Verificar registros com mais de 2 anos
SELECT
    'Mais de 2 anos' as periodo,
    COUNT(*) as quantidade,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');

-- 1.3. Verificar registros com mais de 1 ano
SELECT
    'Mais de 1 ano' as periodo,
    COUNT(*) as quantidade,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '12 months');

-- ================================================================
-- ETAPA 2: CRIAR TABELA DE ARQUIVO (HISTÓRICO)
-- ================================================================

-- Criar tabela de arquivo se não existir
CREATE TABLE IF NOT EXISTS transactions_archive (
    LIKE transactions INCLUDING ALL
);

-- Adicionar comentário
COMMENT ON TABLE transactions_archive IS 'Arquivo histórico de transações antigas (mais de 2 anos)';

-- Verificar se a tabela foi criada
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions_archive')
        THEN '✓ Tabela transactions_archive criada/existe'
        ELSE '✗ Erro ao criar tabela transactions_archive'
    END as status;

-- ================================================================
-- OPÇÃO 1: ARQUIVAR REGISTROS COM MAIS DE 2 ANOS
-- ================================================================
-- Recomendado para liberar espaço significativo mantendo histórico

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- -- Inserir registros antigos na tabela de arquivo
-- INSERT INTO transactions_archive
-- SELECT * FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '24 months')
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Verificar quantos registros foram arquivados
-- SELECT
--     COUNT(*) as registros_arquivados,
--     pg_size_pretty(pg_total_relation_size('transactions_archive')) as tamanho_arquivo
-- FROM transactions_archive;
--
-- -- Deletar registros antigos da tabela principal
-- DELETE FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '24 months');
--
-- -- Verificar quantos registros restam
-- SELECT
--     COUNT(*) as registros_restantes,
--     pg_size_pretty(pg_total_relation_size('transactions')) as tamanho_depois
-- FROM transactions;
--
-- COMMIT;
--
-- -- Recuperar espaço
-- VACUUM FULL transactions;
--
-- -- Recriar índices
-- REINDEX TABLE transactions;
--
-- -- Atualizar estatísticas
-- ANALYZE transactions;

-- ================================================================
-- OPÇÃO 2: ARQUIVAR REGISTROS COM MAIS DE 1 ANO
-- ================================================================
-- Mais conservador - mantém apenas último ano na tabela principal

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- INSERT INTO transactions_archive
-- SELECT * FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '12 months')
-- ON CONFLICT (id) DO NOTHING;
--
-- DELETE FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '12 months');
--
-- COMMIT;
--
-- VACUUM FULL transactions;
-- REINDEX TABLE transactions;
-- ANALYZE transactions;

-- ================================================================
-- OPÇÃO 3: DELETAR REGISTROS ANTIGOS SEM ARQUIVAR
-- ================================================================
-- ⚠️ CUIDADO: Esta opção deleta permanentemente os dados
-- Use apenas se você tem backup externo ou não precisa do histórico

-- ⚠️ DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- BEGIN;
--
-- -- Contar registros que serão deletados
-- SELECT
--     'Registros a deletar (> 2 anos)' as descricao,
--     COUNT(*) as quantidade
-- FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '24 months');
--
-- -- Deletar registros antigos
-- DELETE FROM transactions
-- WHERE date < (CURRENT_DATE - INTERVAL '24 months');
--
-- COMMIT;
--
-- -- Recuperar espaço
-- VACUUM FULL transactions;
-- REINDEX TABLE transactions;
-- ANALYZE transactions;

-- ================================================================
-- ETAPA 3: VERIFICAÇÕES PÓS-LIMPEZA
-- ================================================================

-- 3.1. Comparar tamanhos antes e depois
SELECT
    'transactions (principal)' as tabela,
    COUNT(*) as registros,
    pg_size_pretty(pg_total_relation_size('transactions')) as tamanho
FROM transactions
UNION ALL
SELECT
    'transactions_archive (histórico)' as tabela,
    COUNT(*) as registros,
    pg_size_pretty(pg_total_relation_size('transactions_archive')) as tamanho
FROM transactions_archive;

-- 3.2. Verificar distribuição atual por ano
SELECT
    EXTRACT(YEAR FROM date::date) as ano,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
GROUP BY ano
ORDER BY ano DESC;

-- 3.3. Verificar economia de espaço
WITH antes AS (
    SELECT
        (SELECT pg_total_relation_size('transactions') FROM pg_class WHERE relname = 'transactions' LIMIT 1) +
        (SELECT COALESCE(pg_total_relation_size('transactions_archive'), 0) FROM pg_class WHERE relname = 'transactions_archive' LIMIT 1)
    as tamanho_total_antes
)
SELECT
    pg_size_pretty(pg_total_relation_size('transactions')) as tamanho_transactions_depois,
    pg_size_pretty(COALESCE(pg_total_relation_size('transactions_archive'), 0)) as tamanho_archive,
    pg_size_pretty(
        (SELECT tamanho_total_antes FROM antes) -
        (pg_total_relation_size('transactions') + COALESCE(pg_total_relation_size('transactions_archive'), 0))
    ) as economia_estimada;

-- ================================================================
-- ETAPA 4: OTIMIZAÇÕES ADICIONAIS
-- ================================================================

-- 4.1. Analisar uso dos índices
SELECT
    indexname,
    idx_scan as vezes_usado,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho,
    CASE
        WHEN idx_scan = 0 THEN '⚠️ Nunca usado'
        WHEN idx_scan < 100 THEN 'ℹ️ Pouco usado'
        ELSE '✓ Bem usado'
    END as status
FROM pg_stat_user_indexes
WHERE tablename = 'transactions'
ORDER BY idx_scan ASC;

-- 4.2. Deletar índices não utilizados (se houver)
-- ⚠️ DESCOMENTE APENAS SE O ÍNDICE REALMENTE NÃO FOR USADO:

-- DROP INDEX IF EXISTS idx_transactions_vendor;
-- DROP INDEX IF EXISTS idx_transactions_ticket;
-- DROP INDEX IF EXISTS idx_transactions_nat_orc;

-- ================================================================
-- ETAPA 5: CRIAR VIEW COMBINADA (OPCIONAL)
-- ================================================================
-- Cria uma view que mostra dados de transactions + archive juntos

CREATE OR REPLACE VIEW v_transactions_completo AS
SELECT *, 'principal' as origem FROM transactions
UNION ALL
SELECT *, 'arquivo' as origem FROM transactions_archive
ORDER BY date DESC;

-- Comentário
COMMENT ON VIEW v_transactions_completo IS 'View que combina transactions atuais e arquivadas';

-- Testar view
SELECT
    origem,
    COUNT(*) as quantidade,
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente
FROM v_transactions_completo
GROUP BY origem;

-- ================================================================
-- RESUMO FINAL
-- ================================================================

SELECT '=== RESUMO FINAL ===' as secao;

SELECT
    pg_size_pretty(pg_database_size(current_database())) as tamanho_total_banco,
    (SELECT COUNT(*) FROM transactions) as registros_transactions,
    (SELECT COUNT(*) FROM transactions_archive) as registros_archive,
    pg_size_pretty(pg_total_relation_size('transactions')) as tamanho_transactions,
    pg_size_pretty(COALESCE(pg_total_relation_size('transactions_archive'), 0)) as tamanho_archive;

-- ================================================================
-- MANUTENÇÃO FUTURA
-- ================================================================
-- Adicione este script ao seu processo de manutenção mensal:

-- Mover registros antigos para arquivo automaticamente
-- (Executar mensalmente)
/*
BEGIN;
INSERT INTO transactions_archive
SELECT * FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months')
ON CONFLICT (id) DO NOTHING;

DELETE FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');
COMMIT;

VACUUM ANALYZE transactions;
*/

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================

SELECT 'Script de limpeza carregado. Descomente a opção desejada para executar.' as status;
