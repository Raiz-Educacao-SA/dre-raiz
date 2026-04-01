-- ============================================================
-- RECARGA COMPLETA: 50.000 registros de dre_fabric para transactions
-- ⚠️ ATENÇÃO: Este script APAGA todos os dados de transactions!
-- Data: 2026-02-03
-- ============================================================

BEGIN;

-- ============================================================
-- PASSO 1: BACKUP (Opcional mas recomendado)
-- ============================================================

-- Criar tabela de backup antes de deletar
DROP TABLE IF EXISTS transactions_backup;

CREATE TABLE transactions_backup AS
SELECT * FROM transactions;

SELECT
    '✅ Backup criado!' as status,
    COUNT(*) as registros_salvos
FROM transactions_backup;

-- ============================================================
-- PASSO 2: LIMPAR TABELA TRANSACTIONS
-- ============================================================

-- Deletar TODOS os registros
DELETE FROM transactions;

-- Verificar se está vazia
SELECT
    '✅ Tabela limpa!' as status,
    COUNT(*) as registros_restantes
FROM transactions;

-- ============================================================
-- PASSO 3: CARREGAR 50.000 REGISTROS COM MAPEAMENTO CORRETO
-- ============================================================

INSERT INTO transactions (
    id,              -- UUID gerado
    chave_id,        -- ✅ dre_fabric.chave_id (CORRETO!)
    date,            -- dre_fabric.anomes
    description,     -- dre_fabric.complemento
    category,        -- dre_fabric.conta
    amount,          -- dre_fabric.valor
    marca,           -- dre_fabric.cia
    filial,          -- dre_fabric.filial
    vendor,          -- ✅ dre_fabric.fornecedor_padrao (CORRETO!)
    ticket,          -- ✅ dre_fabric.ticket (CORRETO!)
    tag01,           -- dre_fabric.tag1
    tag02,           -- dre_fabric.tag2
    tag03,           -- dre_fabric.tag3
    type,            -- dre_fabric.type
    scenario,        -- dre_fabric.scenario
    status,          -- dre_fabric.status
    nat_orc,         -- dre_fabric.tag_orc (se existir)
    recurring        -- dre_fabric.recorrente (se existir)
)
SELECT
    gen_random_uuid()::text,                    -- Gerar novo UUID
    df.chave_id,                                 -- ✅ chave_id → chave_id
    df.anomes,                                   -- date (anomes)
    COALESCE(df.complemento, 'Sem descrição'),  -- description (com fallback)
    COALESCE(df.conta, 'Outros'),               -- category (com fallback)
    COALESCE(df.valor, 0),                      -- amount (com fallback)
    df.cia,                                      -- marca
    df.filial,                                   -- filial
    df.fornecedor_padrao,                        -- ✅ vendor
    df.ticket,                                   -- ✅ ticket
    df.tag1,                                     -- ✅ tag01 ← tag1
    df.tag2,                                     -- ✅ tag02 ← tag2
    df.tag3,                                     -- ✅ tag03 ← tag3
    COALESCE(df.type, 'REVENUE'),               -- type (com fallback)
    COALESCE(df.scenario, 'Real'),              -- scenario (padrão: Real)
    COALESCE(df.status, 'Normal'),              -- status (padrão: Normal)
    NULL,                                        -- nat_orc (ajustar se existir)
    NULL                                         -- recurring (ajustar se existir)
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL                   -- Filtro 1: Só com chave_id
  AND df.anomes IS NOT NULL                     -- Filtro 2: Só com anomes
  AND df.valor IS NOT NULL                      -- Filtro 3: Só com valor
LIMIT 50000;                                     -- Carregar exatamente 50.000

-- ============================================================
-- PASSO 4: VALIDAÇÃO COMPLETA
-- ============================================================

-- 1. Contar registros carregados
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM transactions;

    RAISE NOTICE '📊 Total de registros carregados: %', total_count;

    IF total_count = 50000 THEN
        RAISE NOTICE '✅ SUCESSO: 50.000 registros carregados!';
    ELSIF total_count < 50000 THEN
        RAISE NOTICE '⚠️ ATENÇÃO: Apenas % registros carregados (esperado: 50.000)', total_count;
    ELSE
        RAISE NOTICE '⚠️ ATENÇÃO: % registros carregados (mais que 50.000!)', total_count;
    END IF;
END $$;

-- 2. Verificar campos críticos
SELECT
    '📊 Resumo dos dados carregados' as tipo,
    COUNT(*) as total_registros,
    COUNT(chave_id) as com_chave_id,
    COUNT(vendor) as com_vendor,
    COUNT(ticket) as com_ticket,
    COUNT(CASE WHEN chave_id IS NULL THEN 1 END) as sem_chave_id
FROM transactions;

-- 3. Amostra de 5 registros para validação visual
SELECT
    '📋 Amostra de registros carregados' as info;

