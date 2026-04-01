-- ============================================================
-- SCRIPT CORRETO: Carga de dre_fabric para transactions
-- Data: 2026-02-03
-- ============================================================

-- ⚠️ IMPORTANTE: Este script corrige o mapeamento de colunas
--
-- ✅ CORRETO:
--    dre_fabric.chave_id → transactions.chave_id
--    dre_fabric.fornecedor_padrao → transactions.vendor
--    dre_fabric.ticket → transactions.ticket
--
-- ❌ ERRADO:
--    dre_fabric.id → transactions.chave_id (NÃO!)
--    dre_fabric.chave → transactions.chave_id (CAMPO ANTIGO!)

BEGIN;

-- ============================================================
-- OPÇÃO 1: INSERIR NOVOS REGISTROS (se tabela está vazia)
-- ============================================================

INSERT INTO transactions (
    id,              -- UUID gerado
    chave_id,        -- ✅ dre_fabric.chave_id
    date,            -- dre_fabric.data
    description,     -- dre_fabric.complemento
    category,        -- dre_fabric.conta (ou JOIN com conta_contabil)
    amount,          -- dre_fabric.valor
    marca,           -- dre_fabric.cia
    filial,          -- dre_fabric.filial
    vendor,          -- ✅ dre_fabric.fornecedor_padrao
    ticket,          -- ✅ dre_fabric.ticket
    tag01,           -- dre_fabric.tag01
    tag02,           -- dre_fabric.tag2
    tag03,           -- dre_fabric.tag3
    type,            -- dre_fabric.type
    scenario,        -- dre_fabric.scenario
    status,          -- dre_fabric.status
    nat_orc,         -- dre_fabric.tag_orc
    recurring        -- dre_fabric.recorrente
)
SELECT
    gen_random_uuid()::text,         -- Gerar novo UUID
    df.chave_id,                      -- ✅ CORRETO: chave_id → chave_id
    df.data,
    df.complemento,
    df.conta,                         -- Ou fazer JOIN com conta_contabil
    df.valor,
    df.cia,
    df.filial,
    df.fornecedor_padrao,             -- ✅ CORRETO: fornecedor_padrao → vendor
    df.ticket,                        -- ✅ CORRETO: ticket → ticket
    df.tag01,
    df.tag2,
    df.tag3,
    COALESCE(df.type, 'REVENUE'),     -- Type (com fallback)
    COALESCE(df.scenario, 'Real'),    -- Scenario (padrão: Real)
    COALESCE(df.status, 'Normal'),    -- Status (padrão: Normal)
    df.tag_orc,
    df.recorrente
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL         -- ⚠️ Só carregar registros com chave_id
  AND df.data IS NOT NULL             -- ⚠️ Só carregar registros com data
  AND NOT EXISTS (
    -- Evitar duplicatas: não inserir se já existe
    SELECT 1 FROM transactions t
    WHERE t.chave_id = df.chave_id
  );

-- ============================================================
-- OPÇÃO 2: ATUALIZAR REGISTROS EXISTENTES (corrigir dados errados)
-- ============================================================

-- Se você já carregou os dados ERRADOS e precisa CORRIGIR:

UPDATE transactions t
SET
    chave_id = df.chave_id,           -- ✅ Corrigir: usar chave_id em vez de id
    vendor = df.fornecedor_padrao,    -- ✅ Corrigir: usar fornecedor_padrao
    ticket = df.ticket                -- ✅ Corrigir: usar ticket correto
FROM dre_fabric df
WHERE t.id = df.id                    -- Usar o ID do Supabase para fazer o match
  AND df.chave_id IS NOT NULL;

-- ============================================================
-- VALIDAÇÃO: Verificar se o mapeamento está correto
-- ============================================================

-- 1. Contar registros carregados
SELECT
    COUNT(*) as total_transactions,
    COUNT(chave_id) as com_chave_id,
    COUNT(vendor) as com_vendor,
    COUNT(ticket) as com_ticket
FROM transactions;

-- 2. Verificar amostra de 10 registros
SELECT
    t.id as transaction_id,
    t.chave_id as trans_chave_id,
    t.vendor as trans_vendor,
    t.ticket as trans_ticket,
    df.chave_id as fabric_chave_id,
    df.fornecedor_padrao as fabric_vendor,
    df.ticket as fabric_ticket
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id
LIMIT 10;

-- 3. Verificar se há registros com chave_id que é UUID (ERRO!)
SELECT
    COUNT(*) as registros_com_uuid_errado
FROM transactions
WHERE chave_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Se retornar > 0, significa que tem UUIDs na coluna chave_id (ERRO!)

-- 4. Verificar se chave_id tem formato correto (números)
SELECT
    COUNT(*) as registros_com_chave_id_correta
FROM transactions
WHERE chave_id ~ '^[0-9]+$';
-- Se retornar 0, significa que NÃO tem chaves numéricas (ERRO!)

-- 5. Verificar correspondência com dre_fabric
SELECT
    COUNT(*) as total_transactions,
    COUNT(df.chave_id) as com_match_fabric,
    COUNT(*) - COUNT(df.chave_id) as sem_match_fabric
FROM transactions t
LEFT JOIN dre_fabric df ON t.chave_id = df.chave_id;

COMMIT;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT
    '✅ Carga concluída com sucesso!' as status,
    'Verifique os resultados acima para confirmar que o mapeamento está correto' as proximos_passos;

-- ============================================================
-- OBSERVAÇÕES IMPORTANTES
-- ============================================================

/*
1. ✅ CORRETO:
   - dre_fabric.chave_id → transactions.chave_id
   - dre_fabric.fornecedor_padrao → transactions.vendor
   - dre_fabric.ticket → transactions.ticket

2. ❌ ERRADO (NÃO FAÇA ISSO!):
   - dre_fabric.id → transactions.chave_id
   - dre_fabric.chave → transactions.chave_id
   - dre_fabric.fornecedor_original → transactions.vendor

3. 📊 VALIDAÇÃO:
   - chave_id deve ter valores numéricos (ex: "49274221765574")
   - chave_id NÃO deve ter UUIDs (ex: "ec371cd7-...")
   - vendor deve ter nomes de fornecedores
   - ticket pode estar vazio (muitos registros não têm)

4. 🔄 SE PRECISAR RECARREGAR:
   - DELETE FROM transactions; (apaga tudo)
   - Execute o OPÇÃO 1 novamente

5. 🔧 SE PRECISAR CORRIGIR:
   - Execute o OPÇÃO 2 para atualizar registros existentes
*/
