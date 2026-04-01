-- ════════════════════════════════════════════════════════════════
-- DIAGNOSTICAR: Ver a escrita EXATA dos TAG01 no banco
-- ════════════════════════════════════════════════════════════════

-- 1️⃣ VER TAG01 EXATOS que existem no banco (com maiúsculas/minúsculas)
SELECT DISTINCT
  tag01 as "Tag01 EXATO no Banco",
  LOWER(TRIM(tag01)) as "Normalizado",
  COUNT(*) OVER (PARTITION BY tag01) as "Qtd Registros"
FROM transactions
WHERE tag01 IS NOT NULL
  AND (
    tag01 ILIKE '%receita%'
    OR tag01 ILIKE '%tributo%'
    OR tag01 ILIKE '%devolu%'
    OR tag01 ILIKE '%integral%'
    OR tag01 ILIKE '%material%'
    OR tag01 ILIKE '%mensalid%'
    OR tag01 ILIKE '%extra%'
    OR tag01 ILIKE '%operacional%'
  )
ORDER BY COUNT(*) OVER (PARTITION BY tag01) DESC;

-- 2️⃣ VER O QUE FOI INSERIDO NO TAG0_MAP
SELECT
  tag1_norm as "Normalizado no Map",
  tag1_raw as "Raw no Map",
  tag0 as "Tag0 Mapeado"
FROM tag0_map
WHERE tag0 = 'Receita Líquida'
ORDER BY tag1_norm;

-- 3️⃣ VER QUAL ESTÁ BATENDO E QUAL NÃO ESTÁ
SELECT
  t.tag01 as "Tag01 no Banco",
  m.tag1_norm as "Mapeado Como",
  m.tag0 as "Tag0",
  CASE
    WHEN m.tag0 IS NOT NULL THEN '✅ BATEU'
    ELSE '❌ NÃO BATEU'
  END as "Status",
  COUNT(*) as "Qtd Registros"
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = m.tag1_norm
WHERE t.tag01 IS NOT NULL
  AND (
    t.tag01 ILIKE '%receita%'
    OR t.tag01 ILIKE '%tributo%'
    OR t.tag01 ILIKE '%devolu%'
    OR t.tag01 ILIKE '%integral%'
    OR t.tag01 ILIKE '%material%'
    OR t.tag01 ILIKE '%mensalid%'
    OR t.tag01 ILIKE '%extra%'
    OR t.tag01 ILIKE '%operacional%'
  )
GROUP BY t.tag01, m.tag1_norm, m.tag0
ORDER BY COUNT(*) DESC;

-- 4️⃣ MOSTRAR TAGS QUE NÃO ESTÃO BATENDO
SELECT DISTINCT
  t.tag01 as "❌ Tag01 sem mapeamento",
  COUNT(*) as "Qtd Registros"
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = m.tag1_norm
WHERE t.tag01 IS NOT NULL
  AND (
    t.tag01 ILIKE '%receita%'
    OR t.tag01 ILIKE '%tributo%'
    OR t.tag01 ILIKE '%devolu%'
    OR t.tag01 ILIKE '%integral%'
    OR t.tag01 ILIKE '%material%'
    OR t.tag01 ILIKE '%mensalid%'
    OR t.tag01 ILIKE '%extra%'
    OR t.tag01 ILIKE '%operacional%'
  )
  AND m.tag0 IS NULL
GROUP BY t.tag01
ORDER BY COUNT(*) DESC;
