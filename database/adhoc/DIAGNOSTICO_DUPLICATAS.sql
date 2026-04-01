-- ================================================================================
-- DIAGNÓSTICO: Verificar duplicatas e identificar problema
-- ================================================================================

-- 1. Verificar duplicatas em DRE_FABRIC
SELECT '🔍 VERIFICANDO DUPLICATAS EM DRE_FABRIC' as etapa;

SELECT
  chave_id,
  COUNT(*) as quantidade
FROM dre_fabric
WHERE type IS NOT NULL
  AND chave_id IS NOT NULL
GROUP BY chave_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Se retornar registros, há duplicatas no dre_fabric!

-- 2. Verificar quantos chave_id únicos existem
SELECT '📊 CONTAGEM DE CHAVE_ID ÚNICOS' as etapa;

SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as unicos_dre_fabric,
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as unicos_transactions,
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as gap_real;

-- 3. Listar alguns chave_id que FALTAM
SELECT '📝 EXEMPLOS DE CHAVE_ID QUE FALTAM' as etapa;

SELECT DISTINCT df.chave_id
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
  )
LIMIT 10;

-- 4. Verificar se o chave_id do erro existe em ambas as tabelas
SELECT '🔍 VERIFICANDO CHAVE_ID DO ERRO: 10-540051-4' as etapa;

SELECT
  'DRE_FABRIC' as tabela,
  COUNT(*) as quantidade,
  string_agg(DISTINCT type, ', ') as tipos
FROM dre_fabric
WHERE chave_id = '10-540051-4'

UNION ALL

SELECT
  'TRANSACTIONS' as tabela,
  COUNT(*) as quantidade,
  string_agg(DISTINCT type, ', ') as tipos
FROM transactions
WHERE chave_id = '10-540051-4';

-- ================================================================================
-- RESULTADO: Mostrará onde está o problema
-- ================================================================================
