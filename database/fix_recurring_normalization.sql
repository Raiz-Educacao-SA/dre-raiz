-- ═══════════════════════════════════════════════════════════════════
-- fix_recurring_normalization.sql
-- Normaliza o campo recurring em todas as tabelas e atualiza RPCs
-- para comparação case-insensitive.
--
-- Problema: recurring contém variações (sim, SIM, não, NÃO, Nao, etc.)
-- que não casam com o filtro 'Sim'/'Não' do frontend.
--
-- Solução em 2 partes:
-- 1. UPDATE: normaliza dados existentes para 'Sim' ou 'Não'
-- 2. SQL function: usa INITCAP(COALESCE(t.recurring, 'Sim'))
--    para comparação case-insensitive mesmo com dados futuros
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════
-- PARTE 1: Normalizar dados existentes
-- ══════════════════════════════════

-- transactions
UPDATE transactions SET recurring = 'Sim'
WHERE recurring IS NOT NULL AND LOWER(TRIM(recurring)) = 'sim' AND recurring != 'Sim';

UPDATE transactions SET recurring = 'Não'
WHERE recurring IS NOT NULL
  AND LOWER(TRANSLATE(TRIM(recurring), 'ãÃ', 'aA')) IN ('nao', 'nAo')
  AND recurring != 'Não';

-- transactions_orcado
UPDATE transactions_orcado SET recurring = 'Sim'
WHERE recurring IS NOT NULL AND LOWER(TRIM(recurring)) = 'sim' AND recurring != 'Sim';

UPDATE transactions_orcado SET recurring = 'Não'
WHERE recurring IS NOT NULL
  AND LOWER(TRANSLATE(TRIM(recurring), 'ãÃ', 'aA')) IN ('nao', 'nAo')
  AND recurring != 'Não';

-- transactions_ano_anterior
UPDATE transactions_ano_anterior SET recurring = 'Sim'
WHERE recurring IS NOT NULL AND LOWER(TRIM(recurring)) = 'sim' AND recurring != 'Sim';

UPDATE transactions_ano_anterior SET recurring = 'Não'
WHERE recurring IS NOT NULL
  AND LOWER(TRANSLATE(TRIM(recurring), 'ãÃ', 'aA')) IN ('nao', 'nAo')
  AND recurring != 'Não';

-- ══════════════════════════════════
-- PARTE 2: Atualizar get_soma_tags com comparação case-insensitive
-- ══════════════════════════════════

DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text);
DROP FUNCTION IF EXISTS get_soma_tags(text, text, text[], text[], text[], text[], text, text[]);

CREATE OR REPLACE FUNCTION get_soma_tags(
  p_month_from   text   DEFAULT NULL,
  p_month_to     text   DEFAULT NULL,
  p_marcas       text[] DEFAULT NULL,
  p_nome_filiais text[] DEFAULT NULL,
  p_tags02       text[] DEFAULT NULL,
  p_tags01       text[] DEFAULT NULL,
  p_recurring    text   DEFAULT NULL,
  p_tags03       text[] DEFAULT NULL
)
RETURNS TABLE(tag0 text, tag01 text, scenario text, month text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1. Real
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (t.scenario IS NULL OR t.scenario = 'Real')
    AND (p_month_from   IS NULL OR t.date >= p_month_from || '-01')
    AND (p_month_to     IS NULL OR t.date <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR t.date::text >= p_month_from || '-01')
    AND (p_month_to IS NULL OR t.date::text <= p_month_to   || '-31')
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE
    (p_month_from   IS NULL OR to_char(t.date, 'MM') >= substring(p_month_from, 6, 2))
    AND (p_month_to IS NULL OR to_char(t.date, 'MM') <= substring(p_month_to,   6, 2))
    AND (p_marcas       IS NULL OR t.marca       = ANY(p_marcas))
    AND (p_nome_filiais IS NULL OR t.nome_filial = ANY(p_nome_filiais))
    AND (p_tags02       IS NULL OR t.tag02       = ANY(p_tags02))
    AND (p_tags01       IS NULL OR t.tag01       = ANY(p_tags01))
    AND (p_recurring    IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND (p_tags03       IS NULL OR t.tag03       = ANY(p_tags03))
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO anon;

-- ══════════════════════════════════
-- PARTE 3: Atualizar dre_agg com normalização
-- ══════════════════════════════════

SET statement_timeout = 0;

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- Real
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação') AS tag0,
    t.tag01,
    t.tag02,
    t.tag03,
    t.marca,
    t.nome_filial,
    t.vendor,
    to_char(t.date::date,'YYYY-MM') AS month,
    'Real' AS scenario,
    SUM(t.amount) AS total,
    INITCAP(COALESCE(t.recurring, 'Sim')) AS recurring
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE t.scenario IS NULL OR t.scenario = 'Real'
  GROUP BY 1,2,3,4,5,6,7,8,9,11

  UNION ALL

  -- Orçado
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação') AS tag0,
    t.tag01,
    t.tag02,
    t.tag03,
    t.marca,
    t.nome_filial,
    t.vendor,
    to_char(t.date,'YYYY-MM') AS month,
    'Orçado' AS scenario,
    SUM(t.amount) AS total,
    INITCAP(COALESCE(t.recurring, 'Sim')) AS recurring
  FROM transactions_orcado t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY 1,2,3,4,5,6,7,8,9,11

  UNION ALL

  -- A-1
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação') AS tag0,
    t.tag01,
    t.tag02,
    t.tag03,
    t.marca,
    t.nome_filial,
    t.vendor,
    to_char(t.date,'YYYY-MM') AS month,
    'A-1' AS scenario,
    SUM(t.amount) AS total,
    INITCAP(COALESCE(t.recurring, 'Sim')) AS recurring
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  GROUP BY 1,2,3,4,5,6,7,8,9,11
;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_dre_agg_recurring ON dre_agg(recurring);

RESET statement_timeout;
