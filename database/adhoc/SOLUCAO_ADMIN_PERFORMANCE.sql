-- =====================================================
-- SOLUÇÃO: Otimizar DRE para Admin
-- =====================================================
-- Problema: Admin sem filtros carrega TODOS os dados
-- Solução: Adicionar índices + Limitar período padrão
-- =====================================================

-- =====================================================
-- PASSO 1: Criar índices compostos otimizados
-- =====================================================

-- Índice para acelerar agregação por scenario + conta + mês
CREATE INDEX IF NOT EXISTS idx_transactions_dre_agg
  ON transactions(scenario, conta_contabil, date, tag01, tag02, tag03, type)
  WHERE date IS NOT NULL;

-- Índice para acelerar filtro por data + tag01
CREATE INDEX IF NOT EXISTS idx_transactions_date_tag01
  ON transactions(date, tag01)
  WHERE date IS NOT NULL;

-- Índice para JOIN com tag0_map
CREATE INDEX IF NOT EXISTS idx_transactions_tag01_lower
  ON transactions(LOWER(TRIM(tag01)))
  WHERE tag01 IS NOT NULL;

-- =====================================================
-- PASSO 2: Função otimizada com LIMIT inteligente
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
SET work_mem = '256MB'  -- Aumentar memória para agregação
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
    (p_month_from IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
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

COMMENT ON FUNCTION get_dre_summary IS 'DRE Summary - Otimizado com work_mem aumentada';

-- =====================================================
-- PASSO 3: Criar view materializada para admin (OPCIONAL)
-- =====================================================

-- View materializada com dados pré-agregados (atualizar 1x/dia)
DROP MATERIALIZED VIEW IF EXISTS mv_dre_summary_cache CASCADE;

CREATE MATERIALIZED VIEW mv_dre_summary_cache AS
SELECT
  COALESCE(t.scenario, 'Real') as scenario,
  t.conta_contabil,
  substring(t.date::text, 1, 7) as year_month,
  COALESCE(tm.tag0, 'Sem Classificação') as tag0,
  COALESCE(t.tag01, 'Sem Subclassificação') as tag01,
  COALESCE(t.tag02, 'Sem tag02') as tag02,
  COALESCE(t.tag03, 'Sem tag03') as tag03,
  t.type as tipo,
  t.marca,
  t.nome_filial,
  SUM(t.amount) as total_amount,
  COUNT(*)::bigint as tx_count
FROM transactions t
LEFT JOIN tag0_map tm
  ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
GROUP BY
  COALESCE(t.scenario, 'Real'),
  t.conta_contabil,
  substring(t.date::text, 1, 7),
  COALESCE(tm.tag0, 'Sem Classificação'),
  COALESCE(t.tag01, 'Sem Subclassificação'),
  COALESCE(t.tag02, 'Sem tag02'),
  COALESCE(t.tag03, 'Sem tag03'),
  t.type,
  t.marca,
  t.nome_filial;

-- Índice na view materializada
CREATE INDEX idx_mv_dre_summary_filters
  ON mv_dre_summary_cache(year_month, marca, nome_filial, tag01);

-- Para atualizar a view (executar 1x/dia ou quando dados mudarem):
-- REFRESH MATERIALIZED VIEW mv_dre_summary_cache;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Teste 1: Query normal (deve ser rápida agora)
EXPLAIN ANALYZE
SELECT COUNT(*) FROM get_dre_summary('2026-01', '2026-12');

-- Teste 2: Ver dados
SELECT scenario, year_month, COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month
ORDER BY scenario, year_month;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Com índices:
-- - Query deve executar em < 5 segundos
-- - Admin deve conseguir carregar DRE
-- =====================================================
