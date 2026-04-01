-- =====================================================
-- TESTAR: Filtro de Marca no RPC get_dre_summary
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. SEM FILTRO (todas as marcas)
SELECT
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Resultado esperado: ~2000 linhas, R$ X milhões
-- Anotar esses valores!


-- 2. COM FILTRO DE MARCA = 'QI'
SELECT
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['QI']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Resultado esperado: MENOS linhas, R$ Y milhões (Y < X)
-- Se retornar o MESMO número de linhas e MESMO total → RPC NÃO está filtrando!


-- 3. COM FILTRO DE MARCA = 'GT'
SELECT
  COUNT(*) as total_linhas,
  SUM(total_amount) as soma_total
FROM get_dre_summary(
  p_month_from := '2025-01',
  p_month_to := '2025-12',
  p_marcas := ARRAY['GT']::text[],
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- Resultado esperado: Número diferente de QI


-- 4. VERIFICAR SE O RPC TEM A LÓGICA DE FILTRO
-- Ver o código da função:
SELECT
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_dre_summary';

-- Procure por:
-- WHERE marca = ANY(p_marcas)
-- ou
-- WHERE marca IN (SELECT unnest(p_marcas))
-- ou similar

-- Se NÃO tiver esse filtro → RPC precisa ser corrigido!


-- =====================================================
-- DIAGNÓSTICO
-- =====================================================

-- CENÁRIO A: Totais IGUAIS com e sem filtro
-- → RPC NÃO está filtrando
-- → Precisa corrigir a função get_dre_summary no banco

-- CENÁRIO B: Totais DIFERENTES com e sem filtro
-- → RPC está filtrando corretamente
-- → Problema está no frontend (renderização dos níveis 1-2)
