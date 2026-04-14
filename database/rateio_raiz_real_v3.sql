-- ══════════════════════════════════════════════════════════════════════
-- RATEIO_RAIZ_REAL_V3.sql
-- Rateio ADM — com override_contabil + transactions_manual
--
-- Mudanças vs V2:
--   - CTE rz_ebitda: UNION ALL transactions + transactions_manual,
--     com NOT EXISTS override_contabil no bloco transactions
--   - CTE receita_por_filial: idem
--   - Padrão idêntico ao calcular_tributos()
--
-- Versão: 3.2 — 14/04/2026
-- Mudanças vs 3.1:
--   - receita_base: excluir marcas SE e GOV da base de receita (além de RZ)
-- Mudanças vs 3.0:
--   - Substituir UPSERT por DELETE + INSERT limpo
--     Motivo: UPSERT deixa registros órfãos quando receita é ajustada/removida,
--     corrompendo share_pct (soma > 100%) e valor_rateado total
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS calcular_rateio_raiz_real();

CREATE OR REPLACE FUNCTION calcular_rateio_raiz_real()
RETURNS TABLE (
  o_year_month    TEXT,
  o_rz_ebitda     NUMERIC,
  o_filiais_ok    BIGINT,
  o_total_rateado NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ts TIMESTAMPTZ := NOW();
BEGIN
  SET LOCAL row_security = off;

  -- ── LIMPEZA: deletar rateios existentes antes de recalcular ──────────────
  -- Necessário para garantir que ajustes de receita (ex: batido, transactions_manual)
  -- sejam refletidos corretamente. UPSERT deixaria registros órfãos quando uma filial
  -- perde receita, corrompendo share_pct e valor_rateado total.
  --
  -- Escopo: apenas meses que têm custos RZ na base (os que serão recalculados)
  DELETE FROM transactions
  WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%'
    AND LEFT(date::text, 7) IN (
      SELECT DISTINCT LEFT(date::text, 7)
      FROM transactions
      WHERE marca = 'RZ'
        AND (tag0 LIKE '02.%' OR tag0 LIKE '03.%' OR tag0 LIKE '04.%')
        AND COALESCE(scenario, 'Real') IN ('Real', 'Original')
    );

  DELETE FROM rateio_raiz_log
  WHERE year_month IN (
    SELECT DISTINCT LEFT(date::text, 7)
    FROM transactions
    WHERE marca = 'RZ'
      AND (tag0 LIKE '02.%' OR tag0 LIKE '03.%' OR tag0 LIKE '04.%')
      AND COALESCE(scenario, 'Real') IN ('Real', 'Original')
  );
  -- ─────────────────────────────────────────────────────────────────────────

  WITH
  -- 1. EBITDA da RZ por mês (custos da holding: 02, 03, 04)
  --    transactions (com override_contabil) + transactions_manual
  rz_ebitda AS (
    -- transactions: excluir tag01 com override ativo
    SELECT
      LEFT(t.date::text, 7) AS ym,
      SUM(t.amount)         AS ebitda_rz
    FROM transactions t
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.marca = 'RZ'
      AND (t.tag0 LIKE '01.%' OR t.tag0 LIKE '02.%' OR t.tag0 LIKE '03.%' OR t.tag0 LIKE '04.%')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND NOT EXISTS (
        SELECT 1 FROM override_contabil oc
        WHERE oc.ativo = true
          AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
          AND (oc.marca  IS NULL OR oc.marca  = t.marca)
          AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
          AND (oc.mes_de  IS NULL OR LEFT(t.date::text, 7) >= oc.mes_de)
          AND (oc.mes_ate IS NULL OR LEFT(t.date::text, 7) <= oc.mes_ate)
      )
    GROUP BY 1

    UNION ALL

    -- transactions_manual: sempre incluso (é o override)
    SELECT
      LEFT(t.date::text, 7) AS ym,
      SUM(t.amount)         AS ebitda_rz
    FROM transactions_manual t
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.marca = 'RZ'
      AND (t.tag0 LIKE '01.%' OR t.tag0 LIKE '02.%' OR t.tag0 LIKE '03.%' OR t.tag0 LIKE '04.%')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
    GROUP BY 1
  ),
  -- Consolidar EBITDA RZ (soma transactions + manual)
  rz_ebitda_total AS (
    SELECT ym, SUM(ebitda_rz) AS ebitda_rz
    FROM rz_ebitda
    GROUP BY ym
  ),

  -- 2. Receita bruta por filial por mês
  --    transactions (com override_contabil) + transactions_manual
  receita_base AS (
    -- transactions: excluir tag01 com override ativo
    SELECT
      LEFT(t.date::text, 7) AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.amount
    FROM transactions t
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.filial IS NOT NULL
      AND (t.marca IS NULL OR t.marca NOT IN ('RZ', 'SE', 'GOV'))
      AND t.tag0 LIKE '01.%'
      AND LOWER(TRIM(t.tag01)) NOT IN (
            'tributos',
            'devolu' || chr(231) || chr(245) || 'es & cancelamentos',
            'devolucoes & cancelamentos'
          )
      AND NOT EXISTS (
        SELECT 1 FROM override_contabil oc
        WHERE oc.ativo = true
          AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
          AND (oc.marca  IS NULL OR oc.marca  = t.marca)
          AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
          AND (oc.mes_de  IS NULL OR LEFT(t.date::text, 7) >= oc.mes_de)
          AND (oc.mes_ate IS NULL OR LEFT(t.date::text, 7) <= oc.mes_ate)
      )

    UNION ALL

    -- transactions_manual: sempre incluso
    SELECT
      LEFT(t.date::text, 7) AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.amount
    FROM transactions_manual t
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.filial IS NOT NULL
      AND (t.marca IS NULL OR t.marca NOT IN ('RZ', 'SE', 'GOV'))
      AND t.tag0 LIKE '01.%'
      AND LOWER(TRIM(t.tag01)) NOT IN (
            'tributos',
            'devolu' || chr(231) || chr(245) || 'es & cancelamentos',
            'devolucoes & cancelamentos'
          )
  ),
  receita_por_filial AS (
    SELECT
      ym,
      filial,
      COALESCE(MAX(nome_filial), MAX(filial))        AS nome_filial,
      MAX(CASE WHEN marca <> 'RZ' THEN marca END)    AS marca,
      SUM(amount)                                     AS receita_bruta
    FROM receita_base
    GROUP BY ym, filial
    HAVING SUM(amount) > 0
  ),

  -- 3. Receita total consolidada por mês
  receita_total_mes AS (
    SELECT ym, SUM(receita_bruta) AS receita_total
    FROM receita_por_filial
    GROUP BY ym
  ),

  -- 4. Rateio: share e valor por filial
  rateio AS (
    SELECT
      rpf.ym,
      rpf.filial,
      rpf.nome_filial,
      rpf.marca,
      rz.ebitda_rz,
      rpf.receita_bruta,
      rtm.receita_total,
      rpf.receita_bruta / rtm.receita_total                   AS share_pct,
      rz.ebitda_rz * (rpf.receita_bruta / rtm.receita_total)  AS valor_rateado
    FROM receita_por_filial rpf
    JOIN receita_total_mes  rtm ON rtm.ym = rpf.ym
    JOIN rz_ebitda_total    rz  ON rz.ym  = rpf.ym
  )

  -- 5. INSERT no log de auditoria (DELETE foi feito antes — sem conflitos)
  INSERT INTO rateio_raiz_log
    (year_month, calculated_at, rz_ebitda,
     filial, nome_filial, marca,
     receita_bruta, receita_total, share_pct, valor_rateado)
  SELECT
    r.ym, v_ts, r.ebitda_rz,
    r.filial, r.nome_filial, r.marca,
    r.receita_bruta, r.receita_total, r.share_pct, r.valor_rateado
  FROM rateio r;

  -- 6. INSERT em transactions (DELETE foi feito antes — sem conflitos)
  INSERT INTO transactions (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    gen_random_uuid()::text,
    (l.year_month || '-01'),
    'Rateios RZ calculado Supabase',
    'RATEIO ADM',
    '4.2.1.17.01.01',
    l.valor_rateado,
    'RATEIO',
    'Real',
    'Rateado',
    l.filial,
    l.nome_filial,
    l.marca,
    '05. RATEIO RAIZ',
    'RATEIO ADM',
    'Rateio Despesas Intercompany',
    'Rateio Despesas Intercompany',
    'RZ Educação — CSC',
    'Sim',
    'RATEIO_RAIZ_REAL_' || l.year_month || '_' || l.filial
  FROM rateio_raiz_log l
  WHERE l.calculated_at = v_ts;

  -- Retorno: resumo por mês
  RETURN QUERY
  SELECT
    l.year_month,
    MAX(l.rz_ebitda),
    COUNT(*)::BIGINT,
    SUM(l.valor_rateado)
  FROM rateio_raiz_log l
  WHERE l.calculated_at = v_ts
  GROUP BY l.year_month
  ORDER BY l.year_month;
END;
$$;

-- Executar e conferir
SELECT * FROM calcular_rateio_raiz_real();
