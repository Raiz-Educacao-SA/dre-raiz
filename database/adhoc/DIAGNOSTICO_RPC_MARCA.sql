-- =====================================================
-- DIAGNÓSTICO: Por que o filtro de marca retorna valores errados?
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR: Quantas transações brutas existem por marca?
SELECT
  marca,
  COUNT(*) as total_transacoes,
  SUM(amount) as soma_total
FROM transactions
WHERE date >= '2025-01-01' AND date <= '2025-12-31'
  AND marca IS NOT NULL
GROUP BY marca
ORDER BY marca;

-- Anotar esses valores! São os valores REAIS que o RPC deveria retornar.


-- 2. COMPARAR: O que o RPC retorna para cada marca?
-- Marca QI:
SELECT
  SUM(total_amount) as soma_rpc_qi
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['QI']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Marca GT:
SELECT
  SUM(total_amount) as soma_rpc_gt
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);


-- 3. VERIFICAR: O RPC está agregando corretamente?
-- Ver uma amostra de dados do RPC para marca QI:
SELECT
  scenario,
  conta_contabil,
  year_month,
  tag0,
  tag01,
  total_amount,
  tx_count
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['QI']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
ORDER BY ABS(total_amount) DESC
LIMIT 10;

-- Verificar se tx_count faz sentido (número de transações agregadas)


-- 4. COMPARAR: Mesma agregação manualmente
-- Agregar transactions diretamente (sem RPC) para marca QI:
SELECT
  scenario,
  conta_contabil,
  TO_CHAR(date, 'YYYY-MM') as year_month,
  tag0,
  tag01,
  SUM(amount) as total_amount,
  COUNT(*) as tx_count
FROM transactions
WHERE date >= '2025-01-01' AND date <= '2025-12-31'
  AND marca = 'QI'
GROUP BY scenario, conta_contabil, year_month, tag0, tag01
ORDER BY ABS(SUM(amount)) DESC
LIMIT 10;

-- Os valores devem BATER com o resultado do RPC acima!
-- Se não batarem → RPC tem bug na agregação


-- 5. VER O CÓDIGO DO RPC
SELECT routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dre_summary';

-- Procurar por:
-- 1. WHERE marca = ANY(p_marcas) ou WHERE marca IN (...)
-- 2. Como está fazendo GROUP BY
-- 3. Se está usando UNION/JOIN que pode duplicar dados


-- =====================================================
-- POSSÍVEIS PROBLEMAS:
-- =====================================================

-- A) RPC não filtra marca → valores iguais sempre
--    Solução: Adicionar WHERE marca = ANY(p_marcas)

-- B) RPC filtra mas agrega errado → valores reduzidos incorretos
--    Solução: Verificar GROUP BY e SUM()

-- C) RPC tem UNION/JOIN que duplica → valores multiplicados
--    Solução: Remover duplicação ou usar DISTINCT

-- D) RPC filtra por nome_filial em vez de marca
--    Solução: Corrigir para usar campo 'marca'
