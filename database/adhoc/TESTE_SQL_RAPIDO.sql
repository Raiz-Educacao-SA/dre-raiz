-- =====================================================
-- TESTE RÁPIDO: Verificar se SQL funciona
-- =====================================================

-- TESTE 1: Contar transações em 2026
SELECT COUNT(*) as total_transactions
FROM transactions
WHERE date::text >= '2026-01-01'
  AND date::text <= '2026-12-31';

-- TESTE 2: Executar função get_dre_summary
-- ⏱️ Observe quanto tempo demora!
SELECT scenario, COUNT(*) as linhas, SUM(total_amount) as total
FROM get_dre_summary('2026-01', '2026-12')
GROUP BY scenario;

-- TESTE 3: Ver primeiras 10 linhas
SELECT *
FROM get_dre_summary('2026-01', '2026-12')
LIMIT 10;

-- =====================================================
-- RESULTADO ESPERADO:
-- - TESTE 1: Retorna em < 1s
-- - TESTE 2: Retorna em < 10s
-- - TESTE 3: Retorna em < 5s
--
-- Se TESTE 2 der TIMEOUT:
--   → Problema é SQL (precisa mais otimização)
--
-- Se TESTE 2 retornar RÁPIDO:
--   → Problema é React (loop no frontend)
-- =====================================================
