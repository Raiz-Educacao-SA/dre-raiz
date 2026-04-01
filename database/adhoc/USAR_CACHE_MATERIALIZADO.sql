-- =====================================================
-- OTIMIZAÇÃO FINAL: Usar Cache Materializado
-- =====================================================
-- Problema: 20 segundos ainda é lento
-- Solução: Usar view materializada como cache
-- Tempo esperado: < 2 segundos
-- =====================================================

-- =====================================================
-- PASSO 1: Atualizar a view materializada
-- =====================================================

REFRESH MATERIALIZED VIEW mv_dre_summary_cache;

-- =====================================================
-- PASSO 2: Criar função que usa o cache
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_summary_fast(text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_summary_fast(
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
  -- Consulta a view materializada (SUPER RÁPIDO)
  SELECT
    scenario,
    conta_contabil,
    year_month,
    tag0,
    tag01,
    tag02,
    tag03,
    tipo,
    SUM(total_amount) as total_amount,
    SUM(tx_count) as tx_count
  FROM mv_dre_summary_cache
  WHERE
    (p_month_from IS NULL OR year_month >= p_month_from)
    AND (p_month_to IS NULL OR year_month <= p_month_to)
    AND (p_marcas IS NULL OR marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
    AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))
  GROUP BY
    scenario,
    conta_contabil,
    year_month,
    tag0,
    tag01,
    tag02,
    tag03,
    tipo
$$;

COMMENT ON FUNCTION get_dre_summary_fast IS 'DRE SUPER RÁPIDA usando cache materializado';

-- =====================================================
-- PASSO 3: Substituir função original pela rápida
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
  -- Usa a versão rápida com cache
  SELECT * FROM get_dre_summary_fast(
    p_month_from,
    p_month_to,
    p_marcas,
    p_nome_filiais,
    p_tags01
  )
$$;

COMMENT ON FUNCTION get_dre_summary IS 'DRE usando cache (atualizar view 1x/dia)';

-- =====================================================
-- VERIFICAÇÃO: Teste (deve ser < 2 segundos)
-- =====================================================

SELECT COUNT(*) FROM get_dre_summary('2026-01', '2026-12');

-- Ver dados
SELECT scenario, year_month, COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- =====================================================
-- MANUTENÇÃO: Atualizar cache diariamente
-- =====================================================

-- Criar função de atualização automática (executar 1x/dia)
CREATE OR REPLACE FUNCTION refresh_dre_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_dre_summary_cache;
END;
$$ LANGUAGE plpgsql;

-- Para atualizar manualmente:
-- SELECT refresh_dre_cache();

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ Query em < 2 segundos (era 20s)
-- ✅ 10x mais rápido que antes
-- ⚠️ Atualizar cache 1x/dia ou quando dados mudarem
-- =====================================================
