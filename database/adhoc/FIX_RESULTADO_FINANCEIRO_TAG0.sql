-- ═══════════════════════════════════════════════════════════════════════════
-- FIX_RESULTADO_FINANCEIRO_TAG0.sql
-- Corrige tag0 do "Resultado Financeiro" na DRE
--
-- Problema:
--   tag01 = "Resultado Financeiro" (type "09. RESULTADO FINANCEIRO")
--   não tinha entrada em tag0_map → aparecia como "Sem Classificação"
--
-- Fix:
--   Mapeia para tag0 = "09. RESULTADO FINANCEIRO" (consistente com o type)
-- ═══════════════════════════════════════════════════════════════════════════


-- ── PASSO 1: Inserir mapeamento ──────────────────────────────────────────────
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('resultado financeiro', 'Resultado Financeiro', '09. RESULTADO FINANCEIRO')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0     = EXCLUDED.tag0,
      tag1_raw = EXCLUDED.tag1_raw;


-- ── PASSO 2: Confirmar ────────────────────────────────────────────────────────
SELECT tag1_norm, tag1_raw, tag0
FROM tag0_map
WHERE tag0 = '09. RESULTADO FINANCEIRO'
ORDER BY tag1_norm;


-- ── PASSO 3: Verificar quantos registros serão afetados ──────────────────────
SELECT
  t.tag01,
  t.type,
  COALESCE(m.tag0, 'Sem Classificação') AS tag0_atual,
  COUNT(*) AS registros,
  SUM(t.amount) AS total
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(m.tag1_norm))
WHERE LOWER(TRIM(t.tag01)) LIKE '%resultado financeiro%'
GROUP BY t.tag01, t.type, m.tag0
ORDER BY t.tag01;
