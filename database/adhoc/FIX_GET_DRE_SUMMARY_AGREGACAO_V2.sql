-- =====================================================
-- CORREÇÃO V2: Agregar quando NÃO há filtro de MARCA
-- Independente se filial está filtrada ou não
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE(
  scenario text,
  conta_contabil text,
  year_month text,
  tag0 text,
  tag01 text,
  tag02 text,
  tag03 text,
  tipo text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  -- 🆕 Se NÃO há filtro de MARCA, agregar ignorando tag02/tag03
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    t.conta_contabil,
    substring(t.date, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') as tag01,
    -- 🔥 FIX: Checar APENAS p_marcas (não importa filial)
    CASE WHEN p_marcas IS NULL 
      THEN '' ELSE COALESCE(t.tag02, 'Sem tag02') END as tag02,
    CASE WHEN p_marcas IS NULL 
      THEN '' ELSE COALESCE(t.tag03, 'Sem tag03') END as tag03,
    t.type as tipo,
    SUM(t.amount) as total_amount,
    COUNT(*) as tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
    AND (p_marcas IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    t.conta_contabil,
    substring(t.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    -- 🔥 FIX: Checar APENAS p_marcas
    CASE WHEN p_marcas IS NULL 
      THEN '' ELSE COALESCE(t.tag02, 'Sem tag02') END,
    CASE WHEN p_marcas IS NULL 
      THEN '' ELSE COALESCE(t.tag03, 'Sem tag03') END,
    t.type
$$;

-- Testar: Marca NULL (deve agregar)
SELECT 
  tag01,
  COUNT(DISTINCT conta_contabil) as qtd_contas,
  SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL)
WHERE tag01 ILIKE '%imovel%'
GROUP BY tag01;

-- Testar: Marca GT (NÃO deve agregar, manter tag02/tag03)
SELECT 
  tag01,
  tag02,
  COUNT(DISTINCT conta_contabil) as qtd_contas
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL)
WHERE tag01 ILIKE '%imovel%'
GROUP BY tag01, tag02;
