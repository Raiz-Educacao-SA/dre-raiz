-- ================================================================================
-- SINCRONIZAÇÃO INTELIGENTE: Apenas registros que realmente faltam
-- ================================================================================
-- Usa CTE para identificar exatamente quais chave_id faltam
-- Depois insere apenas esses
-- ================================================================================

-- Passo 1: Criar tabela temporária com chave_id que JÁ EXISTEM
CREATE TEMP TABLE IF NOT EXISTS temp_existentes AS
SELECT DISTINCT chave_id
FROM transactions
WHERE chave_id IS NOT NULL;

-- Verificar
SELECT COUNT(*) as total_ja_existentes FROM temp_existentes;

-- Passo 2: Inserir APENAS os que NÃO estão na tabela temp
INSERT INTO transactions (
  id,
  date,
  description,
  category,
  amount,
  type,
  scenario,
  status,
  filial,
  marca,
  tag01,
  tag02,
  tag03,
  vendor,
  ticket,
  nat_orc,
  recurring,
  chave_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::TEXT,
  CASE
    WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6
    THEN TO_DATE(df.anomes, 'YYYYMM')::TEXT
    ELSE NULL
  END,
  df.complemento,
  df.conta,
  df.valor,
  COALESCE(df.type, '99. CADASTRAR TAG0'),
  COALESCE(df.scenario, 'Real'),
  COALESCE(df.status, 'Normal'),
  df.filial,
  df.cia,
  df.tag1,
  df.tag2,
  df.tag3,
  df.fornecedor_padrao,
  df.ticket,
  df.tag_orc,
  df.recorrente,
  df.chave_id,
  df.created_at,
  df.updated_at
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
  -- ⭐ Usar LEFT JOIN para melhor performance
  AND NOT EXISTS (
    SELECT 1 FROM temp_existentes te
    WHERE te.chave_id = df.chave_id
  );

-- Passo 3: Limpar tabela temporária
DROP TABLE IF EXISTS temp_existentes;

-- Passo 4: Verificar resultado
SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as dre_fabric_elegiveis,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as transactions_sincronizados,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as gap_final,
  CASE
    WHEN (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) =
         (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ 100% SINCRONIZADO!'
    ELSE '⚠️ Ainda há registros faltantes'
  END as situacao;

-- ================================================================================
-- PRONTO! Sincronização concluída.
-- ================================================================================
