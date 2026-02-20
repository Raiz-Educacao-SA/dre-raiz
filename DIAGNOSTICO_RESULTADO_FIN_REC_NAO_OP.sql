-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTICO_RESULTADO_FIN_REC_NAO_OP.sql
-- Diagnóstico de dois problemas na DRE:
--   A) "Resultado Financeiro" aparecendo no tag0 de Receita Líquida
--   B) "Receitas Não Operacionais" sem dados no A-1 (2025)
--
-- Execute CADA bloco separadamente no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── BLOCO A1: O que get_dre_summary retorna para "Resultado Financeiro"? ──
-- Verifica qual tag0 está sendo atribuído e qual tipo (type) essas linhas têm.
SELECT
  t.scenario,
  t.tag01,
  t.type                                              AS tipo_raw,
  tm.tag0                                             AS tag0_no_mapa,
  COALESCE(tm.tag0, 'Sem Classificação')              AS tag0_final,
  COUNT(*)                                            AS registros,
  SUM(t.amount)                                       AS total
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE LOWER(TRIM(t.tag01)) LIKE '%resultado financeiro%'
   OR LOWER(TRIM(t.tag01)) LIKE '%res_fin%'
GROUP BY t.scenario, t.tag01, t.type, tm.tag0
ORDER BY t.scenario, COUNT(*) DESC;


-- ─── BLOCO A2: Estado atual do tag0_map para "Resultado Financeiro" ─────────
-- Mostra o mapeamento cadastrado (ou ausente) para essa tag01.
SELECT
  tag1_norm,
  tag1_raw,
  tag0
FROM tag0_map
WHERE LOWER(tag1_norm) LIKE '%resultado%'
   OR LOWER(tag1_norm) LIKE '%res_fin%'
ORDER BY tag1_norm;


-- ─── BLOCO A3: Quais tag01s estão saindo no tag0 de Receita Líquida (01.)? ──
-- Mostra TODAS as tag01 que hoje aparecem sob algum tag0 que começa com '01.'
-- Ajuda a identificar invasores (ex: Resultado Financeiro entrando aí).
SELECT
  COALESCE(tm.tag0, t.type)   AS tag0_resultado,
  t.tag01,
  t.type                      AS tipo_raw,
  tm.tag0                     AS tag0_no_mapa,
  SUM(t.amount)               AS total
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE
  -- Captura tanto mapeados quanto os que caem no fallback de type
  (COALESCE(tm.tag0, t.type) LIKE '01.%'
   OR tm.tag0 IN ('Receita Líquida', '01. RECEITA LÍQUIDA', '01. RECEITA LIQUIDA'))
  AND t.scenario IS NULL  -- Real
GROUP BY COALESCE(tm.tag0, t.type), t.tag01, t.type, tm.tag0
ORDER BY t.tag01;


-- ─── BLOCO B1: "Receitas Não Operacionais" existe no A-1? ───────────────────
-- Verifica se os dados chegaram na transactions_ano_anterior e com qual type.
SELECT
  t.tag01,
  t.type                                              AS tipo_raw,
  tm.tag0                                             AS tag0_no_mapa,
  COALESCE(tm.tag0, 'Sem Classificação')              AS tag0_final,
  COUNT(*)                                            AS registros,
  SUM(t.amount)                                       AS total
FROM transactions_ano_anterior t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE LOWER(TRIM(t.tag01)) LIKE '%n_o operac%'
   OR LOWER(TRIM(t.tag01)) LIKE '%nao operac%'
   OR LOWER(TRIM(t.tag01)) LIKE '%não operac%'
   OR LOWER(TRIM(t.tag01)) LIKE '%receitas extras%'
GROUP BY t.tag01, t.type, tm.tag0
ORDER BY t.tag01;


-- ─── BLOCO B2: Qual o type dos registros com "Receitas Não Operacionais"? ───
-- Se o type não começa com '01.'-'05.', a carga Python os teria filtrado.
SELECT
  t.type,
  t.tag01,
  COUNT(*) AS registros,
  SUM(t.amount) AS total
FROM transactions_ano_anterior t
WHERE t.tag01 IS NOT NULL
  AND LOWER(TRIM(t.tag01)) LIKE '%operac%'
GROUP BY t.type, t.tag01
ORDER BY COUNT(*) DESC;


-- ─── BLOCO B3: Existe Receitas Não Operacionais no Real (transactions)? ─────
-- Compara com o Real para ver se o tipo/tag01 bate.
SELECT
  t.type,
  t.tag01,
  COALESCE(t.scenario, 'Real') AS scenario,
  tm.tag0,
  COUNT(*) AS registros,
  SUM(t.amount) AS total
FROM transactions t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
WHERE LOWER(TRIM(t.tag01)) LIKE '%operac%'
GROUP BY t.type, t.tag01, t.scenario, tm.tag0
ORDER BY t.type, t.tag01;


-- ─── BLOCO B4: O que a get_dre_summary retorna para A-1 "01." em 2025? ──────
-- Confirma o que o RPC devolve para o A-1 no range de meses relevante.
SELECT
  scenario,
  tag0,
  tag01,
  COUNT(*) AS linhas,
  SUM(total_amount) AS total
FROM get_dre_summary('2025-01', '2025-12')
WHERE scenario = 'A-1'
  AND (tag0 LIKE '01%' OR tag0 ILIKE '%receita%')
GROUP BY scenario, tag0, tag01
ORDER BY tag0, SUM(total_amount) DESC;
