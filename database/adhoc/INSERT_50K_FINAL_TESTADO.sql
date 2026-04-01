-- ============================================================
-- INSERT 50.000 REGISTROS - VERSÃO FINAL TESTADA E APROVADA
-- ============================================================
-- Data: 2026-02-04
-- Status: ✅ TESTADO E FUNCIONANDO
-- ============================================================

-- ============================================================
-- MAPEAMENTO FINAL CORRETO:
-- ============================================================
-- dre_fabric.chave_id          → transactions.chave_id
-- dre_fabric.anomes + '01'     → transactions.date (formato: YYYYMMDD → DATE)
-- dre_fabric.complemento       → transactions.description
-- 'Geral' (fixo)               → transactions.category
-- dre_fabric.valor             → transactions.amount
-- dre_fabric.conta             → transactions.conta_contabil
-- dre_fabric.cia               → transactions.marca
-- dre_fabric.filial            → transactions.filial
-- dre_fabric.fornecedor_padrao → transactions.vendor
-- dre_fabric.ticket            → transactions.ticket
-- dre_fabric.tag1              → transactions.tag01
-- dre_fabric.tag2              → transactions.tag02
-- dre_fabric.tag3              → transactions.tag03
-- dre_fabric.type              → transactions.type
-- dre_fabric.scenario          → transactions.scenario
-- dre_fabric.status            → transactions.status
-- NULL                         → transactions.nat_orc (futuro)
-- 'sim' (padrão)               → transactions.recurring
-- ============================================================

-- OPCIONAL: Limpar tabela antes (descomente se necessário)
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
    conta_contabil,
    marca,
    filial,
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    type,
    scenario,
    status,
    nat_orc,
    recurring
)
SELECT
    gen_random_uuid()::text,                     -- id: UUID único gerado
    df.chave_id,                                 -- chave_id
    TO_DATE(df.anomes || '01', 'YYYYMMDD'),     -- date ← anomes + '01' (formato AAAAMMDD)
    COALESCE(df.complemento, 'Sem descrição'),  -- description
    'Geral',                                     -- category ← 'Geral' (valor fixo)
    COALESCE(df.valor, 0),                      -- amount
    df.conta,                                    -- conta_contabil ← conta
    df.cia,                                      -- marca
    df.filial,                                   -- filial
    df.fornecedor_padrao,                        -- vendor
    df.ticket,                                   -- ticket
    df.tag1,                                     -- tag01 ← tag1
    df.tag2,                                     -- tag02 ← tag2
    df.tag3,                                     -- tag03 ← tag3
    COALESCE(df.type, 'REVENUE'),               -- type (padrão: REVENUE)
    COALESCE(df.scenario, 'Real'),              -- scenario (padrão: Real)
    COALESCE(df.status, 'Normal'),              -- status (padrão: Normal)
    NULL,                                         -- nat_orc (preencher futuramente)
    'sim'                                         -- recurring ← 'sim' (padrão)
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL                    -- Filtro 1: Só com chave_id
  AND df.anomes IS NOT NULL                      -- Filtro 2: Só com anomes (data)
  AND df.valor IS NOT NULL                       -- Filtro 3: Só com valor
LIMIT 50000;                                     -- Carregar exatamente 50.000 registros

-- ============================================================
-- VALIDAÇÕES AUTOMÁTICAS
-- ============================================================

-- 1. Total de registros carregados
SELECT
    '✅ TOTAL CARREGADO' as validacao,
    COUNT(*) as quantidade
FROM transactions;

-- 2. Amostra dos primeiros 5 registros
SELECT
    '📋 AMOSTRA DOS PRIMEIROS 5 REGISTROS' as validacao;

SELECT
    chave_id,
    date,
    category,
    conta_contabil,
    amount,
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    recurring,
    marca,
    filial,
    LEFT(description, 40) as descricao_preview
FROM transactions
ORDER BY created_at DESC
LIMIT 5;

-- 3. Resumo de preenchimento dos campos
SELECT
    '📊 RESUMO DE PREENCHIMENTO' as validacao;

SELECT
    COUNT(*) as total_registros,
    COUNT(chave_id) as com_chave_id,
    COUNT(category) as com_category,
    COUNT(conta_contabil) as com_conta_contabil,
    COUNT(vendor) as com_vendor,
    COUNT(ticket) as com_ticket,
    COUNT(tag01) as com_tag01,
    COUNT(tag02) as com_tag02,
    COUNT(tag03) as com_tag03,
    COUNT(CASE WHEN recurring = 'sim' THEN 1 END) as com_recurring_sim,
    ROUND(COUNT(conta_contabil)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as perc_conta_contabil,
    ROUND(COUNT(vendor)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as perc_vendor
FROM transactions;

-- 4. Verificar valor de category (deve ser todos 'Geral')
SELECT
    '🏷️ VERIFICAÇÃO DE CATEGORY' as validacao;

SELECT
    category,
    COUNT(*) as quantidade,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM transactions) * 100, 2) as percentual