SELECT
    id,
    chave_id,
    date,
    vendor,
    ticket,
    amount,
    marca,
    filial,
    category,
    LEFT(description, 50) as description_preview
FROM transactions
LIMIT 5;

-- 4. Verificar se chave_id tem formato correto (números, não UUID)
SELECT
    '🔍 Validação do formato de chave_id' as validacao;

-- Contar UUIDs (ERRO!)
SELECT
    COUNT(*) as registros_com_uuid,
    CASE
        WHEN COUNT(*) > 0 THEN '❌ ERRO: chave_id contém UUIDs!'
        ELSE '✅ OK: Nenhum UUID encontrado'
    END as status
FROM transactions
WHERE chave_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Contar chaves numéricas (CORRETO!)
SELECT
    COUNT(*) as registros_com_chave_numerica,
    CASE
        WHEN COUNT(*) = (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
        THEN '✅ OK: Todas as chaves são numéricas'
        ELSE '⚠️ ATENÇÃO: Algumas chaves não são numéricas'
    END as status
FROM transactions
WHERE chave_id ~ '^[0-9]+$';

-- 5. Verificar correspondência com dre_fabric
SELECT
    '🔗 Validação da correspondência com dre_fabric' as validacao;

SELECT
    COUNT(t.*) as total_transactions,
    COUNT(df.chave_id) as com_match_fabric,
    COUNT(t.*) - COUNT(df.chave_id) as sem_match_fabric,
    ROUND(COUNT(df.chave_id)::NUMERIC / NULLIF(COUNT(t.*), 0) * 100, 2) as percentual_match
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id;

-- 6. Verificar vendor (fornecedor)
SELECT
    '👤 Validação de vendors' as validacao;

SELECT
    COUNT(*) as total_vendors_preenchidos,
    COUNT(DISTINCT vendor) as vendors_unicos,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ OK: Vendors carregados'
        ELSE '❌ ERRO: Nenhum vendor carregado'
    END as status
FROM transactions
WHERE vendor IS NOT NULL AND vendor != '';

-- 7. Top 5 vendors
SELECT
    '📊 Top 5 Fornecedores' as info;

SELECT
    vendor,
    COUNT(*) as quantidade_transacoes,
    SUM(amount) as valor_total
FROM transactions
WHERE vendor IS NOT NULL
GROUP BY vendor
ORDER BY quantidade_transacoes DESC
LIMIT 5;

-- 8. Distribuição por marca
SELECT
    '🏢 Distribuição por Marca' as info;

SELECT
    marca,
    COUNT(*) as quantidade,
    ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM transactions), 0) * 100, 2) as percentual
FROM transactions
GROUP BY marca
ORDER BY quantidade DESC;

-- 9. Distribuição por filial
SELECT
    '🏪 Top 10 Filiais' as info;

SELECT
    filial,
    COUNT(*) as quantidade,
    SUM(amount) as valor_total
FROM transactions
GROUP BY filial
ORDER BY quantidade DESC
LIMIT 10;

-- 10. Verificar range de datas
SELECT
    '📅 Range de Datas' as info;

SELECT
    MIN(date) as data_mais_antiga,
    MAX(date) as data_mais_recente,
    COUNT(DISTINCT date) as dias_unicos
FROM transactions;

COMMIT;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
    '🎉 RECARGA CONCLUÍDA!' as status,
    'Verifique os resultados acima para confirmar que tudo está correto' as proximos_passos,
    'Se houver erros, execute: ROLLBACK; e depois corrija o script' as dica;

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================

/*
✅ MAPEAMENTO CORRETO UTILIZADO:
   - dre_fabric.chave_id → transactions.chave_id
   - dre_fabric.fornecedor_padrao → transactions.vendor
   - dre_fabric.ticket → transactions.ticket
   - dre_fabric.anomes → transactions.date
   - dre_fabric.complemento → transactions.description
   - dre_fabric.valor → transactions.amount
   - dre_fabric.cia → transactions.marca
   - dre_fabric.filial → transactions.filial
   - dre_fabric.tag1 → transactions.tag01
   - dre_fabric.tag2 → transactions.tag02
   - dre_fabric.tag3 → transactions.tag03

📊 VALIDAÇÕES INCLUÍDAS:
   1. Total de registros = 50.000
   2. chave_id preenchida e no formato correto (numérica)
   3. vendor preenchido
   4. Correspondência com dre_fabric
   5. Distribuição por marca e filial
   6. Range de datas

⚠️ SE ENCONTRAR ERROS:
   - Revise os resultados das validações acima
   - Execute: ROLLBACK; para desfazer
   - Corrija o script e execute novamente

💾 BACKUP:
   - Os dados antigos foram salvos em transactions_backup
   - Para restaurar: INSERT INTO transactions SELECT * FROM transactions_backup;
*/
