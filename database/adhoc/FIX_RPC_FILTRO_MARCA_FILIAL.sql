-- =====================================================
-- CORRIGIR RPC: Filtro correto de Marca + Filial (pares)
-- Execute no Supabase SQL Editor
-- =====================================================

-- Dropar função antiga
DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

-- Criar nova função que aceita filtro de filiais como JSON
-- Exemplo: p_filiais_json = '[{"marca":"GT","nomefilial":"Botafogo"},{"marca":"QI","nomefilial":"Central"}]'
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_filiais_json text DEFAULT NULL,  -- JSON com pares {marca, nomefilial}
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
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
    AND (
      p_marcas IS NULL
      OR (
        -- Se marcas especificadas mas SEM filtro de filiais → filtrar só por marca
        p_filiais_json IS NULL AND t.marca = ANY(p_marcas)
      )
    )
    AND (
      p_filiais_json IS NULL
      OR EXISTS (
        -- Filtro correto: (marca='GT' AND nome_filial='Botafogo') OR (marca='QI' AND nome_filial='Central')
        SELECT 1 FROM jsonb_array_elements_text(p_filiais_json::jsonb) AS filial_obj
        WHERE (filial_obj::jsonb->>'marca')::text = t.marca
          AND (filial_obj::jsonb->>'nomefilial')::text = t.nome_filial
      )
    )
    AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    COALESCE(t.scenario, 'Real'),
    t.conta_contabil,
    substring(t.date, 1, 7),
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.tag02, 'Sem tag02'),
    COALESCE(t.tag03, 'Sem tag03'),
    t.type;
END;
$$;

-- Teste 1: Sem filtros
SELECT COUNT(*) FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL);

-- Teste 2: Filtro por marca GT (sem filiais específicas)
SELECT COUNT(*) FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL);

-- Teste 3: Filtro por pares marca+filial (JSON)
-- IMPORTANTE: Ajuste os nomes para dados reais do seu banco
SELECT COUNT(*) FROM get_dre_summary(
  '2026-01',
  '2026-12',
  NULL,
  '[{"marca":"GT","nomefilial":"Bom Tempo"},{"marca":"QI","nomefilial":"Central"}]',
  NULL
);

-- Teste 4: Ver sample dos dados filtrados
SELECT * FROM get_dre_summary(
  '2026-01',
  '2026-12',
  NULL,
  '[{"marca":"GT","nomefilial":"Bom Tempo"}]',
  NULL
)
LIMIT 5;
