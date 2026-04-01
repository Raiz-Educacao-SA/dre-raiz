-- ============================================================
-- INSERT 50K REGISTROS - VERSÃO 2 CORRIGIDA
-- ============================================================
-- Data: 2026-02-03
-- Correção: dre_fabric.conta → transactions.conta_contabil
-- ============================================================

-- OPCIONAL: Limpar antes de inserir
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
    subcategory,
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
    gen_random_uuid()::text,                     -- id: UUID único
    df.chave_id,                                 -- chave_id
    df.anomes,                                   -- date ← anomes
    COALESCE(df.complemento, 'Sem descrição'),  -- description
    NULL,                                         -- category (não mapeado)
    NULL,                                         -- subcategory (não mapeado)
    COALESCE(df.valor, 0),                      -- amount
    df.conta,                                    -- ✅ conta_contabil ← conta
    df.cia,                                      -- marca
    df.filial,                                   -- filial
    df.fornecedor_padrao,                        -- vendor
    df.ticket,                                   -- ticket
    df.tag1,                                     -- tag01
    df.tag2,                                     -- tag02
    df.tag3,                                     -- tag03
    COALESCE(df.type, 'REVENUE'),               -- type
    COALESCE(df.scenario, 'Real'),              -- scenario
    COALESCE(df.status, 'Normal'),              -- status
    NULL,                                         -- nat_orc (não mapeado)
    NULL                                          -- recurring (não mapeado)
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.anomes IS NOT NULL
  AND df.valor IS NOT NULL
LIMIT 50000;

-- ============================================================
-- VALIDAÇÕES
-- ============================================================

-- 1. Total carregado
SELECT
    '✅ Total carregado' as info,
    COUNT(*) as quantidade
FROM transactions;

-- 2. Amostra com conta_contabil
SELECT
    '📋 Amostra dos primeiros 5 registros' as info;

SELECT
    chave_id,
    date,
    amount,
    conta_contabil,      -- ✅ Verificar se veio preenchido
    vendor,
    ticket,
    tag01,
    tag02,
    tag03,
    marca,
    filial
FROM transactions
ORDER BY date DESC
LIMIT 5;

-- 3. Verificar preenchimento de conta_contabil
SELECT
    '📊 Validação de conta_contabil' as info;

SELECT
    COUNT(*) as total_registros,
    COUNT(conta_contabil) as com_conta_contabil,
    COUNT(*) - COUNT(conta_contabil) as sem_conta_contabil,
    ROUND(COUNT(conta_contabil)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as percentual_preenchido
FROM transactions;

-- 4. Top 10 contas contábeis mais usadas
SELECT
    '🔢 Top 10 Contas Contábeis' as info;

SELECT
    conta_contabil,
    COUNT(*) as quantidade,
    ROUND(SUM(amount)::NUMERIC, 2) as valor_total
FROM transactions
WHERE conta_contabil IS NOT NULL
GROUP BY conta_contabil
ORDER BY quantidade DESC
LIMIT 10;

-- 5. Resumo geral
SELECT
    '📊 Resumo Geral' as info;

SELECT
    COUNT(*) as total_registros,
    COUNT(chave_id) as com_chave_id,
    COUNT(conta_contabil) as com_conta_contabil,
    COUNT(vendor) as com_vendor,
    COUNT(ticket) as com_ticket,
    COUNT(tag01) as com_tag01,
    COUNT(tag02) as com_tag02,
    COUNT(tag03) as com_tag03
FROM transactions;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
    '🎉 CARGA CONCLUÍDA!' as status,
    'Verifique se conta_contabil está preenchida corretamente' as validacao;

-- ============================================================
-- MAPEAMENTO APLICADO
-- ============================================================

/*
✅ MAPEAMENTO CORRETO:
   dre_fabric.chave_id          → transactions.chave_id
   dre_fabric.anomes            → transactions.date
   dre_fabric.complemento       → transactions.description
   dre_fabric.conta             → transactions.conta_contabil  ✅ CORRIGIDO
   dre_fabric.valor             → transactions.amount
   dre_fabric.cia               → transactions.marca
   dre_fabric.filial            → transactions.filial
   dre_fabric.fornecedor_padrao → transactions.vendor
   dre_fabric.ticket            → transactions.ticket
   dre_fabric.tag1              → transactions.tag01
   dre_fabric.tag2              → transactions.tag02
   dre_fabric.tag3              → transactions.tag03
   dre_fabric.type              → transactions.type
   dre_fabric.scenario          → transactions.scenario
   dre_fabric.status            → transactions.status

❌ NÃO MAPEADO:
   transactions.category        → NULL
   transactions.subcategory     → NULL
   transactions.nat_orc         → NULL
   transactions.recurring       → NULL
*/
