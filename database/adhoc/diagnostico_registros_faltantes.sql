-- ============================================
-- DIAGNÓSTICO: Por que há diferença na contagem do dre_fabric?
-- ============================================
-- Investigar diferença entre 108k esperado e 96k encontrado
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- 1. CONTAGEM TOTAL REAL DO DRE_FABRIC
-- ============================================

SELECT '📊 CONTAGEM TOTAL DO DRE_FABRIC' as diagnostico;

SELECT
  COUNT(*) as total_absoluto,
  COUNT(*) FILTER (WHERE chave IS NOT NULL) as total_com_chave,
  COUNT(*) FILTER (WHERE chave IS NULL) as total_sem_chave,
  COUNT(*) FILTER (WHERE type IS NOT NULL) as total_com_type,
  COUNT(*) FILTER (WHERE type IS NULL) as total_sem_type,
  COUNT(*) FILTER (WHERE chave IS NOT NULL AND type IS NOT NULL) as total_com_chave_e_type,
  COUNT(*) FILTER (WHERE chave IS NULL OR type IS NULL) as total_com_problema
FROM dre_fabric;

-- ============================================
-- 2. REGISTROS SEM CHAVE (chave = NULL)
-- ============================================

SELECT '❌ REGISTROS SEM CHAVE (chave IS NULL)' as diagnostico;

SELECT
  COUNT(*) as quantidade_sem_chave,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores
FROM dre_fabric
WHERE chave IS NULL;

-- Amostra dos registros sem chave
SELECT
  id,
  valor,
  LEFT(complemento, 40) as descricao,
  conta,
  filial,
  cia,
  tag1,
  tag_orc,
  type,
  anomes,
  created_at
FROM dre_fabric
WHERE chave IS NULL
LIMIT 10;

-- ============================================
-- 3. REGISTROS SEM TYPE (type = NULL)
-- ============================================

SELECT '⚠️ REGISTROS SEM TYPE (type IS NULL)' as diagnostico;

SELECT
  COUNT(*) as quantidade_sem_type,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores
FROM dre_fabric
WHERE type IS NULL;

-- Amostra dos registros sem type
SELECT
  chave,
  valor,
  LEFT(complemento, 40) as descricao,
  conta,
  filial,
  tag1,
  tag_orc,
  type,
  anomes
FROM dre_fabric
WHERE type IS NULL
LIMIT 10;

-- ============================================
-- 4. REGISTROS SEM CHAVE E SEM TYPE
-- ============================================

SELECT '❌❌ REGISTROS SEM CHAVE E SEM TYPE' as diagnostico;

SELECT
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual
FROM dre_fabric
WHERE chave IS NULL AND type IS NULL;

-- ============================================
-- 5. DISTRIBUIÇÃO POR TIPO DE PROBLEMA
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR TIPO DE PROBLEMA' as diagnostico;

SELECT
  CASE
    WHEN chave IS NULL AND type IS NULL THEN '❌ Sem CHAVE e sem TYPE'
    WHEN chave IS NULL AND type IS NOT NULL THEN '❌ Sem CHAVE (mas tem TYPE)'
    WHEN chave IS NOT NULL AND type IS NULL THEN '⚠️ Sem TYPE (mas tem CHAVE)'
    WHEN chave IS NOT NULL AND type IS NOT NULL THEN '✅ COM CHAVE e COM TYPE'
    ELSE '❓ OUTRO'
  END as situacao,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores
FROM dre_fabric
GROUP BY situacao
ORDER BY quantidade DESC;

-- ============================================
-- 6. VERIFICAR SE HÁ CHAVES DUPLICADAS
-- ============================================

SELECT '🔍 CHAVES DUPLICADAS NO DRE_FABRIC' as diagnostico;

SELECT
  chave,
  COUNT(*) as quantidade_duplicatas,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores,
  STRING_AGG(DISTINCT filial, ', ') as filiais,
  STRING_AGG(DISTINCT cia, ', ') as marcas
FROM dre_fabric
WHERE chave IS NOT NULL
GROUP BY chave
HAVING COUNT(*) > 1
ORDER BY quantidade_duplicatas DESC
LIMIT 20;

-- Total de chaves duplicadas
SELECT
  COUNT(*) as total_chaves_duplicadas,
  SUM(qtd) as total_registros_duplicados
FROM (
  SELECT chave, COUNT(*) as qtd
  FROM dre_fabric
  WHERE chave IS NOT NULL
  GROUP BY chave
  HAVING COUNT(*) > 1
) duplicatas;

-- ============================================
-- 7. ANÁLISE POR FILIAL DOS REGISTROS SEM CHAVE
-- ============================================

SELECT '📊 DISTRIBUIÇÃO POR FILIAL - REGISTROS SEM CHAVE' as diagnostico;

SELECT
  filial,
  COUNT(*) as quantidade_sem_chave,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NULL), 2) as percentual_do_total_sem_chave,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores
FROM dre_fabric
WHERE chave IS NULL
GROUP BY filial
ORDER BY quantidade_sem_chave DESC
LIMIT 15;

