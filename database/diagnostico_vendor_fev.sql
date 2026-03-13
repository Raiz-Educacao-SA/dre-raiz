-- ═══════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: Por que fevereiro não aparece com filtro de vendor?
-- Substitua 'NOME_DO_FORNECEDOR' pelo nome (ou parte) do fornecedor
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Todas as transactions deste vendor em Jan e Fev 2026
-- (mostra scenario, tag01, vendor EXATO, amount)
SELECT
  id,
  to_char(date::date, 'YYYY-MM-DD') AS data,
  scenario,
  tag0,
  tag01,
  vendor,
  marca,
  amount,
  LENGTH(vendor) AS vendor_len,
  -- Mostra chars invisíveis
  encode(vendor::bytea, 'hex') AS vendor_hex
FROM transactions
WHERE vendor ILIKE '%NOME_DO_FORNECEDOR%'
  AND date::date >= '2026-01-01'
  AND date::date <= '2026-02-28'
ORDER BY date;

-- 2. Regras de override que podem estar excluindo
SELECT *
FROM override_contabil
WHERE ativo = true
ORDER BY tag01;

-- 3. Contagem por vendor EXATO para verificar variações de nome
SELECT
  vendor,
  LENGTH(vendor) AS len,
  to_char(date::date, 'YYYY-MM') AS mes,
  COUNT(*) AS qtd,
  SUM(amount) AS total
FROM transactions
WHERE vendor ILIKE '%NOME_DO_FORNECEDOR%'
  AND date::date >= '2026-01-01'
  AND date::date <= '2026-02-28'
GROUP BY vendor, LENGTH(vendor), to_char(date::date, 'YYYY-MM')
ORDER BY mes;
