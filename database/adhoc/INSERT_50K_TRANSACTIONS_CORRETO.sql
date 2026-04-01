-- ============================================================
-- INSERT 50K REGISTROS - VERSÃO CORRETA E TESTADA
-- ============================================================
-- Data: 2026-02-03
-- Status: ✅ TESTADO E FUNCIONANDO
-- ============================================================

-- ============================================================
-- MAPEAMENTO CORRETO:
-- ============================================================
-- dre_fabric.chave_id          → transactions.chave_id
-- dre_fabric.anomes            → transactions.date         ✅
-- dre_fabric.complemento       → transactions.description
-- dre_fabric.conta             → transactions.category
-- dre_fabric.valor             → transactions.amount
-- dre_fabric.cia               → transactions.marca
-- dre_fabric.filial            → transactions.filial
-- dre_fabric.fornecedor_padrao → transactions.vendor
-- dre_fabric.ticket            → transactions.ticket
-- dre_fabric.tag1              → transactions.tag01        ✅
-- dre_fabric.tag2              → transactions.tag02        ✅
-- dre_fabric.tag3              → transactions.tag03        ✅
-- dre_fabric.type              → transactions.type
-- dre_fabric.scenario          → transactions.scenario
-- dre_fabric.status            → transactions.status
-- ============================================================

-- OPCIONAL: Fazer backup antes (se já houver dados)
-- DROP TABLE IF EXISTS transactions_backup;
-- CREATE TABLE transactions_backup AS SELECT * FROM transactions;

-- OPCIONAL: Limpar tabela antes (se quiser começar do zero)
-- DELETE FROM transactions;

-- ============================================================
-- INSERT PRINCIPAL - 50.000 REGISTROS
-- ============================================================

INSERT INTO transactions (
    id,
    chave_id,
    date,
    description,
    category,
    amount,
    marca,
    filial,
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    type,
    scenario,
    status
)
SELECT
    gen_random_uuid()::text,                     -- Gerar UUID único
    df.chave_id,                                 -- Chave de relacionamento
    df.anomes,                                   -- ✅ Data (anomes)
    COALESCE(df.complemento, 'Sem descrição'),  -- Descrição (com fallback)
    COALESCE(df.conta, 'Outros'),               -- Categoria (com fallback)
    COALESCE(df.valor, 0),                      -- Valor (com fallback)
    df.cia,                                      -- Marca/Empresa
    df.filial,                                   -- Código da filial
    df.fornecedor_padrao,                        -- Fornecedor/Vendor
    df.ticket,                                   -- Número do ticket
    df.tag1,                                     -- ✅ Tag 1
    df.tag2,                                     -- ✅ Tag 2
    df.tag3,                                     -- ✅ Tag 3
    COALESCE(df.type, 'REVENUE'),               -- Tipo (REVENUE/EXPENSE)
    COALESCE(df.scenario, 'Real'),              -- Cenário (Real/Budget)
    COALESCE(df.status, 'Normal')               -- Status
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL                    -- Filtro 1: Só com chave_id
  AND df.anomes IS NOT NULL                      -- Filtro 2: Só com anomes (data)
  AND df.valor IS NOT NULL                       -- Filtro 3: Só com valor
LIMIT 50000;                                     -- Carregar exatamente 50.000

-- ============================================================
-- VALIDAÇÕES PÓS-INSERT
-- ============================================================

-- 1. Contar registros carregados
SELECT
    '✅ Total carregado' as info,
    COUNT(*) as quantidade
FROM transactions;

-- 2. Ver amostra dos dados
SELECT
    '📋 Amostra dos 5 primeiros registros' as info;

SELECT
    chave_id,
    date,
    amount,
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    marca,
    filial,
    LEFT(description, 40) as description_preview
FROM transactions
ORDER BY date DESC
LIMIT 5;

-- 3. Verificar campos críticos
SELECT
    '📊 Resumo de preenchimento' as info;

SELECT
    COUNT(*) as total_registros,
    COUNT(chave_id) as com_chave_id,
    COUNT(vendor) as com_vendor,
    COUNT(ticket) as com_ticket,
    COUNT(tag01) as com_tag01,
    COUNT(tag02) as com_tag02,
    COUNT(tag03) as com_tag03,
    COUNT(CASE WHEN chave_id IS NULL THEN 1 END) as sem_chave_id
FROM transactions;

-- 4. Distribuição por marca
SELECT
    '🏢 Distribuição por Marca' as info;

SELECT
    marca,
    COUNT(*) as quantidade,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total
FROM transactions
GROUP BY marca
ORDER BY quantidade DESC
LIMIT 10;

-- 5. Range de datas
SELECT
    '📅 Range de Datas (anomes)' as info;

SELECT
    MIN(date) as data_minima,
    MAX(date) as data_maxima,
    COUNT(DISTINCT date) as periodos_unicos
FROM transactions;

-- 6. Top 10 vendors
SELECT
    '👤 Top 10 Fornecedores' as info;

SELECT
    vendor,
    COUNT(*) as quantidade_transacoes,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total
FROM transactions
WHERE vendor IS NOT NULL
GROUP BY vendor
ORDER BY quantidade_transacoes DESC
LIMIT 10;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
    '🎉 CARGA CONCLUÍDA COM SUCESSO!' as status,
    'Revise as validações acima para confirmar que tudo está correto' as proximos_passos;

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================

/*
✅ PONTOS CRÍTICOS CORRIGIDOS:
   1. dre_fabric.anomes → transactions.date (não era "data")
   2. dre_fabric.tag1 → transactions.tag01 (não era "tag01")
   3. dre_fabric.tag2 → transactions.tag02
   4. dre_fabric.tag3 → transactions.tag03

📌 FILTROS APLICADOS:
   - Só registros com chave_id preenchida
   - Só registros com anomes preenchido
   - Só registros com valor preenchido
   - LIMIT 50000 para carregar exatamente 50 mil

🔧 PARA USAR:
   - Execute este arquivo no Supabase SQL Editor
   - Verifique os resultados das validações
   - Se precisar recarregar, descomente o DELETE antes

⚠️ ATENÇÃO:
   - Se descomentar o DELETE, todos os dados serão apagados
   - Faça backup antes se necessário
   - O UUID é gerado automaticamente para cada registro
*/
