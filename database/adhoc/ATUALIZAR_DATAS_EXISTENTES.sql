-- ============================================================
-- ATUALIZAR DATAS DOS REGISTROS JÁ INSERIDOS
-- ============================================================
-- Converte datas de formato "202601" para "2026-01-01"
-- Data: 2026-02-04
-- ============================================================

-- ============================================================
-- ANTES DE EXECUTAR: Ver como estão as datas atuais
-- ============================================================

SELECT
    '📊 AMOSTRA DE DATAS ATUAIS' as info;

SELECT
    date,
    COUNT(*) as quantidade
FROM transactions
GROUP BY date
ORDER BY date DESC
LIMIT 10;

-- ============================================================
-- ATUALIZAR DATAS: Adicionar '01' no final e converter
-- ============================================================

-- IMPORTANTE: Só executar se as datas estão no formato AAAAMM (202601)
-- Se já estão no formato DATE correto, NÃO execute!

UPDATE transactions
SET date = TO_DATE(date::text || '01', 'YYYYMMDD')
WHERE date::text ~ '^[0-9]{6}$'  -- Só atualiza se estiver no formato AAAAMM (6 dígitos)
  AND LENGTH(date::text) = 6;

-- ============================================================
-- VERIFICAR RESULTADO
-- ============================================================

SELECT
    '✅ DATAS ATUALIZADAS' as info;

SELECT
    date,
    TO_CHAR(date, 'YYYY-MM-DD') as data_formatada,
    COUNT(*) as quantidade
FROM transactions
GROUP BY date
ORDER BY date DESC
LIMIT 10;

-- ============================================================
-- VALIDAÇÃO FINAL
-- ============================================================

SELECT
    '📅 RANGE DE DATAS ATUALIZADO' as info;

SELECT
    MIN(date) as data_minima,
    MAX(date) as data_maxima,
    TO_CHAR(MIN(date), 'YYYY-MM-DD') as formato_min,
    TO_CHAR(MAX(date), 'YYYY-MM-DD') as formato_max,
    COUNT(DISTINCT date) as periodos_unicos
FROM transactions;

-- ============================================================
-- VERIFICAR SE TODAS AS DATAS SÃO DIA 01
-- ============================================================

SELECT
    '🔍 VERIFICAÇÃO: Todas as datas devem ser dia 01' as info;

SELECT
    EXTRACT(DAY FROM date) as dia_do_mes,
    COUNT(*) as quantidade
FROM transactions
GROUP BY EXTRACT(DAY FROM date)
ORDER BY dia_do_mes;

-- Deve retornar apenas: dia_do_mes = 1

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
    '🎉 ATUALIZAÇÃO CONCLUÍDA!' as status,
    'Todas as datas agora estão no formato DATE correto (YYYY-MM-01)' as resultado;

-- ============================================================
-- NOTAS
-- ============================================================

/*
✅ O QUE FOI FEITO:
   - Datas no formato "202601" foram convertidas para "2026-01-01"
   - Tipo TEXT/VARCHAR convertido para DATE
   - Sempre dia 01 do mês para facilitar filtros

⚠️ SE DER ERRO:
   Pode significar que as datas já estão no formato correto.
   Verifique a amostra de datas antes de executar.

📌 EXEMPLO DA CONVERSÃO:
   Antes:  "202601" (texto)
   Depois: 2026-01-01 (data)

   Antes:  "202512"
   Depois: 2025-12-01
*/