-- ============================================
-- 8. ANÁLISE POR TAG1/TAGORC DOS REGISTROS SEM TYPE
-- ============================================

SELECT '📊 TOP TAGS DOS REGISTROS SEM TYPE' as diagnostico;

SELECT
  tag1,
  tag_orc,
  COUNT(*) as quantidade,
  ROUND(SUM(valor)::NUMERIC, 2) as soma_valores
FROM dre_fabric
WHERE type IS NULL
GROUP BY tag1, tag_orc
ORDER BY quantidade DESC
LIMIT 20;

-- ============================================
-- 9. COMPARAÇÃO DE TOTAIS
-- ============================================

SELECT '💰 COMPARAÇÃO DE TOTAIS' as diagnostico;

SELECT
  'Total Absoluto' as categoria,
  (SELECT COUNT(*) FROM dre_fabric) as dre_fabric,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM dre_fabric) - (SELECT COUNT(*) FROM transactions) as diferenca
UNION ALL
SELECT
  'Total com CHAVE',
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL),
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL),
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
UNION ALL
SELECT
  'Total com CHAVE e TYPE',
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL AND type IS NOT NULL),
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL),
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NOT NULL AND type IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL);

-- ============================================
-- 10. RESUMO EXECUTIVO
-- ============================================

SELECT '🎯 RESUMO EXECUTIVO' as diagnostico;

WITH stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE chave IS NOT NULL) as com_chave,
    COUNT(*) FILTER (WHERE chave IS NULL) as sem_chave,
    COUNT(*) FILTER (WHERE type IS NOT NULL) as com_type,
    COUNT(*) FILTER (WHERE type IS NULL) as sem_type,
    COUNT(*) FILTER (WHERE chave IS NOT NULL AND type IS NOT NULL) as sincronizaveis
  FROM dre_fabric
)
SELECT
  total as total_registros_fabric,
  com_chave as registros_com_chave,
  sem_chave as registros_sem_chave,
  ROUND(sem_chave * 100.0 / total, 2) as percentual_sem_chave,
  com_type as registros_com_type,
  sem_type as registros_sem_type,
  ROUND(sem_type * 100.0 / total, 2) as percentual_sem_type,
  sincronizaveis as registros_sincronizaveis,
  ROUND(sincronizaveis * 100.0 / total, 2) as percentual_sincronizavel,
  total - sincronizaveis as registros_nao_sincronizaveis
FROM stats;

-- ============================================
-- 11. AÇÃO RECOMENDADA
-- ============================================

SELECT '💡 AÇÕES RECOMENDADAS' as diagnostico;

WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE chave IS NULL) as sem_chave,
    COUNT(*) FILTER (WHERE type IS NULL) as sem_type,
    COUNT(*) FILTER (WHERE chave IS NOT NULL AND type IS NOT NULL) as ok
  FROM dre_fabric
)
SELECT
  CASE
    WHEN sem_chave > 0 THEN
      '1. ❌ CRÍTICO: ' || sem_chave || ' registros SEM CHAVE - Investigar origem dos dados'
    ELSE
      '1. ✅ Todos os registros têm chave'
  END as acao_1,
  CASE
    WHEN sem_type > 0 THEN
      '2. ⚠️ IMPORTANTE: ' || sem_type || ' registros SEM TYPE - Executar classificação (trigger pode não ter rodado)'
    ELSE
      '2. ✅ Todos os registros têm type classificado'
  END as acao_2,
  CASE
    WHEN ok > 0 THEN
      '3. ✅ ' || ok || ' registros prontos para sincronização'
    ELSE
      '3. ❌ Nenhum registro pronto para sincronizar'
  END as acao_3
FROM stats;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT
  '✅ DIAGNÓSTICO COMPLETO!' as status,
  'Revise os relatórios acima para entender por que há diferença na contagem' as proxima_acao;

-- ============================================
-- EXPLICAÇÃO
-- ============================================

/*
📋 INTERPRETAÇÃO:

A diferença entre 108k e 96k pode ser causada por:

1️⃣ REGISTROS SEM CHAVE (chave IS NULL):
   - Esses registros NÃO PODEM ser sincronizados
   - Não têm identificador único
   - Podem ser registros temporários ou inválidos

2️⃣ REGISTROS SEM TYPE (type IS NULL):
   - O trigger de classificação pode não ter rodado
   - Ou as regras não classificaram (caíram em NULL em vez de '99. CADASTRAR TAG0')
   - Solução: Reclassificar com UPDATE

3️⃣ CHAVES DUPLICADAS:
   - Se houver chaves duplicadas, pode causar problemas
   - Precisa investigar e resolver antes de sincronizar

🔧 SOLUÇÕES:

Para registros SEM TYPE:
→ UPDATE dre_fabric SET type = classify_transaction_type(tag1, tag_orc) WHERE type IS NULL;

Para registros SEM CHAVE:
→ Investigar origem dos dados
→ Possivelmente registros inválidos ou temporários
→ Podem precisar ser excluídos ou ter chave gerada

Para CHAVES DUPLICADAS:
→ Investigar motivo da duplicação
→ Pode ser necessário consolidar ou manter apenas um registro
*/
