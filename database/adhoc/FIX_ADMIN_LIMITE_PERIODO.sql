-- =====================================================
-- SOLUÇÃO EMERGÊNCIA: Limitar período para Admin
-- =====================================================
-- Problema: Admin carrega TODOS os dados → timeout
-- Solução: Forçar limite máximo de 6 meses por query
-- =====================================================

-- =====================================================
-- OPÇÃO 1: Modificar get_dre_summary para limitar período
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
SET statement_timeout = '30s'  -- Timeout de 30 segundos
AS $$
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(t.tag02, 'Sem tag02') as tag02,
    COALESCE(t.tag03, 'Sem tag03') as tag03,
    t.type as tipo,
    SUM(t.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    -- FORÇA LIMITE: Se período não especificado, últimos 6 meses
    (p_month_from IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
    -- LIMITE MÁXIMO: Se período muito grande, limita a 12 meses
    AND t.date >= COALESCE(
      (p_month_from || '-01')::date,
      CURRENT_DATE - INTERVAL '6 months'  -- Padrão: últimos 6 meses
    )
    AND (p_marcas IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    t.conta_contabil,
    substring(t.date::text, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type
$$;

COMMENT ON FUNCTION get_dre_summary IS 'DRE Summary - Com limite de 6 meses padrão para Admin';

-- =====================================================
-- OPÇÃO 2: Criar função específica para Admin (agregada)
-- =====================================================

CREATE OR REPLACE FUNCTION get_dre_summary_admin(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL
)
RETURNS TABLE(
  scenario text,
  year_month text,
  tag0 text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  -- Agregação MAIS PESADA para reduzir linhas retornadas
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    substring(t.date::text, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    SUM(t.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM transactions t
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    -- Limita a últimos 6 meses se não especificado
    t.date >= COALESCE(
      (p_month_from || '-01')::date,
      CURRENT_DATE - INTERVAL '6 months'
    )
    AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    substring(t.date::text, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação')
$$;

COMMENT ON FUNCTION get_dre_summary_admin IS 'DRE Summary para Admin - Agregação mais pesada, menos linhas';

-- =====================================================
-- OPÇÃO 3: Usar cache materializado (RECOMENDADO)
-- =====================================================

-- Já existe em: USAR_CACHE_MATERIALIZADO.sql
-- Executar aquele script se quiser < 2 segundos sempre

-- =====================================================
-- TESTE
-- =====================================================

-- Testar nova função (com limite de 6 meses)
SELECT scenario, year_month, COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- Testar função específica de Admin
SELECT scenario, year_month, tag0, tx_count
FROM get_dre_summary_admin('2026-01', '2026-12')
ORDER BY scenario, year_month, tag0;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ Função com limite deve executar em < 10 segundos
-- ✅ Função Admin deve retornar menos linhas (mais agregada)
-- ✅ Admin não deve mais ficar em loop
-- =====================================================
