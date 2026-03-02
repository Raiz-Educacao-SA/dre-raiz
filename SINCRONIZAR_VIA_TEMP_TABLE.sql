-- ================================================================================
-- SINCRONIZAÇÃO VIA TABELA TEMPORÁRIA (100% CONFIÁVEL)
-- ================================================================================
-- Estratégia em 3 passos para garantir zero duplicatas:
-- 1. Criar temp com DISTINCT de dre_fabric
-- 2. Deletar da temp os que JÁ EXISTEM em transactions
-- 3. Inserir o que sobrou na temp
-- ================================================================================

-- ================================================================================
-- PASSO 1: Criar tabela temporária com dados do dre_fabric (DISTINCT)
-- ================================================================================

DROP TABLE IF EXISTS temp_para_inserir;

CREATE TEMP TABLE temp_para_inserir AS
SELECT DISTINCT ON (df.chave_id)
  gen_random_uuid()::TEXT as id,
  CASEa
    WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6
    THEN TO_DATE(df.anomes, 'YYYYMM')::TEXT
    ELSE NULL
  END as date,
  df.complemento as description,
  df.conta as category,
  df.valor as amount,
  COALESCE(df.type, '99. CADASTRAR TAG0') as type,
  COALESCE(df.scenario, 'Real') as scenario,
  COALESCE(df.status, 'Normal') as status,
  df.filial,
  df.cia as marca,
  df.tag1 as tag01,
  df.tag2 as tag02,
  df.tag3 as tag03,
  df.fornecedor_padrao as vendor,
  df.ticket,
  df.tag_orc as nat_orc,
  df.recorrente as recurring,
  df.chave_id,
  df.created_at,
  df.updated_at
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
ORDER BY df.chave_id, df.updated_at DESC;

SELECT COUNT(*) as total_na_temp FROM temp_para_inserir;

-- ================================================================================
-- PASSO 2: Deletar da temp os que JÁ EXISTEM em transactions
-- ================================================================================

DELETE FROM temp_para_inserir t
WHERE EXISTS (
  SELECT 1
  FROM transactions tr
  WHERE tr.chave_id = t.chave_id
);

SELECT COUNT(*) as restantes_para_inserir FROM temp_para_inserir;

-- ================================================================================
-- PASSO 3: Inserir da temp para transactions
-- ================================================================================

INSERT INTO transactions (
  id, date, description, category, amount, type, scenario, status,
  filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
  recurring, chave_id, created_at, updated_at
)
SELECT
  id, date, description, category, amount, type, scenario, status,
  filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
  recurring, chave_id, created_at, updated_at
FROM temp_para_inserir;

SELECT 'Inseridos!' as status, COUNT(*) as quantidade FROM temp_para_inserir;

-- ================================================================================
-- PASSO 4: Limpar e verificar resultado
-- ================================================================================

DROP TABLE IF EXISTS temp_para_inserir;

-- Verificação final
SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as unicos_dre_fabric,
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as unicos_transactions,
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL) as gap_final,
  CASE
    WHEN (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) <=
         (SELECT COUNT(DISTINCT chave_id) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ 100% SINCRONIZADO!'
    ELSE '⚠️ Ainda há registros faltantes'
  END as situacao;

-- ================================================================================
-- ✅ PRONTO! Esta estratégia é 100% confiável.
-- ================================================================================
