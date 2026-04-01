-- =====================================================
-- SOLUÇÃO SIMPLES: Filtrar por nome_filial completo
-- nome_filial já tem formato "GT - Bosque Marapendi"
-- Execute no Supabase SQL Editor
-- =====================================================

-- Dropar função antiga
DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text, text[]);

-- Criar função simples que filtra por nome_filial direto
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,  -- Array de labels completas: ["GT - Bosque", "QI - Central"]
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

-- Teste 1: Filtro por nome_filial completo (com marca)
-- IMPORTANTE: Ajuste para um nome real do seu banco
SELECT COUNT(*) as total
FROM get_dre_summary(
  '2026-01',
  '2026-12',
  NULL,
  ARRAY['GT - Bom Tempo'],  -- Ajuste para um nome real
  NULL
);

-- Teste 2: Ver sample
SELECT *
FROM get_dre_summary(
  '2026-01',
  '2026-12',
  NULL,
  ARRAY['GT - Bom Tempo'],  -- Ajuste para um nome real
  NULL
)
LIMIT 5;

-- Teste 3: Múltiplas filiais
SELECT COUNT(*) as total
FROM get_dre_summary(
  '2026-01',
  '2026-12',
  NULL,
  ARRAY['GT - Bom Tempo', 'QI - Central'],  -- Ajuste para nomes reais
  NULL
);
