-- ================================================================================
-- DEBUG: SINCRONIZAÇÃO DRE_FABRIC → TRANSACTIONS
-- ================================================================================
-- Este script testa a sincronização passo a passo para identificar o erro
-- ================================================================================

-- ================================================================================
-- TESTE 1: Verificar estrutura das tabelas
-- ================================================================================

SELECT '📋 COLUNAS EM DRE_FABRIC' as teste;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================================

SELECT '📋 COLUNAS EM TRANSACTIONS' as teste;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================================
-- TESTE 2: Verificar se há registros para sincronizar
-- ================================================================================

SELECT '🔍 REGISTROS PARA SINCRONIZAR' as teste;

SELECT COUNT(*) as registros_para_sincronizar
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
  );

-- ================================================================================
-- TESTE 3: Ver amostra de dados do DRE_FABRIC
-- ================================================================================

SELECT '📄 AMOSTRA DRE_FABRIC (5 registros para sincronizar)' as teste;

SELECT
  chave_id,
  anomes,
  complemento,
  conta,
  valor,
  type,
  scenario,
  status,
  filial,
  cia,
  tag1,
  tag2,
  tag3,
  fornecedor_padrao,
  ticket,
  tag_orc,
  recorrente,
  created_at,
  updated_at
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
  )
LIMIT 5;

-- ================================================================================
-- TESTE 4: Testar conversão de dados (SEM INSERIR)
-- ================================================================================

SELECT '🔄 TESTE DE CONVERSÃO (sem inserir)' as teste;

SELECT
  gen_random_uuid()::TEXT as id,
  CASE
    WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6 THEN
      TO_DATE(df.anomes, 'YYYYMM')::TEXT
    ELSE
      NULL
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
  df.chave_id as chave_id,
  df.created_at,
  df.updated_at
FROM dre_fabric df
WHERE df.type IS NOT NULL
  AND df.chave_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
  )
LIMIT 5;

-- ================================================================================
-- TESTE 5: Verificar se há colunas incompatíveis
-- ================================================================================

SELECT '⚠️ VERIFICANDO COLUNAS QUE PODEM NÃO EXISTIR' as teste;

-- Verificar se a coluna 'scenario' existe em dre_fabric
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Coluna scenario existe em dre_fabric'
    ELSE '❌ Coluna scenario NÃO existe em dre_fabric'
  END as resultado
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name = 'scenario'
  AND table_schema = 'public';

-- Verificar se a coluna 'status' existe em dre_fabric
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Coluna status existe em dre_fabric'
    ELSE '❌ Coluna status NÃO existe em dre_fabric'
  END as resultado
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name = 'status'
  AND table_schema = 'public';

-- Verificar se a coluna 'chave_id' existe em dre_fabric
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Coluna chave_id existe em dre_fabric'
    ELSE '❌ Coluna chave_id NÃO existe em dre_fabric (usa chave?)'
  END as resultado
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name = 'chave_id'
  AND table_schema = 'public';

-- ================================================================================
-- TESTE 6: Tentar inserir 1 registro manualmente
-- ================================================================================

SELECT '🧪 TESTE: Inserir 1 registro manualmente' as teste;

-- Primeiro, pegar 1 registro para testar
DO $$
DECLARE
  v_registro RECORD;
BEGIN
  -- Pegar primeiro registro
  SELECT
    gen_random_uuid()::TEXT as id,
    CASE
      WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6 THEN
        TO_DATE(df.anomes, 'YYYYMM')::TEXT
      ELSE
        NULL
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
    df.chave_id as chave_id,
    df.created_at,
    df.updated_at
  INTO v_registro
  FROM dre_fabric df
  WHERE df.type IS NOT NULL
    AND df.chave_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.chave_id = df.chave_id
    )
  LIMIT 1;

  -- Tentar inserir
  IF v_registro IS NOT NULL THEN
    BEGIN
      INSERT INTO transactions (
        id, date, description, category, amount, type, scenario, status,
        filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
        recurring, chave_id, created_at, updated_at
      )
      VALUES (
        v_registro.id,
        v_registro.date,
        v_registro.description,
        v_registro.category,
        v_registro.amount,
        v_registro.type,
        v_registro.scenario,
        v_registro.status,
        v_registro.filial,
        v_registro.marca,
        v_registro.tag01,
        v_registro.tag02,
        v_registro.tag03,
        v_registro.vendor,
        v_registro.ticket,
        v_registro.nat_orc,
        v_registro.recurring,
        v_registro.chave_id,
        v_registro.created_at,
        v_registro.updated_at
      );

      RAISE NOTICE '✅ Inserção de teste bem-sucedida! Chave: %', v_registro.chave_id;

      -- Remover o registro de teste
      DELETE FROM transactions WHERE chave_id = v_registro.chave_id;
      RAISE NOTICE '🗑️ Registro de teste removido';

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO ao inserir: %', SQLERRM;
        RAISE NOTICE '   Código do erro: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '⚠️ Nenhum registro encontrado para testar';
  END IF;
END $$;

-- ================================================================================
-- FIM DO DEBUG
-- ================================================================================

SELECT '✅ DEBUG CONCLUÍDO' as status;
