-- =====================================================
-- DRE Gerencial: Funções RPC para agregação no servidor
-- Executar no Supabase SQL Editor
-- NOTA: campo date é TEXT (formato YYYY-MM-DD), não tipo date
-- =====================================================

-- 1A. get_dre_summary: Retorna dados agregados para DRE principal
-- Retorna ~500-2000 linhas em vez de 119k transações brutas
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
  SELECT
    COALESCE(t.scenario, 'Real') as scenario,
    t.conta_contabil,
    substring(t.date, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(t.tag02, 'Sem tag02') as tag02,
    COALESCE(t.tag03, 'Sem tag03') as tag03,
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
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type
$$;

-- 1B. get_dre_dimension: Detalhe por dimensão dinâmica (drill-down)
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[]);
DROP FUNCTION IF EXISTS get_dre_dimension(text, text, text[], text, text, text[], text[], text[], text[], text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_scenario text DEFAULT NULL,
  p_dimension text DEFAULT 'marca',
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags01 text[] DEFAULT NULL,
  p_tags02 text[] DEFAULT NULL,  -- ✅ NOVO: Filtro por tag02
  p_tags03 text[] DEFAULT NULL   -- ✅ NOVO: Filtro por tag03
)
RETURNS TABLE(
  dimension_value text,
  year_month text,
  total_amount numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Validar nome da coluna para prevenir SQL injection
  -- ✅ ATUALIZADO: Adicionado 'tag01' como dimensão válida
  IF p_dimension NOT IN ('tag01', 'tag02', 'tag03', 'category', 'marca', 'nome_filial', 'vendor', 'ticket', 'responsavel') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(CAST(%I AS text), ''N/A'') as dimension_value,
       substring(t.date, 1, 7) as year_month,
       SUM(t.amount) as total_amount
     FROM transactions t
     WHERE
       ($1 IS NULL OR t.date >= $1 || ''-01'')
       AND ($2 IS NULL OR t.date <= $2 || ''-31'')
       AND ($3 IS NULL OR t.conta_contabil = ANY($3))
       AND ($4 IS NULL OR t.scenario = $4)
       AND ($5 IS NULL OR t.marca = ANY($5))
       AND ($6 IS NULL OR t.nome_filial = ANY($6))
       AND ($7 IS NULL OR t.tag01 = ANY($7))
       AND ($8 IS NULL OR t.tag02 = ANY($8))  -- ✅ NOVO: Filtro tag02
       AND ($9 IS NULL OR t.tag03 = ANY($9))  -- ✅ NOVO: Filtro tag03
     GROUP BY COALESCE(CAST(%I AS text), ''N/A''), substring(t.date, 1, 7)',
    p_dimension, p_dimension
  )
  USING p_month_from, p_month_to, p_conta_contabils, p_scenario,
        p_marcas, p_nome_filiais, p_tags01, p_tags02, p_tags03;  -- ✅ Adicionados no USING
END;
$$;

-- 1C. get_dre_filter_options: Opções dos dropdowns de filtro
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
      AND (p_month_from IS NULL OR t.date >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
      ORDER BY marca
    ) as marcas,
    ARRAY(SELECT DISTINCT nome_filial FROM transactions t
      WHERE nome_filial IS NOT NULL
      AND (p_month_from IS NULL OR t.date >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
      ORDER BY nome_filial
    ) as nome_filiais,
    ARRAY(SELECT DISTINCT tag01 FROM transactions t
      WHERE tag01 IS NOT NULL
      AND (p_month_from IS NULL OR t.date >= p_month_from || '-01')
      AND (p_month_to IS NULL OR t.date <= p_month_to || '-31')
      ORDER BY tag01
    ) as tags01
$$;

-- Verificação: testar as funções
-- SELECT * FROM get_dre_summary('2026-01', '2026-12') LIMIT 10;
-- SELECT * FROM get_dre_filter_options('2026-01', '2026-12');
-- SELECT * FROM get_dre_dimension('2026-01', '2026-12', ARRAY['Receita de Mensalidade'], 'Real', 'marca');