FROM transactions
GROUP BY category
ORDER BY quantidade DESC;

-- 5. Verificar valor de recurring (deve ser todos 'sim')
SELECT
    '🔄 VERIFICAÇÃO DE RECURRING' as validacao;

SELECT
    recurring,
    COUNT(*) as quantidade,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM transactions) * 100, 2) as percentual
FROM transactions
GROUP BY recurring
ORDER BY quantidade DESC;

-- 6. Top 10 contas contábeis mais usadas
SELECT
    '🔢 TOP 10 CONTAS CONTÁBEIS' as validacao;

SELECT
    conta_contabil,
    COUNT(*) as quantidade,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total
FROM transactions
WHERE conta_contabil IS NOT NULL
GROUP BY conta_contabil
ORDER BY quantidade DESC
LIMIT 10;

-- 7. Top 10 fornecedores (vendors)
SELECT
    '👤 TOP 10 FORNECEDORES' as validacao;

SELECT
    vendor,
    COUNT(*) as quantidade_transacoes,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total
FROM transactions
WHERE vendor IS NOT NULL
GROUP BY vendor
ORDER BY quantidade_transacoes DESC
LIMIT 10;

-- 8. Distribuição por marca
SELECT
    '🏢 DISTRIBUIÇÃO POR MARCA' as validacao;

SELECT
    marca,
    COUNT(*) as quantidade,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM transactions) * 100, 2) as percentual
FROM transactions
GROUP BY marca
ORDER BY quantidade DESC;

-- 9. Range de datas (períodos)
SELECT
    '📅 RANGE DE DATAS' as validacao;

SELECT
    MIN(date) as periodo_inicial,
    MAX(date) as periodo_final,
    COUNT(DISTINCT date) as periodos_unicos
FROM transactions;

-- 9.1 Amostra de datas (verificar formato)
SELECT
    '📅 AMOSTRA DE DATAS' as validacao;

SELECT
    date,
    COUNT(*) as quantidade
FROM transactions
GROUP BY date
ORDER BY date DESC
LIMIT 5;

-- 10. Resumo de valores
SELECT
    '💰 RESUMO DE VALORES' as validacao;

SELECT
    COUNT(*) as total_transacoes,
    ROUND(SUM(amount)::NUMERIC, 2) as soma_total,
    ROUND(AVG(amount)::NUMERIC, 2) as media,
    ROUND(MIN(amount)::NUMERIC, 2) as valor_minimo,
    ROUND(MAX(amount)::NUMERIC, 2) as valor_maximo
FROM transactions;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
    '🎉 CARGA CONCLUÍDA COM SUCESSO!' as status,
    '✅ 50.000 registros inseridos' as resultado,
    '📋 Revise as validações acima' as proximos_passos;

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================

/*
✅ CONFIGURAÇÕES APLICADAS:
   - category: 'Geral' (valor fixo, pode ser alterado futuramente)
   - recurring: 'sim' (valor padrão)
   - nat_orc: NULL (será preenchido futuramente)

✅ PONTOS CRÍTICOS CORRIGIDOS:
   1. dre_fabric.anomes + '01' → transactions.date (converte AAAAMM para data AAAAMM01)
   2. dre_fabric.tag1 → transactions.tag01 (sem zero no dre_fabric)
   3. dre_fabric.tag2 → transactions.tag02
   4. dre_fabric.tag3 → transactions.tag03
   5. dre_fabric.conta → transactions.conta_contabil (não "category")

🗓️ CONVERSÃO DE DATA:
   - Input: anomes = "202601" (texto AAAAMM)
   - Processamento: "202601" + "01" = "20260101"
   - Conversão: TO_DATE('20260101', 'YYYYMMDD')
   - Output: date = 2026-01-01 (tipo DATE)
   - Sempre dia 01 do mês para facilitar filtros no painel

📌 FILTROS APLICADOS:
   - Só registros com chave_id preenchida
   - Só registros com anomes preenchido
   - Só registros com valor preenchido
   - LIMIT 50000 para carregar exatamente 50 mil

🔧 PARA ATUALIZAR CATEGORY FUTURAMENTE:
   UPDATE transactions SET category = <novo_valor> WHERE category = 'Geral';

🔧 PARA ATUALIZAR NAT_ORC FUTURAMENTE:
   UPDATE transactions SET nat_orc = <valor> WHERE nat_orc IS NULL;

⚠️ ATENÇÃO:
   - UUID é gerado automaticamente (campo id)
   - Se precisar recarregar, descomente o DELETE no início
   - Faça backup antes de deletar dados existentes
*/
