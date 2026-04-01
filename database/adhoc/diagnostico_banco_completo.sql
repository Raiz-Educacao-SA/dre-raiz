-- ================================================================
-- DIAGNÓSTICO COMPLETO DO BANCO SUPABASE
-- ================================================================
-- Execute este script no SQL Editor do Supabase
-- Data: 04/02/2026
-- ================================================================

-- ================================================================
-- 1. TAMANHO GERAL DO BANCO
-- ================================================================

SELECT '=== 1. TAMANHO GERAL DO BANCO ===' as secao;

SELECT
    pg_size_pretty(pg_database_size(current_database())) as tamanho_total_banco,
    current_database() as nome_banco;

-- ================================================================
-- 2. TAMANHO POR TABELA (ORDENADO DO MAIOR PARA O MENOR)
-- ================================================================

SELECT '=== 2. TAMANHO POR TABELA ===' as secao;

SELECT
    tablename as tabela,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS tamanho_total,
    pg_size_pretty(pg_relation_size('public.'||tablename)) AS tamanho_dados,
    pg_size_pretty(pg_total_relation_size('public.'||tablename) - pg_relation_size('public.'||tablename)) AS tamanho_indices,
    ROUND(
        100.0 * pg_total_relation_size('public.'||tablename) /
        (SELECT SUM(pg_total_relation_size('public.'||tablename)) FROM pg_tables WHERE schemaname = 'public'),
        2
    ) || '%' as percentual_do_banco
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- ================================================================
-- 3. QUANTIDADE DE REGISTROS POR TABELA
-- ================================================================

SELECT '=== 3. QUANTIDADE DE REGISTROS ===' as secao;

SELECT 'transactions' as tabela, COUNT(*) as total_registros FROM transactions
UNION ALL
SELECT 'dre_fabric', COUNT(*) FROM dre_fabric
UNION ALL
SELECT 'manual_changes', COUNT(*) FROM manual_changes
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM user_permissions;

-- ================================================================
-- 4. ANÁLISE DETALHADA: TRANSACTIONS
-- ================================================================

SELECT '=== 4. ANÁLISE DA TABELA TRANSACTIONS ===' as secao;

-- 4.1. Período dos dados
SELECT
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente,
    EXTRACT(YEAR FROM AGE(MAX(date)::date, MIN(date)::date)) * 12 +
    EXTRACT(MONTH FROM AGE(MAX(date)::date, MIN(date)::date)) as meses_de_dados
FROM transactions;

-- 4.2. Distribuição por ano
SELECT
    EXTRACT(YEAR FROM date::date) as ano,
    COUNT(*) as quantidade_registros,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
GROUP BY ano
ORDER BY ano DESC;

-- 4.3. Distribuição por mês (últimos 12 meses)
SELECT
    TO_CHAR(date::date, 'YYYY-MM') as mes,
    COUNT(*) as quantidade_registros,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado
FROM transactions
WHERE date >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY mes
ORDER BY mes DESC;

-- 4.4. Distribuição por cenário
SELECT
    COALESCE(scenario, 'NULL') as cenario,
    COUNT(*) as quantidade_registros,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual
FROM transactions
GROUP BY scenario
ORDER BY COUNT(*) DESC;

-- 4.5. Registros antigos (mais de 2 anos)
SELECT
    'Registros com mais de 2 anos' as descricao,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transactions), 2) || '%' as percentual_do_total,
    pg_size_pretty(SUM(pg_column_size(transactions.*))::bigint) as tamanho_estimado
FROM transactions
WHERE date < (CURRENT_DATE - INTERVAL '24 months');

-- ================================================================
-- 5. ANÁLISE DETALHADA: DRE_FABRIC
-- ================================================================

SELECT '=== 5. ANÁLISE DA TABELA DRE_FABRIC ===' as secao;

-- 5.1. Verificar se a tabela existe
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dre_fabric')
        THEN 'TABELA EXISTE'
        ELSE 'TABELA NÃO EXISTE'
    END as status_tabela;

-- 5.2. Se existir, mostrar estatísticas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dre_fabric') THEN
        -- Estatísticas da dre_fabric
        RAISE NOTICE 'Executando análise de dre_fabric...';

        -- Total de registros
        EXECUTE 'SELECT COUNT(*) FROM dre_fabric';

        -- Período dos dados
        EXECUTE 'SELECT MIN(anomes) as mes_mais_antigo, MAX(anomes) as mes_mais_recente, COUNT(DISTINCT anomes) as quantidade_meses FROM dre_fabric';

        -- Distribuição por mês
        EXECUTE 'SELECT anomes, COUNT(*) as quantidade, pg_size_pretty(SUM(pg_column_size(dre_fabric.*))::bigint) as tamanho FROM dre_fabric GROUP BY anomes ORDER BY anomes DESC LIMIT 12';

    ELSE
        RAISE NOTICE 'Tabela dre_fabric não existe - otimização já foi feita ou tabela não foi criada.';
    END IF;
END $$;

-- ================================================================
-- 6. ANÁLISE DE ÍNDICES
-- ================================================================

SELECT '=== 6. ANÁLISE DE ÍNDICES ===' as secao;

