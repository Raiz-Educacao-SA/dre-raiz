-- ═══════════════════════════════════════════════════════════════════
-- fix_tag0_uniformidade.sql
-- Garante que TODO tag0 vem da tag0_map (fonte única de verdade)
--
-- Correções:
--   1. calcular_pdd() — busca tag0 da tag0_map ao invés de hardcodar
--   2. calcular_rateio_raiz_real() — busca tag0 da tag0_map + inclui tag0 no ON CONFLICT UPDATE
--   3. Remove trigger duplicado trg_propagar_tag0_map_para_tags (já coberto pelo unificado)
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
-- PARTE 1: Remover trigger duplicado no tag0_map
-- O fn_propagate_tag0_map_change() já cobre as 4 tabelas
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_propagar_tag0_map_para_tags ON tag0_map;
DROP FUNCTION IF EXISTS fn_propagar_tag0_map_para_tags();


-- ══════════════════════════════════════════════════════════════
-- PARTE 2: Corrigir calcular_pdd() — tag0 via tag0_map
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS calcular_pdd();

CREATE OR REPLACE FUNCTION calcular_pdd()
RETURNS TABLE (
  o_year_month    TEXT,
  o_rz_ebitda     NUMERIC,
  o_share_pdd     NUMERIC,
  o_valor_pdd     NUMERIC,
  o_filial        TEXT,
  o_marca         TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ts    TIMESTAMPTZ := NOW();
  v_tag01 TEXT;
  v_tag02 TEXT;
  v_tag03 TEXT;
  v_tag0  TEXT;
BEGIN
  SET LOCAL row_security = off;

  -- Buscar tags via de-para da conta contábil 4.2.1.13.01.03
  SELECT cc.tag1, cc.tag2, cc.tag3
    INTO v_tag01, v_tag02, v_tag03
  FROM tags cc
  WHERE cc.cod_conta = '4.2.1.13.01.03'
  LIMIT 1;

  -- Defaults se a conta não existir no de-para
  v_tag01 := COALESCE(v_tag01, 'PDD');
  v_tag02 := COALESCE(v_tag02, 'Provisão para Devedores Duvidosos');
  v_tag03 := COALESCE(v_tag03, 'Provisão para Devedores Duvidosos');

  -- Tag0 via tag0_map (fonte única de verdade)
  SELECT tm.tag0 INTO v_tag0
  FROM tag0_map tm
  WHERE LOWER(TRIM(tm.tag1_norm)) = LOWER(TRIM(v_tag01))
  LIMIT 1;

  v_tag0 := COALESCE(v_tag0, '04. SG&A');  -- fallback só se tag0_map não tiver

  -- Garantir que tag0_map tem o mapeamento
  IF v_tag01 IS NOT NULL THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES (LOWER(TRIM(v_tag01)), v_tag01, v_tag0)
    ON CONFLICT (tag1_norm) DO NOTHING;
  END IF;

  WITH
  -- 1. Receita bruta por filial/mês (contas definidas em pdd_contas, recurring='Sim')
  receita_base AS (
    SELECT
      LEFT(t.date::text, 7)                           AS ym,
      t.filial,
      COALESCE(t.nome_filial, t.filial)               AS nome_filial,
      t.marca,
      SUM(t.amount)                                   AS receita
    FROM transactions t
    JOIN pdd_contas pc
      ON t.tag0           = pc.tag0
     AND t.tag01          = pc.tag01
    WHERE INITCAP(COALESCE(t.recurring, 'Sim')) = 'Sim'
      AND (t.scenario IS NULL OR t.scenario = 'Real')
    GROUP BY 1,2,3,4
  ),
  -- 2. Cruzar com share PDD por marca
  calc AS (
    SELECT
      r.ym,
      r.filial,
      r.nome_filial,
      r.marca,
      r.receita,
      COALESCE(s.share_percent, 0)                    AS share_pdd,
      ROUND(r.receita * COALESCE(s.share_percent, 0) / 100 * -1, 2) AS valor_pdd
    FROM receita_base r
    LEFT JOIN share_pdd s ON UPPER(TRIM(r.marca)) = UPPER(TRIM(s.marca))
    WHERE r.receita <> 0
  )
  -- 3. Gravar log
  INSERT INTO pdd_log (year_month, filial, nome_filial, marca, receita_base, share_percent, valor_pdd, calculated_at)
  SELECT ym, filial, nome_filial, marca, receita, share_pdd, valor_pdd, v_ts
  FROM calc;

  -- 4. UPSERT em transactions (chave idempotente: PDD_REAL_YYYY-MM_FILIAL)
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
    'PDD calculado Supabase',
    v_tag01,
    '4.2.1.13.01.03',
    l.valor_pdd,
    v_tag0,
    'Real',
    'Calculado',
    l.filial,
    l.nome_filial,
    l.marca,
    v_tag0,
    v_tag01,
    v_tag02,
    v_tag03,
    'Planejamento Financeiro',
    'Sim',
    'PDD_REAL_' || l.year_month || '_' || l.filial
  FROM pdd_log l
  WHERE l.calculated_at = v_ts
  ON CONFLICT (chave_id) DO UPDATE SET
    amount      = EXCLUDED.amount,
    tag0        = EXCLUDED.tag0,
    tag01       = EXCLUDED.tag01,
    tag02       = EXCLUDED.tag02,
    tag03       = EXCLUDED.tag03,
    nome_filial = EXCLUDED.nome_filial,
    marca       = EXCLUDED.marca,
    updated_at  = NOW();

  -- Retorno
  RETURN QUERY
  SELECT
    l.year_month,
    0::numeric,
    l.share_percent,
    l.valor_pdd,
    l.filial,
    l.marca
  FROM pdd_log l
  WHERE l.calculated_at = v_ts
  ORDER BY l.year_month, l.filial;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- PARTE 3: Corrigir calcular_rateio_raiz_real() — tag0 via tag0_map
-- + tag0 no ON CONFLICT UPDATE
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS calcular_rateio_raiz_real();

CREATE OR REPLACE FUNCTION calcular_rateio_raiz_real()
RETURNS TABLE (
  o_year_month    TEXT,
  o_rz_ebitda     NUMERIC,
  o_filiais_ok    BIGINT,
  o_total_rateado NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_ts   TIMESTAMPTZ := NOW();
  v_tag0 TEXT;
BEGIN
  -- Tag0 via tag0_map (fonte única de verdade)
  SELECT tm.tag0 INTO v_tag0
  FROM tag0_map tm
  WHERE LOWER(TRIM(tm.tag1_norm)) = 'rateio adm'
  LIMIT 1;

  v_tag0 := COALESCE(v_tag0, '05. RATEIO RAIZ');  -- fallback

  -- Garantir mapeamento na tag0_map
  INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
  VALUES ('rateio adm', 'RATEIO ADM', v_tag0)
  ON CONFLICT (tag1_norm) DO NOTHING;

  -- 1. Calcular EBITDA da marca RZ (prefixos 01-04 do tag0)
  WITH rz_ebitda AS (
    SELECT
      LEFT(t.date::text, 7) AS ym,
      SUM(t.amount) AS ebitda
    FROM transactions t
    WHERE marca = 'RZ'
      AND (tag0 LIKE '01.%' OR tag0 LIKE '02.%' OR tag0 LIKE '03.%' OR tag0 LIKE '04.%')
      AND (scenario IS NULL OR scenario = 'Real')
    GROUP BY 1
  ),
  -- 2. Receita por filial (para calcular share)
  filial_receita AS (
    SELECT
      LEFT(t.date::text, 7) AS ym,
      t.filial,
      COALESCE(t.nome_filial, t.filial) AS nome_filial,
      t.marca,
      SUM(t.amount) AS receita
    FROM transactions t
    WHERE tag0 LIKE '01.%'
      AND (scenario IS NULL OR scenario = 'Real')
      AND marca != 'RZ'
    GROUP BY 1,2,3,4
  ),
  -- 3. Total receita por mês (para share%)
  total_receita AS (
    SELECT ym, SUM(receita) AS total
    FROM filial_receita
    GROUP BY 1
  ),
  -- 4. Rateio por filial
  rateio AS (
    SELECT
      f.ym,
      f.filial,
      f.nome_filial,
      f.marca,
      r.ebitda AS rz_ebitda,
      CASE WHEN t.total != 0 THEN f.receita / t.total ELSE 0 END AS share,
      CASE WHEN t.total != 0 THEN ROUND(r.ebitda * (f.receita / t.total), 2) ELSE 0 END AS valor_rateado
    FROM filial_receita f
    JOIN rz_ebitda r ON r.ym = f.ym
    JOIN total_receita t ON t.ym = f.ym
  )
  -- 5. Gravar log
  INSERT INTO rateio_raiz_log (year_month, filial, nome_filial, marca, rz_ebitda, share_percent, valor_rateado, calculated_at)
  SELECT ym, filial, nome_filial, marca, rz_ebitda, share, valor_rateado, v_ts
  FROM rateio;

  -- 6. UPSERT em transactions
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
    v_tag0,
    'RATEIO ADM',
    'Rateio Despesas Intercompany',
    'Rateio Despesas Intercompany',
    'RZ Educação — CSC',
    'Sim',
    'RATEIO_RAIZ_REAL_' || l.year_month || '_' || l.filial
  FROM rateio_raiz_log l
  WHERE l.calculated_at = v_ts
  ON CONFLICT (chave_id) DO UPDATE SET
    amount      = EXCLUDED.amount,
    tag0        = EXCLUDED.tag0,
    nome_filial = EXCLUDED.nome_filial,
    marca       = EXCLUDED.marca,
    updated_at  = NOW();

  -- Retorno (agrupado por mês, mesma assinatura original)
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
