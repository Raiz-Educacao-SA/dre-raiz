-- ============================================================
-- TESTE: Visualizar 50k registros QUE SERIAM carregados
-- ⚠️ ESTE SCRIPT NÃO APAGA NADA - Apenas mostra os dados
-- Data: 2026-02-03
-- ============================================================

-- ============================================================
-- PREVIEW: Ver exatamente o que seria inserido
-- ============================================================

SELECT
    '📊 PREVIEW: Primeiros 20 registros que seriam carregados' as info;

SELECT
    gen_random_uuid()::text as id_gerado,
    df.chave_id,
    df.data as date,
    COALESCE(df.complemento, 'Sem descrição') as description,
    COALESCE(df.conta, 'Outros') as category,
    COALESCE(df.valor, 0) as amount,
    df.cia as marca,
    df.filial,
    df.fornecedor_padrao as vendor,
    df.ticket,
    df.tag1 as tag01,
    df.tag2 as tag02,
    df.tag3 as tag03,
    COALESCE(df.type, 'REVENUE') as type,
    COALESCE(df.scenario, 'Real') as scenario,
    COALESCE(df.status, 'Normal') as status
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.data IS NOT NULL
  AND df.valor IS NOT NULL
LIMIT 20;

-- ============================================================
-- CONTAGEM: Quantos registros seriam carregados
-- ============================================================

SELECT
    '📊 Análise dos 50.000 registros que seriam carregados' as info;

WITH preview AS (
    SELECT
        df.chave_id,
        df.data,
        df.complemento,
        df.conta,
        df.valor,
        df.cia,
        df.filial,
        df.fornecedor_padrao,
        df.ticket,
        df.tag1,
        df.tag2,
        df.tag3,
        df.type,
        df.scenario,
        df.status
    FROM dre_fabric df
    WHERE df.chave_id IS NOT NULL
      AND df.data IS NOT NULL
      AND df.valor IS NOT NULL
    LIMIT 50000
)
SELECT
    COUNT(*) as total_registros,
    COUNT(chave_id) as com_chave_id,
    COUNT(fornecedor_padrao) as com_vendor,
    COUNT(ticket) as com_ticket,
    COUNT(tag1) as com_tag1,
    COUNT(tag2) as com_tag2,
    COUNT(tag3) as com_tag3,
    MIN(data) as data_min,
    MAX(data) as data_max,
    ROUND(MIN(valor)::NUMERIC, 2) as valor_min,
    ROUND(MAX(valor)::NUMERIC, 2) as valor_max,
    ROUND(AVG(valor)::NUMERIC, 2) as valor_medio,
    ROUND(SUM(valor)::NUMERIC, 2) as valor_total
FROM preview;

-- ============================================================
-- DISTRIBUIÇÃO: Ver distribuição dos dados
-- ============================================================

SELECT
    '📊 Distribuição por Marca (nos 50k)' as info;

SELECT
    cia as marca,
    COUNT(*) as quantidade,
    ROUND(COUNT(*)::NUMERIC / 50000 * 100, 2) as percentual,
    ROUND(SUM(valor)::NUMERIC, 2) as valor_total
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.data IS NOT NULL
  AND df.valor IS NOT NULL
LIMIT 50000
GROUP BY cia
ORDER BY quantidade DESC;

-- ============================================================
-- TOP VENDORS: Ver principais fornecedores
-- ============================================================

SELECT
    '👤 Top 10 Vendors (fornecedores)' as info;

SELECT
    fornecedor_padrao as vendor,
    COUNT(*) as quantidade_transacoes,
    ROUND(SUM(valor)::NUMERIC, 2) as valor_total
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.data IS NOT NULL
  AND df.valor IS NOT NULL
  AND fornecedor_padrao IS NOT NULL
LIMIT 50000
GROUP BY fornecedor_padrao
ORDER BY quantidade_transacoes DESC
LIMIT 10;

-- ============================================================
-- VALIDAR TAGS: Verificar preenchimento das tags
-- ============================================================

SELECT
    '🏷️ Análise de Tags' as info;

SELECT
    COUNT(*) as total,
    COUNT(tag1) as tem_tag1,
    COUNT(tag2) as tem_tag2,
    COUNT(tag3) as tem_tag3,
    ROUND(COUNT(tag1)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as perc_tag1,
    ROUND(COUNT(tag2)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as perc_tag2,
    ROUND(COUNT(tag3)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as perc_tag3
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.data IS NOT NULL
  AND df.valor IS NOT NULL
LIMIT 50000;

-- ============================================================
-- VERIFICAR SE HÁ REGISTROS DISPONÍVEIS
-- ============================================================

SELECT
    '✅ Verificação Final' as info;

SELECT
    CASE
        WHEN COUNT(*) >= 50000 THEN '✅ OK: Há 50.000+ registros disponíveis para carga'
        WHEN COUNT(*) > 0 THEN '⚠️ ATENÇÃO: Apenas ' || COUNT(*) || ' registros disponíveis (menos que 50k)'
        ELSE '❌ ERRO: Nenhum registro disponível!'
    END as status,
    COUNT(*) as registros_disponiveis
FROM dre_fabric df
WHERE df.chave_id IS NOT NULL
  AND df.data IS NOT NULL
  AND df.valor IS NOT NULL;

-- ============================================================
-- INSTRUÇÕES
-- ============================================================

SELECT
    '📋 PRÓXIMOS PASSOS' as secao;

SELECT
    '1. Revise os dados acima' as passo_1,
    '2. Se estiver tudo OK, execute: RECARGA_50K_TRANSACTIONS.sql' as passo_2,
    '3. Aquele script fará backup automático antes de apagar' as passo_3,
    '4. Use BEGIN/COMMIT para poder fazer ROLLBACK se necessário' as passo_4;

-- ============================================================
-- FIM DO TESTE
-- ============================================================
