-- ══════════════════════════════════════════════════════════════════════
-- PDD — ETAPA 1: Query de validação (SEM inserção)
--
-- Lógica:
--   1. Soma receita bruta das contas definidas em pdd_contas
--      Filtros: scenario Real/Original, recurring='Sim'
--      Agrupado por: mês (year_month), filial, marca
--   2. Busca o % PDD da marca na tabela share_pdd
--   3. Calcula: receita_bruta * share_pdd% / 100 * -1 (custo negativo)
--
-- Execute esta query no Supabase SQL Editor para validar os números
-- antes de criar a função automática.
-- ══════════════════════════════════════════════════════════════════════

WITH
-- 1. Receita bruta por filial/mês — apenas contas definidas em pdd_contas
receita_base AS (
  SELECT
    LEFT(t.date::text, 7)                           AS year_month,
    t.filial,
    COALESCE(MAX(t.nome_filial), MAX(t.filial))     AS nome_filial,
    MAX(t.marca)                                    AS marca,
    SUM(t.amount)                                   AS receita_bruta
  FROM transactions t
  INNER JOIN pdd_contas pc
    ON t.tag0  = pc.tag0
   AND t.tag01 = pc.tag01
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND COALESCE(t.recurring, 'Sim') = 'Sim'
    AND t.filial IS NOT NULL
  GROUP BY 1, 2
  HAVING SUM(t.amount) <> 0
),
-- 2. Join com share_pdd para obter o percentual por marca
calculo AS (
  SELECT
    rb.year_month,
    rb.filial,
    rb.nome_filial,
    rb.marca,
    rb.receita_bruta,
    sp.valor                                        AS share_pdd_pct,
    ROUND(rb.receita_bruta * sp.valor / 100 * -1, 2) AS valor_pdd
  FROM receita_base rb
  INNER JOIN share_pdd sp ON sp.marca = rb.marca
)
-- 3. Resultado para validação
SELECT
  year_month                                        AS mes,
  filial,
  nome_filial,
  marca,
  TO_CHAR(receita_bruta, 'FM999,999,990.00')        AS receita_bruta,
  TO_CHAR(share_pdd_pct, 'FM990.00') || '%'          AS "% PDD",
  TO_CHAR(valor_pdd, 'FM999,999,990.00')             AS valor_pdd
FROM calculo
ORDER BY year_month, marca, filial;
