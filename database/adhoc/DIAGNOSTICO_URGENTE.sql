-- =====================================================
-- DIAGNÓSTICO URGENTE: Por que não retorna dados?
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se a tabela transactions tem dados
SELECT COUNT(*) as total_transacoes
FROM transactions;

-- 2. Verificar formato da coluna date
SELECT
  date,
  typeof(date) as tipo_coluna,
  date::date as date_convertida
FROM transactions
LIMIT 5;

-- 3. Verificar dados em 2025
SELECT COUNT(*) as total_2025
FROM transactions
WHERE date::date >= '2025-01-01'
  AND date::date <= '2025-12-31';

-- 4. Verificar dados em 2026
SELECT COUNT(*) as total_2026
FROM transactions
WHERE date::date >= '2026-01-01'
  AND date::date <= '2026-12-31';

-- 5. Testar a função COM TODAS as marcas (sem filtro)
SELECT COUNT(*) as total_linhas_rpc
FROM get_dre_summary(
  p_month_from := '2026-01',  -- ← Mudei para 2026!
  p_month_to := '2026-12',
  p_marcas := NULL,
  p_nome_filiais := NULL,
  p_tags01 := NULL
);

-- 6. Se retornar 0 acima, testar query direta (bypass RPC)
SELECT COUNT(*) as teste_direto
FROM transactions t
WHERE t.date::date >= '2026-01-01'
  AND t.date::date <= '2026-12-31';

-- 7. Ver amostra de dados crus
SELECT *
FROM transactions
ORDER BY date DESC
LIMIT 10;
