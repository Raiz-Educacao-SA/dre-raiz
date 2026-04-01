-- =====================================================
-- REVERTER: Voltar função get_dre_summary ORIGINAL
-- =====================================================
-- Problema: Função otimizada removeu campo 'tag0' que
--           o React precisa, causando loop infinito
-- Solução: Restaurar função original COM tag0
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
  tag0 text,              -- ✅ CAMPO tag0 DE VOLTA
  tag01 text,
  tag02 text,
  tag03 text,
  tipo text,
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  -- Consulta APENAS transactions (como estava funcionando antes)
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    t.conta_contabil,
    substring(t.date::text, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,  -- ✅ JOIN com tag0_map DE VOLTA
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

COMMENT ON FUNCTION get_dre_summary IS 'DRE Summary - VERSÃO ORIGINAL (apenas transactions, com tag0)';

-- =====================================================
-- get_dre_dimension - Também reverter para original
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario text DEFAULT NULL,
  p_dimension text DEFAULT 'marca',
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE(
  dimension_value text,
  year_month text,
  total_amount numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF p_dimension NOT IN ('tag02', 'tag03', 'category', 'marca', 'nome_filial', 'vendor', 'ticket', 'responsavel') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(CAST(%I AS text), ''N/A'') as dimension_value,
       substring(t.date::text, 1, 7) as year_month,
       SUM(t.amount) as total_amount
     FROM transactions t
     WHERE
       ($1 IS NULL OR t.date::text >= $1 || ''-01'')
       AND ($2 IS NULL OR t.date::text <= $2 || ''-31'')
       AND ($3 IS NULL OR t.conta_contabil = ANY($3))
       AND ($4 IS NULL OR t.scenario = $4)
       AND ($5 IS NULL OR t.marca = ANY($5))
       AND ($6 IS NULL OR t.nome_filial = ANY($6))
       AND ($7 IS NULL OR t.tag01 = ANY($7))
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), substring(t.date::text, 1, 7)',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01;
END;
$$;

-- =====================================================
-- get_dre_filter_options - Também reverter
-- =====================================================

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL
)
RETURNS TABLE(
  marcas text[],
  nome_filiais text[],
  tags01 text[]
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ARRAY(SELECT DISTINCT marca FROM transactions t
      WHERE marca IS NOT NULL
      AND (p_month_from IS NULL OR t.date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
      ORDER BY marca
    ) as marcas,
    ARRAY(SELECT DISTINCT nome_filial FROM transactions t
      WHERE nome_filial IS NOT NULL
      AND (p_month_from IS NULL OR t.date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
      ORDER BY nome_filial
    ) as nome_filiais,
    ARRAY(SELECT DISTINCT tag01 FROM transactions t
      WHERE tag01 IS NOT NULL
      AND (p_month_from IS NULL OR t.date::text >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date::text <= p_month_to || '-31')
      ORDER BY tag01
    ) as tags01
$$;

-- =====================================================
-- TESTE
-- =====================================================

SELECT scenario, year_month, tag0, COUNT(*) as linhas
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario, year_month, tag0
ORDER BY scenario, year_month
LIMIT 10;

-- =====================================================
-- ✅ REVERTIDO PARA VERSÃO ORIGINAL
-- =====================================================
-- Agora a função:
-- ✅ Consulta apenas 'transactions' (rápido)
-- ✅ Retorna campo 'tag0' (React precisa)
-- ✅ Tem JOIN com tag0_map (hierarquia DRE)
-- ✅ Deve funcionar como antes
-- =====================================================
