-- ============================================
-- VERIFICAÇÃO SIMPLES: Onde estão as chaves nulas?
-- ============================================
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- 1. VERIFICAR DRE_FABRIC (ORIGEM)
-- ============================================

SELECT '📊 DRE_FABRIC (ORIGEM)' as tabela;

SELECT
  COUNT(*) as total_registros,
  COUNT(chave) as registros_com_chave,
  COUNT(*) - COUNT(chave) as registros_SEM_chave,
  ROUND((COUNT(*) - COUNT(chave)) * 100.0 / COUNT(*), 2) as percentual_sem_chave
FROM dre_fabric;

-- Amostra de registros SEM chave no dre_fabric
SELECT '❌ AMOSTRA: Registros SEM CHAVE no dre_fabric' as info;

SELECT
  id,
  chave,  -- NULL
  valor,
  LEFT(complemento, 40) as descricao,
  conta,
  filial,
  cia,
  tag1,
  tag_orc,
  type,
  anomes
FROM dre_fabric
WHERE chave IS NULL
LIMIT 10;

-- ============================================
-- 2. VERIFICAR TRANSACTIONS (DESTINO)
-- ============================================

SELECT '📊 TRANSACTIONS (DESTINO)' as tabela;

SELECT
  COUNT(*) as total_registros,
  COUNT(chave_id) as registros_com_chave_id,
  COUNT(*) - COUNT(chave_id) as registros_SEM_chave_id,
  ROUND((COUNT(*) - COUNT(chave_id)) * 100.0 / COUNT(*), 2) as percentual_sem_chave_id
FROM transactions;

-- Amostra de registros SEM chave_id no transactions (se houver)
SELECT '⚠️ AMOSTRA: Registros SEM CHAVE_ID no transactions' as info;

SELECT
  id,
  chave_id,  -- NULL?
  date,
  LEFT(description, 40) as descricao,
  amount,
  filial,
  marca
FROM transactions
WHERE chave_id IS NULL
LIMIT 10;

-- ============================================
-- 3. RESUMO EXECUTIVO
-- ============================================

SELECT '🎯 RESUMO' as info;

SELECT
  'dre_fabric' as tabela,
  'chave' as coluna,
  (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NULL) as registros_nulos,
  (SELECT COUNT(*) FROM dre_fabric) as total,
  ROUND((SELECT COUNT(*) FROM dre_fabric WHERE chave IS NULL) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual_nulo
UNION ALL
SELECT
  'transactions' as tabela,
  'chave_id' as coluna,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NULL) as registros_nulos,
  (SELECT COUNT(*) FROM transactions) as total,
  ROUND((SELECT COUNT(*) FROM transactions WHERE chave_id IS NULL) * 100.0 / NULLIF((SELECT COUNT(*) FROM transactions), 0), 2) as percentual_nulo;

-- ============================================
-- 4. RESPOSTA DIRETA
-- ============================================

SELECT '💡 RESPOSTA DIRETA' as info;

WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NULL) as fabric_sem_chave,
    (SELECT COUNT(*) FROM transactions WHERE chave_id IS NULL) as trans_sem_chave_id
)
SELECT
  CASE
    WHEN fabric_sem_chave > 0 THEN
      '❌ PROBLEMA ESTÁ NO DRE_FABRIC: ' || fabric_sem_chave || ' registros com CHAVE = NULL'
    ELSE
      '✅ Todos os registros do dre_fabric TÊM chave'
  END as problema_origem,
  CASE
    WHEN trans_sem_chave_id > 0 THEN
      '⚠️ TRANSACTIONS também tem problema: ' || trans_sem_chave_id || ' registros com CHAVE_ID = NULL'
    ELSE
      '✅ Todos os registros de transactions TÊM chave_id'
  END as problema_destino
FROM stats;

-- ============================================
-- 5. O QUE FAZER?
-- ============================================

SELECT '🔧 O QUE FAZER?' as info;

WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM dre_fabric WHERE chave IS NULL) as fabric_sem_chave
)
SELECT
  CASE
    WHEN fabric_sem_chave > 0 THEN
      'AÇÃO 1: Investigar por que há registros sem CHAVE no dre_fabric'
    ELSE
      'AÇÃO 1: ✅ Nenhuma ação necessária - todos têm chave'
  END as acao_1,
  CASE
    WHEN fabric_sem_chave > 0 THEN
      'AÇÃO 2: Decidir se exclui esses registros OU gera uma chave para eles'
    ELSE
      'AÇÃO 2: ✅ Pronto para sincronizar'
  END as acao_2,
  CASE
    WHEN fabric_sem_chave > 0 THEN
      'AÇÃO 3: Após corrigir, executar sincronização completa'
    ELSE
      'AÇÃO 3: ✅ Executar: SELECT * FROM sync_dre_fabric_to_transactions(NULL);'
  END as acao_3
FROM stats;
