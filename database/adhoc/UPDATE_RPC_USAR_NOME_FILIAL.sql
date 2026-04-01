-- =====================================================
-- ATUALIZAR RPC para usar nome_filial ao invés de filial (código)
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. DROP da função antiga
DROP FUNCTION IF EXISTS get_dre_summary(text, text, text[], text[], text[]);

-- 2. CRIAR função nova usando nome_filial
CREATE OR REPLACE FUNCTION get_dre_summary(
  p_month_from text DEFAULT NULL,
  p_month_to text DEFAULT NULL,
  p_marcas text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,  -- ✅ MUDADO: p_filiais → p_nome_filiais
  p_tags01 text[] DEFAULT NULL
)
RETURNS TABLE (
  tag0 text,
  tag01 text,
  conta_contabil text,
  scenario text,
  month_index int,
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tag0,
    t.tag01,
    t.conta_contabil,
    t.scenario,
    EXTRACT(MONTH FROM t.date)::int - 1 AS month_index,  -- 0-11
    SUM(t.amount) AS total_amount
  FROM transactions t
  WHERE
    (p_month_from IS NULL OR t.date >= (p_month_from || '-01')::date)
    AND (p_month_to IS NULL OR t.date <= (p_month_to || '-31')::date)
    AND (p_marcas IS NULL OR t.marca = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))  -- ✅ MUDADO
    AND (p_tags01 IS NULL OR t.tag01 = ANY(p_tags01))
  GROUP BY
    t.tag0,
    t.tag01,
    t.conta_contabil,
    t.scenario,
    month_index
  ORDER BY
    t.tag0,
    t.tag01,
    t.conta_contabil,
    t.scenario,
    month_index;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Teste rápido
SELECT COUNT(*) as total_sem_filtros
FROM get_dre_summary('2026-01', '2026-12', NULL, NULL, NULL);

-- 4. Teste COM filtro de marca
SELECT COUNT(*) as total_com_marca_gt
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], NULL, NULL);

-- 5. Teste COM filtro de marca + nome_filial
-- AJUSTE 'Bosque Marapendi' para um nome que EXISTE na sua base
SELECT COUNT(*) as total_com_marca_e_filial
FROM get_dre_summary('2026-01', '2026-12', ARRAY['GT'], ARRAY['Bosque Marapendi'], NULL);
