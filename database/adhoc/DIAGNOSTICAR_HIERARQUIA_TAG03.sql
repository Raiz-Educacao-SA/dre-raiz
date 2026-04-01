-- ════════════════════════════════════════════════════════════════
-- DIAGNOSTICAR: Hierarquia TAG0 → TAG01 → TAG03
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ VER A HIERARQUIA COMPLETA: Receita de Mensalidade
SELECT DISTINCT
  t.tag0,
  t.tag01,
  t.tag02,
  t.tag03,
  COUNT(*) as qtd_registros
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = m.tag1_norm
WHERE (
  t.tag01 ILIKE '%mensalid%'
  OR t.tag01 = 'Receita De Mensalidade'
  OR t.tag01 = 'Receitas'
)
GROUP BY t.tag0, t.tag01, t.tag02, t.tag03
ORDER BY COUNT(*) DESC;

-- 2️⃣ VER ESPECIFICAMENTE: Descontos
SELECT DISTINCT
  t.tag01,
  t.tag02,
  t.tag03,
  t.conta_contabil,
  t.description,
  COUNT(*) as qtd_registros,
  SUM(t.amount) as valor_total
FROM transactions t
WHERE (
  t.tag02 ILIKE '%desconto%'
  OR t.tag03 ILIKE '%desconto%'
  OR t.description ILIKE '%desconto%'
)
GROUP BY t.tag01, t.tag02, t.tag03, t.conta_contabil, t.description
ORDER BY COUNT(*) DESC
LIMIT 50;

-- 3️⃣ VER COMBINAÇÕES TAG01 + TAG03
SELECT
  tag01,
  tag03,
  COUNT(DISTINCT tag02) as qtd_tag02_diferentes,
  COUNT(*) as qtd_registros,
  ARRAY_AGG(DISTINCT tag02 ORDER BY tag02) as tag02_valores
FROM transactions
WHERE tag01 = 'Receita De Mensalidade'
  OR tag01 = 'Receitas'
GROUP BY tag01, tag03
ORDER BY COUNT(*) DESC
LIMIT 30;

-- 4️⃣ VERIFICAR: Há TAG03 duplicados em TAG01 diferentes?
SELECT
  tag03,
  COUNT(DISTINCT tag01) as qtd_tag01_diferentes,
  ARRAY_AGG(DISTINCT tag01 ORDER BY tag01) as tag01_valores,
  COUNT(*) as total_registros
FROM transactions
WHERE tag03 IS NOT NULL
GROUP BY tag03
HAVING COUNT(DISTINCT tag01) > 1  -- ← TAG03 que aparecem em múltiplos TAG01
ORDER BY COUNT(DISTINCT tag01) DESC, COUNT(*) DESC
LIMIT 30;

-- 5️⃣ CASO ESPECÍFICO: Mensalidade Ensino Fundamental
SELECT
  tag01,
  tag02,
  tag03,
  COUNT(*) as registros,
  SUM(amount) as valor_total
FROM transactions
WHERE tag03 ILIKE '%fundamental%'
  OR tag03 ILIKE '%mensalidade%'
GROUP BY tag01, tag02, tag03
ORDER BY COUNT(*) DESC;

-- 6️⃣ VER ESTRUTURA ESPERADA vs REAL
SELECT
  'ESPERADO: Hierarquia correta' as tipo,
  'tag01: Receita De Mensalidade' as nivel_1,
  'tag02: Descontos' as nivel_2,
  'tag03: Desconto Comercial s/ Mensalidades' as nivel_3
UNION ALL
SELECT
  'REAL: O que está no banco' as tipo,
  'tag01: ' || tag01 as nivel_1,
  'tag02: ' || COALESCE(tag02, 'NULL') as nivel_2,
  'tag03: ' || COALESCE(tag03, 'NULL') as nivel_3
FROM transactions
WHERE tag01 = 'Receita De Mensalidade'
  AND (tag02 ILIKE '%desconto%' OR tag03 ILIKE '%desconto%')
LIMIT 10;
