-- =====================================================
-- CRIAR get_dre_dimension CORRETO
-- Com filtro de marca funcionando
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. DROPAR TODAS as versões antigas
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[], text[], text[]);

-- 2. CRIAR versão correta
CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario text DEFAULT NULL,
  p_dimension text DEFAULT 'marca',
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL,
  p_tags02 text[] DEFAULT NULL,
  p_tags03 text[] DEFAULT NULL
)
RETURNS TABLE(
  dimension_value text,
  year_month text,
  total_amount numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(
      CASE
        WHEN p_dimension = 'marca' THEN t.marca
        WHEN p_dimension = 'nome_filial' THEN t.nome_filial
        WHEN p_dimension = 'tag02' THEN t.tag02
        WHEN p_dimension = 'tag03' THEN t.tag03
        WHEN p_dimension = 'vendor' THEN t.vendor
        WHEN p_dimension = 'ticket' THEN t.ticket
        WHEN p_dimension = 'category' THEN t.category
        ELSE 'N/A'
      END,
      'N/A'
    ) as dimension_value,
    substring(t.date, 1, 7) as year_month,
    SUM(t.amount) as total_amount
  FROM transactions t
  WHERE
    (p_month_from IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
    AND (p_conta_contabils IS NULL OR t.conta_contabil = ANY(p_conta_contabils))
    AND (p_scenario IS NULL OR t.scenario = p_scenario)
    AND (p_marcas IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
    AND (p_tags02 IS NULL OR t.tag02 = ANY(p_tags02))
    AND (p_tags03 IS NULL OR t.tag03 = ANY(p_tags03))
  GROUP BY dimension_value, year_month
$$;

-- 3. TESTAR: Buscar filiais filtrando por marca='GT'
-- Deve retornar APENAS filiais que pertencem a GT
SELECT
  dimension_value,
  COUNT(*) as meses_com_dados,
  SUM(total_amount) as total
FROM get_dre_dimension(
  '2026-01',
  '2026-12',
  NULL,
  'Real',
  'nome_filial',  -- busca filiais
  ARRAY['GT'],    -- filtra por marca GT
  NULL,
  NULL,
  NULL,
  NULL
)
GROUP BY dimension_value
ORDER BY dimension_value;

-- 4. Verificar se há filiais de outras marcas (NÃO DEVERIA TER)
SELECT
  dimension_value,
  SUM(total_amount) as total,
  CASE
    WHEN dimension_value LIKE 'GT%' THEN 'GT - OK'
    ELSE 'ERRO - Não é GT!'
  END as status
FROM get_dre_dimension(
  '2026-01',
  '2026-12',
  NULL,
  'Real',
  'nome_filial',
  ARRAY['GT'],
  NULL,
  NULL,
  NULL,
  NULL
)
GROUP BY dimension_value
ORDER BY status DESC, dimension_value;
