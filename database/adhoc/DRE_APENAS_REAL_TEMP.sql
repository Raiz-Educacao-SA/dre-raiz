-- =====================================================
-- TEMPORÁRIO: DRE apenas com tabela transactions
-- =====================================================
-- Use este script SE as tabelas de cenários estiverem
-- vazias ou causando timeout
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
  tag01 text,
  tag02 text,
  tag03 text,
  tipo text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  -- Consulta APENAS transactions (rápido)
  SELECT
    COALESCE(scenario, 'Real') as scenario,
    conta_contabil,
    substring(date::text, 1, 7) as year_month,
    COALESCE(tag01, 'Sem Subclassificação') as tag01,
    COALESCE(tag02, 'Sem tag02') as tag02,
    COALESCE(tag03, 'Sem tag03') as tag03,
    type as tipo,
    SUM(amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM transactions
  WHERE
    (p_month_from IS NULL OR date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR date::text <= p_month_to || '-31')
    AND (p_marcas IS NULL OR marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
    AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(scenario, 'Real'),
    conta_contabil,
    substring(date::text, 1, 7),
    COALESCE(tag01, 'Sem Subclassificação'),
    COALESCE(tag02, 'Sem tag02'),
    COALESCE(tag03, 'Sem tag03'),
    type
$$;

-- Teste
SELECT scenario, COUNT(*) FROM get_dre_summary('2026-01', '2026-12') GROUP BY scenario;
