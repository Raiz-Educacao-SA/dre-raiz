-- ════════════════════════════════════════════════════════════════
-- DIAGNOSTICAR E CORRIGIR MAPEAMENTO TAG0_MAP PARA RECEITA LÍQUIDA
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ VER TODOS OS TAG01 QUE EXISTEM NO BANCO
SELECT DISTINCT tag01
FROM transactions
WHERE tag01 IS NOT NULL
ORDER BY tag01;

-- 2️⃣ VER O QUE ESTÁ MAPEADO PARA "RECEITA LÍQUIDA" ATUALMENTE
SELECT tag0, tag1_norm, tag1_raw
FROM tag0_map
WHERE LOWER(tag0) LIKE '%receita%'
ORDER BY tag0, tag1_norm;

-- 3️⃣ VER TAGS QUE PARECEM SER DE RECEITA MAS NÃO ESTÃO MAPEADAS
SELECT DISTINCT t.tag01
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE t.tag01 IS NOT NULL
  AND t.tag01 ILIKE '%receita%'
  AND m.tag0 IS NULL
ORDER BY t.tag01;

-- 4️⃣ INSERIR MAPEAMENTOS FALTANTES PARA RECEITA LÍQUIDA
-- Baseado no RECEITA_LIQUIDA_TAGS_SET do constants.ts

-- Verificar se já existem antes de inserir
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Array com todos os mapeamentos esperados para Receita Líquida
  -- [tag1_norm, tag1_raw, tag0]

  -- Tributos
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'tributos';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('tributos', 'Tributos', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Tributos → Receita Líquida';
  END IF;

  -- Devoluções & Cancelamentos
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'devoluções & cancelamentos';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('devoluções & cancelamentos', 'Devoluções & Cancelamentos', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Devoluções & Cancelamentos → Receita Líquida';
  END IF;

  -- Integral
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'integral';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('integral', 'Integral', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Integral → Receita Líquida';
  END IF;

  -- Material Didático
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'material didático';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('material didático', 'Material Didático', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Material Didático → Receita Líquida';
  END IF;

  -- Receita De Mensalidade
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'receita de mensalidade';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('receita de mensalidade', 'Receita De Mensalidade', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Receita De Mensalidade → Receita Líquida';
  END IF;

  -- Receitas Não Operacionais
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'receitas não operacionais';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('receitas não operacionais', 'Receitas Não Operacionais', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Receitas Não Operacionais → Receita Líquida';
  END IF;

  -- Receitas Extras (plural)
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'receitas extras';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('receitas extras', 'Receitas Extras', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Receitas Extras → Receita Líquida';
  END IF;

  -- Receita Extras (singular, caso exista no banco)
  SELECT COUNT(*) INTO v_count FROM tag0_map WHERE LOWER(tag1_norm) = 'receita extras';
  IF v_count = 0 THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES ('receita extras', 'Receita Extras', 'Receita Líquida')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserido: Receita Extras → Receita Líquida';
  END IF;

END $$;

-- 5️⃣ VERIFICAR O RESULTADO FINAL
SELECT tag0, tag1_norm, tag1_raw
FROM tag0_map
WHERE tag0 = 'Receita Líquida'
ORDER BY tag1_norm;

-- 6️⃣ VERIFICAR QUANTOS REGISTROS EXISTEM PARA CADA TAG01 DE RECEITA
SELECT
  t.tag01,
  COUNT(*) as total_registros,
  m.tag0
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE t.tag01 ILIKE '%receita%'
  OR t.tag01 IN ('Tributos', 'Devoluções & Cancelamentos', 'Integral', 'Material Didático')
GROUP BY t.tag01, m.tag0
ORDER BY COUNT(*) DESC;
