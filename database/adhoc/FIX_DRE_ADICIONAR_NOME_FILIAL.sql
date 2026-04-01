-- =====================================================
-- CORREÇÃO: Adicionar nome_filial ao retorno de get_dre_summary
-- Data: 18/02/2026
-- =====================================================
-- A função atual retorna 'marca' mas não retorna 'nome_filial'
-- Isso impede que o filtro de filial funcione no frontend
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
  marca text,
  nome_filial text,  -- ✅ ADICIONADO
  total_amount numeric,
  tx_count bigint
)
LANGUAGE sql STABLE
AS $$
  WITH all_transactions AS (
    SELECT
      COALESCE(scenario, 'Real') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions
    WHERE
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))

    UNION ALL

    SELECT
      COALESCE(scenario, 'Orçado') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions_orcado
    WHERE
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))

    UNION ALL

    SELECT
      COALESCE(scenario, 'A-1') as scenario,
      conta_contabil,
      date::text as date,
      tag01,
      tag02,
      tag03,
      type,
      amount,
      marca,
      nome_filial
    FROM transactions_ano_anterior
    WHERE
      (p_month_from IS NULL OR date::date >= (p_month_from || '-01')::date)
      AND (p_month_to IS NULL OR date::date <= (p_month_to || '-31')::date)
      AND (p_marcas IS NULL OR marca = ANY(p_marcas))
      AND (p_nome_filiais IS NULL OR nome_filial = ANY(p_nome_filiais))
      AND (p_tags01 IS NULL OR tag01 = ANY(p_tags01))
  )

  SELECT
    at.scenario,
    at.conta_contabil,
    SUBSTRING(at.date, 1, 7) as year_month,
    COALESCE(tm.tag0, 'Sem Classificação') as tag0,
    COALESCE(at.tag01, 'Sem Subclassificação') as tag01,
    COALESCE(at.tag02, 'Sem tag02') as tag02,
    COALESCE(at.tag03, 'Sem tag03') as tag03,
    at.type as tipo,
    at.marca,
    at.nome_filial,  -- ✅ ADICIONADO
    SUM(at.amount) as total_amount,
    COUNT(*)::bigint as tx_count
  FROM all_transactions at
  LEFT JOIN tag0_map tm
    ON LOWER(TRIM(at.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY
    at.scenario,
    at.conta_contabil,
    SUBSTRING(at.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(at.tag01, 'Sem Subclassificação'),
    COALESCE(at.tag02, 'Sem tag02'),
    COALESCE(at.tag03, 'Sem tag03'),
    at.type,
    at.marca,
    at.nome_filial  -- ✅ ADICIONADO AO GROUP BY
$$;

COMMENT ON FUNCTION get_dre_summary IS 'DRE agregado com marca e nome_filial - VERSÃO 18/02/2026';

-- =====================================================
-- TESTE: Verificar se nome_filial está sendo retornado
-- =====================================================

SELECT
  marca,
  nome_filial,
  COUNT(*) as linhas,
  SUM(total_amount) as total
FROM get_dre_summary(
  p_month_from := '2026-01',
  p_month_to := '2026-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
)
WHERE marca IS NOT NULL AND nome_filial IS NOT NULL
GROUP BY marca, nome_filial
ORDER BY marca, nome_filial
LIMIT 20;

-- Deve mostrar marca E nome_filial populados!
