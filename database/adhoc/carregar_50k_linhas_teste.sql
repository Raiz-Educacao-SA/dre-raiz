-- ============================================
-- SCRIPT: Limpar transactions e carregar 50.000 linhas de teste do dre_fabric
-- ============================================
-- Este script:
-- 1. Limpa a tabela transactions
-- 2. Carrega 50.000 linhas aleatórias do dre_fabric
-- 3. Valida os dados inseridos
-- Data: 2026-02-03
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: LIMPAR TABELA TRANSACTIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO LIMPEZA DA TABELA TRANSACTIONS...';
  RAISE NOTICE 'Registros antes: %', (SELECT COUNT(*) FROM transactions);
  RAISE NOTICE '========================================';
END $$;

-- Deletar todos os registros
DELETE FROM transactions;

DO $$
BEGIN
  RAISE NOTICE '✅ Tabela transactions limpa!';
  RAISE NOTICE 'Registros após limpeza: %', (SELECT COUNT(*) FROM transactions);
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- PARTE 2: CARREGAR 50.000 LINHAS DO DRE_FABRIC
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'INICIANDO CARGA DE 50.000 LINHAS...';
  RAISE NOTICE 'Selecionando linhas aleatórias do dre_fabric...';
END $$;

-- Inserir 50.000 linhas aleatórias do dre_fabric
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
  -- Gerar UUID único para cada registro
  gen_random_uuid()::TEXT as id,

  -- Converter anomes (YYYYMM) para date (YYYY-MM-01)
  CASE
    WHEN anomes IS NOT NULL AND LENGTH(anomes) = 6 THEN
      TO_DATE(anomes, 'YYYYMM')::TEXT
    ELSE
      NULL
  END as date,

  -- Mapeamento direto das colunas
  complemento as description,
  conta as category,
  valor as amount,

  -- Usar o type já calculado no dre_fabric (via trigger)
  COALESCE(type, '99. CADASTRAR TAG0') as type,

  -- Scenario sempre 'Real'
  COALESCE(scenario, 'Real') as scenario,

  -- Status mapeado
  COALESCE(status, 'Normal') as status,

  -- Hierarquia
  filial,
  cia as marca,

  -- Tags
  tag1 as tag01,
  tag2 as tag02,
  tag3 as tag03,

  -- Outros campos
  fornecedor_padrao as vendor,
  ticket,
  tag_orc as nat_orc,
  recorrente as recurring,

  -- Chave única do Fabric
  chave as chave_id,

  -- Timestamps
  created_at,
  updated_at

FROM dre_fabric
WHERE type IS NOT NULL  -- Só pegar registros que já foram classificados
ORDER BY RANDOM()       -- Selecionar aleatoriamente
LIMIT 50000;            -- Limitar a 50.000 registros

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CARGA CONCLUÍDA!';
  RAISE NOTICE 'Registros inseridos: %', (SELECT COUNT(*) FROM transactions);
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- PARTE 3: VALIDAÇÃO DOS DADOS INSERIDOS
-- ============================================

-- Validação 1: Contagem total
SELECT
  '📊 TOTAL DE REGISTROS' as validacao;

SELECT
  COUNT(*) as total_transactions,
  COUNT(DISTINCT chave_id) as chaves_unicas,
  COUNT(DISTINCT id) as ids_unicos
FROM transactions;

-- Validação 2: Distribuição por tipo
SELECT
  '📊 DISTRIBUIÇÃO POR TIPO' as validacao;

SELECT
  type,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions), 2) as percentual
FROM transactions
GROUP BY type
ORDER BY quantidade DESC;

-- Validação 3: Distribuição por filial
SELECT
  '📊 TOP 10 FILIAIS' as validacao;

SELECT
  filial,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions), 2) as percentual
FROM transactions
GROUP BY filial
ORDER BY quantidade DESC
LIMIT 10;

-- Validação 4: Distribuição por marca
SELECT
  '📊 DISTRIBUIÇÃO POR MARCA' as validacao;