-- 6.1. Índices e seu uso
SELECT
    schemaname as schema,
    tablename as tabela,
    indexname as indice,
    idx_scan as vezes_usado,
    idx_tup_read as tuplas_lidas,
    idx_tup_fetch as tuplas_retornadas,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho,
    CASE
        WHEN idx_scan = 0 THEN '❌ NUNCA USADO'
        WHEN idx_scan < 100 THEN '⚠️ POUCO USADO'
        ELSE '✅ BEM USADO'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- 6.2. Total ocupado por índices
SELECT
    tablename as tabela,
    COUNT(*) as quantidade_indices,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as tamanho_total_indices
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY SUM(pg_relation_size(indexrelid)) DESC;

-- ================================================================
-- 7. ANÁLISE DE OUTRAS TABELAS
-- ================================================================

SELECT '=== 7. OUTRAS TABELAS DO BANCO ===' as secao;

-- Listar todas as tabelas (incluindo possíveis tabelas temporárias/debug)
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- ================================================================
-- 8. TABELAS DE CRUZAMENTO/HISTÓRICO (SE EXISTIREM)
-- ================================================================

SELECT '=== 8. TABELAS DE CRUZAMENTO/HISTÓRICO ===' as secao;

DO $$
DECLARE
    tabelas_temp TEXT[] := ARRAY['cruzamento_dados_banco_vs_DRE', 'cruzamento_resumo', 'cruzamento_controle', 'transactions_backup', 'dre_fabric_agrupado', 'sync_log'];
    tabela TEXT;
    total_registros BIGINT;
    tamanho_tabela TEXT;
BEGIN
    FOREACH tabela IN ARRAY tabelas_temp
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tabela) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', tabela) INTO total_registros;
            EXECUTE format('SELECT pg_size_pretty(pg_total_relation_size(%L))', 'public.' || tabela) INTO tamanho_tabela;
            RAISE NOTICE 'Tabela: % | Registros: % | Tamanho: %', tabela, total_registros, tamanho_tabela;
        END IF;
    END LOOP;
END $$;

-- ================================================================
-- 9. RESUMO E RECOMENDAÇÕES
-- ================================================================

SELECT '=== 9. RESUMO E RECOMENDAÇÕES ===' as secao;

WITH tamanhos AS (
    SELECT
        SUM(pg_total_relation_size('public.'||tablename)) as tamanho_total,
        SUM(CASE WHEN tablename = 'dre_fabric' THEN pg_total_relation_size('public.'||tablename) ELSE 0 END) as tamanho_dre_fabric,
        SUM(CASE WHEN tablename = 'transactions' THEN pg_total_relation_size('public.'||tablename) ELSE 0 END) as tamanho_transactions
    FROM pg_tables
    WHERE schemaname = 'public'
)
SELECT
    pg_size_pretty(tamanho_total) as tamanho_total_banco,
    pg_size_pretty(tamanho_dre_fabric) as tamanho_dre_fabric,
    pg_size_pretty(tamanho_transactions) as tamanho_transactions,
    ROUND(100.0 * tamanho_dre_fabric / tamanho_total, 2) || '%' as percentual_dre_fabric,
    ROUND(100.0 * tamanho_transactions / tamanho_total, 2) || '%' as percentual_transactions,
    CASE
        WHEN tamanho_dre_fabric > tamanho_transactions THEN '⚠️ DRE_FABRIC é maior que TRANSACTIONS - considere limpeza'
        WHEN tamanho_dre_fabric > 0 AND tamanho_dre_fabric < tamanho_transactions THEN '⚠️ DRE_FABRIC existe mas é menor - verifique necessidade'
        WHEN tamanho_dre_fabric = 0 THEN '✅ DRE_FABRIC não existe ou está vazia'
        ELSE 'ℹ️ Análise manual necessária'
    END as recomendacao
FROM tamanhos;

-- ================================================================
-- 10. ECONOMIA ESTIMADA POR AÇÃO
-- ================================================================

SELECT '=== 10. ECONOMIA ESTIMADA ===' as secao;

WITH analise AS (
    SELECT
        'Deletar dre_fabric completamente' as acao,
        pg_size_pretty(
            COALESCE(
                (SELECT pg_total_relation_size('public.dre_fabric')),
                0
            )
        ) as economia_estimada,
        1 as ordem
    UNION ALL
    SELECT
        'Deletar registros de transactions > 2 anos' as acao,
        pg_size_pretty(
            (SELECT COALESCE(SUM(pg_column_size(transactions.*))::bigint, 0)
             FROM transactions
             WHERE date < (CURRENT_DATE - INTERVAL '24 months'))
        ) as economia_estimada,
        2 as ordem
    UNION ALL
    SELECT
        'Deletar índices não utilizados' as acao,
        pg_size_pretty(
            COALESCE(
                (SELECT SUM(pg_relation_size(indexrelid))
                 FROM pg_stat_user_indexes
                 WHERE idx_scan = 0 AND schemaname = 'public'),
                0
            )
        ) as economia_estimada,
        3 as ordem
)
SELECT
    acao,
    economia_estimada,
    CASE
        WHEN ordem = 1 THEN '🔴 ALTA PRIORIDADE'
        WHEN ordem = 2 THEN '🟡 MÉDIA PRIORIDADE'
        ELSE '🟢 BAIXA PRIORIDADE'
    END as prioridade
FROM analise
ORDER BY ordem;

-- ================================================================
-- FIM DO DIAGNÓSTICO
-- ================================================================

SELECT '=== DIAGNÓSTICO COMPLETO ===' as resultado;
SELECT 'Execute o próximo passo: Fazer backup antes de qualquer limpeza!' as proximo_passo;
