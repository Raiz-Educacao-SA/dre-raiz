-- ════════════════════════════════════════════════════════════════
-- CORRIGIR: get_dre_dimension para filtrar por TAG02 e TAG03
-- ════════════════════════════════════════════════════════════════

-- ❌ PROBLEMA:
-- Quando faz drill-down de TAG01 → TAG02 → TAG03,
-- a TAG03 mostra TODAS as tags do banco,
-- não filtra pela TAG02 selecionada anteriormente

-- ✅ SOLUÇÃO:
-- Adicionar parâmetros p_tags02 e p_tags03 na função
-- e aplicar filtros WHERE correspondentes

-- ⚠️ IMPORTANTE: Dropar função existente primeiro (tipo de retorno mudou)
DROP FUNCTION IF EXISTS get_dre_dimension(text,text,text[],text,text,text[],text[],text[],text[],text[]);

CREATE OR REPLACE FUNCTION get_dre_dimension(
  p_month_from TEXT,
  p_month_to TEXT,
  p_conta_contabils TEXT[],
  p_scenario TEXT,
  p_dimension TEXT,
  p_marcas TEXT[],
  p_nome_filiais TEXT[],
  p_tags01 TEXT[],
  p_tags02 TEXT[],  -- ← NOVO
  p_tags03 TEXT[]   -- ← NOVO
)
RETURNS TABLE (
  dimension_value TEXT,
  year_month TEXT,
  total_amount NUMERIC
) AS $$
DECLARE
  v_query TEXT;
  v_month_from DATE;
  v_month_to DATE;
BEGIN
  -- Validar dimensão
  IF p_dimension NOT IN ('marca', 'nome_filial', 'tag01', 'tag02', 'tag03', 'vendor', 'ticket', 'conta_contabil') THEN
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;

  -- Converter strings para datas
  IF p_month_from IS NOT NULL THEN
    v_month_from := (p_month_from || '-01')::DATE;
  END IF;
  IF p_month_to IS NOT NULL THEN
    v_month_to := (p_month_to || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
  END IF;

  -- Construir query dinâmica
  v_query := '
    SELECT
      COALESCE(' || quote_ident(p_dimension) || '::TEXT, ''Não Informado'') as dimension_value,
      TO_CHAR(DATE_TRUNC(''month'', date::TIMESTAMP), ''YYYY-MM'') as year_month,
      SUM(amount) as total_amount
    FROM transactions
    WHERE 1=1
  ';

  -- Filtros de período
  IF v_month_from IS NOT NULL THEN
    v_query := v_query || ' AND date >= ' || quote_literal(v_month_from);
  END IF;
  IF v_month_to IS NOT NULL THEN
    v_query := v_query || ' AND date <= ' || quote_literal(v_month_to);
  END IF;

  -- Filtro de scenario
  IF p_scenario IS NOT NULL THEN
    v_query := v_query || ' AND scenario = ' || quote_literal(p_scenario);
  END IF;

  -- Filtro de contas contábeis
  IF p_conta_contabils IS NOT NULL AND array_length(p_conta_contabils, 1) > 0 THEN
    v_query := v_query || ' AND conta_contabil = ANY(' || quote_literal(p_conta_contabils) || ')';
  END IF;

  -- Filtro de marcas
  IF p_marcas IS NOT NULL AND array_length(p_marcas, 1) > 0 THEN
    v_query := v_query || ' AND marca = ANY(' || quote_literal(p_marcas) || ')';
  END IF;

  -- Filtro de filiais
  IF p_nome_filiais IS NOT NULL AND array_length(p_nome_filiais, 1) > 0 THEN
    v_query := v_query || ' AND nome_filial = ANY(' || quote_literal(p_nome_filiais) || ')';
  END IF;

  -- Filtro de TAG01
  IF p_tags01 IS NOT NULL AND array_length(p_tags01, 1) > 0 THEN
    v_query := v_query || ' AND tag01 = ANY(' || quote_literal(p_tags01) || ')';
  END IF;

  -- ✅ NOVO: Filtro de TAG02
  IF p_tags02 IS NOT NULL AND array_length(p_tags02, 1) > 0 THEN
    v_query := v_query || ' AND tag02 = ANY(' || quote_literal(p_tags02) || ')';
  END IF;

  -- ✅ NOVO: Filtro de TAG03
  IF p_tags03 IS NOT NULL AND array_length(p_tags03, 1) > 0 THEN
    v_query := v_query || ' AND tag03 = ANY(' || quote_literal(p_tags03) || ')';
  END IF;

  -- Group by e Order by
  v_query := v_query || '
    GROUP BY ' || quote_ident(p_dimension) || ', year_month
    ORDER BY year_month, ' || quote_ident(p_dimension) || '
  ';

  -- Debug: mostrar query construída
  RAISE NOTICE 'Query executada: %', v_query;

  -- Executar e retornar
  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- TESTE: Verificar se funciona
-- ════════════════════════════════════════════════════════════════

-- ANTES: Sem filtro TAG02 → mostra TODAS as TAG03
SELECT dimension_value, SUM(total_amount) as total
FROM get_dre_dimension(
  '2025-01', '2025-12',
  ARRAY['3.1.1.01.001'],  -- conta
  'Real',
  'tag03',  -- dimensão
  NULL, NULL,
  ARRAY['Receita De Mensalidade'],  -- tag01
  NULL,  -- tag02 (não filtrado)
  NULL   -- tag03 (não filtrado)
)
GROUP BY dimension_value
ORDER BY SUM(total_amount) DESC
LIMIT 10;

-- DEPOIS: Com filtro TAG02 → mostra apenas TAG03 daquela TAG02
SELECT dimension_value, SUM(total_amount) as total
FROM get_dre_dimension(
  '2025-01', '2025-12',
  ARRAY['3.1.1.01.001'],  -- conta
  'Real',
  'tag03',  -- dimensão
  NULL, NULL,
  ARRAY['Receita De Mensalidade'],  -- tag01
  ARRAY['Descontos'],  -- ← TAG02 filtrada
  NULL   -- tag03 (não filtrado)
)
GROUP BY dimension_value
ORDER BY SUM(total_amount) DESC
LIMIT 10;