SELECT
  marca,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions), 2) as percentual
FROM transactions
GROUP BY marca
ORDER BY quantidade DESC;

-- Validação 5: Distribuição por cenário
SELECT
  '📊 DISTRIBUIÇÃO POR CENÁRIO' as validacao;

SELECT
  scenario,
  COUNT(*) as quantidade
FROM transactions
GROUP BY scenario;

-- Validação 6: Distribuição por status
SELECT
  '📊 DISTRIBUIÇÃO POR STATUS' as validacao;

SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions), 2) as percentual
FROM transactions
GROUP BY status
ORDER BY quantidade DESC;

-- Validação 7: Verificar datas
SELECT
  '📊 PERÍODO DOS DADOS' as validacao;

SELECT
  MIN(date) as data_inicial,
  MAX(date) as data_final,
  COUNT(DISTINCT date) as meses_distintos
FROM transactions;

-- Validação 8: Verificar valores nulos
SELECT
  '⚠️ CAMPOS COM VALORES NULOS' as validacao;

SELECT
  COUNT(*) FILTER (WHERE date IS NULL) as date_null,
  COUNT(*) FILTER (WHERE description IS NULL) as description_null,
  COUNT(*) FILTER (WHERE category IS NULL) as category_null,
  COUNT(*) FILTER (WHERE amount IS NULL) as amount_null,
  COUNT(*) FILTER (WHERE type IS NULL) as type_null,
  COUNT(*) FILTER (WHERE filial IS NULL) as filial_null,
  COUNT(*) FILTER (WHERE marca IS NULL) as marca_null,
  COUNT(*) FILTER (WHERE chave_id IS NULL) as chave_id_null
FROM transactions;

-- Validação 9: Verificar valores financeiros
SELECT
  '💰 ESTATÍSTICAS FINANCEIRAS' as validacao;

SELECT
  COUNT(*) as total_registros,
  ROUND(SUM(amount)::NUMERIC, 2) as soma_total,
  ROUND(AVG(amount)::NUMERIC, 2) as media,
  ROUND(MIN(amount)::NUMERIC, 2) as minimo,
  ROUND(MAX(amount)::NUMERIC, 2) as maximo
FROM transactions;

-- Validação 10: Amostra dos primeiros 5 registros
SELECT
  '📋 AMOSTRA DOS PRIMEIROS 5 REGISTROS' as validacao;

SELECT
  id,
  date,
  LEFT(description, 30) as description,
  category,
  amount,
  type,
  filial,
  marca,
  chave_id
FROM transactions
LIMIT 5;

-- Mensagem final
SELECT
  '✅ PROCESSO CONCLUÍDO COM SUCESSO!' as status,
  '50.000 linhas aleatórias carregadas do dre_fabric para transactions' as resultado,
  (SELECT COUNT(*) FROM transactions) as total_carregado;

-- ============================================
-- OBSERVAÇÕES
-- ============================================

/*
📝 NOTAS IMPORTANTES:

1. ✅ Tabela transactions foi LIMPA antes da carga
2. ✅ 50.000 linhas ALEATÓRIAS foram selecionadas do dre_fabric
3. ✅ Coluna TYPE já vem CALCULADA do dre_fabric (via trigger)
4. ✅ IDs únicos gerados via gen_random_uuid()
5. ✅ Chave_id preservada para rastreabilidade
6. ✅ Datas convertidas de YYYYMM para YYYY-MM-01
7. ✅ Todos os mapeamentos aplicados conforme documentação

🔧 PARA RODAR NOVAMENTE:
- Execute este script completo novamente no Supabase SQL Editor
- A tabela será limpa e 50.000 novas linhas aleatórias serão carregadas

⚠️ ATENÇÃO:
- Este script DELETA todos os dados da tabela transactions
- Use apenas para TESTES
- Para produção, use INSERT sem DELETE (ou upsert)
*/
