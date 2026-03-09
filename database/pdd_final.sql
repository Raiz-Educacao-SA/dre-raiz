-- ══════════════════════════════════════════════════════════════════════
-- PDD — SQL FINAL COMPLETO (rodar de uma vez no Supabase)
--
-- Lógica:
--   1. Soma receita das contas em pdd_contas (recurring='Sim', Real/Original)
--   2. Aplica share_pdd (% por marca)
--   3. valor_pdd = receita_bruta × share% / 100 × -1 (custo negativo)
--   4. UPSERT em pdd_log + transactions
--   5. Refresh dre_agg
--   6. pg_cron a cada 15 minutos
--
-- Campos em transactions:
--   conta_contabil = '4.2.1.13.01.03'
--   tag0 / type    = '04. SG&A'
--   tag01/02/03    = via de-para da tabela tags
--   vendor         = 'Planejamento Financeiro'
--   chave_id       = 'PDD_REAL_YYYY-MM_FILIAL'
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1 — Tabela de log (auditoria)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pdd_log (
  id              BIGSERIAL     PRIMARY KEY,
  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  year_month      TEXT          NOT NULL,
  filial          TEXT          NOT NULL,
  nome_filial     TEXT,
  marca           TEXT,
  receita_bruta   NUMERIC       NOT NULL,
  share_pdd_pct   NUMERIC(5,2)  NOT NULL,
  valor_pdd       NUMERIC       NOT NULL,
  CONSTRAINT pdd_log_unico UNIQUE (year_month, filial)
);

CREATE INDEX IF NOT EXISTS idx_pdd_log_yearmonth ON pdd_log (year_month);
CREATE INDEX IF NOT EXISTS idx_pdd_log_filial    ON pdd_log (filial);

ALTER TABLE pdd_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdd_log_select" ON pdd_log;
CREATE POLICY "pdd_log_select" ON pdd_log
  FOR SELECT TO authenticated USING (true);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 2 — Garantir mapeamento no tag0_map
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tag1 TEXT;
BEGIN
  SELECT tag1 INTO v_tag1
  FROM tags
  WHERE cod_conta = '4.2.1.13.01.03'
  LIMIT 1;

  IF v_tag1 IS NOT NULL THEN
    INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
    VALUES (LOWER(TRIM(v_tag1)), v_tag1, '04. SG&A')
    ON CONFLICT (tag1_norm) DO NOTHING;
  END IF;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 3 — Função principal
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS calcular_pdd();

CREATE OR REPLACE FUNCTION calcular_pdd()
RETURNS TABLE (
  o_year_month    TEXT,
  o_filiais       BIGINT,
  o_total_pdd     NUMERIC
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

  -- Tag0 fixo
  v_tag0 := '04. SG&A';

  WITH
  -- 1. Receita bruta por filial/mês (contas definidas em pdd_contas, recurring='Sim')
  --    Empilha transactions + transactions_manual, respeitando override_contabil
  receita_base AS (
    -- 1a. transactions (contábil) — exclui linhas com override ativo
    SELECT
      LEFT(t.date::text, 7)                           AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.amount
    FROM transactions t
    INNER JOIN pdd_contas pc
      ON t.tag0  = pc.tag0
     AND t.tag01 = pc.tag01
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'PDD_REAL_%'
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

    -- 1b. transactions_manual — sempre incluso (é a substituição)
    SELECT
      LEFT(t.date::text, 7)                           AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.amount
    FROM transactions_manual t
    INNER JOIN pdd_contas pc
      ON t.tag0  = pc.tag0
     AND t.tag01 = pc.tag01
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
  ),
  receita_agg AS (
    SELECT
      ym,
      filial,
      COALESCE(MAX(nome_filial), MAX(filial))     AS nome_filial,
      MAX(marca)                                  AS marca,
      SUM(amount)                                 AS receita_bruta
    FROM receita_base
    GROUP BY 1, 2
    HAVING SUM(amount) <> 0
  ),
  -- 2. Aplica share_pdd por marca
  calculo AS (
    SELECT
      rb.ym,
      rb.filial,
      rb.nome_filial,
      rb.marca,
      rb.receita_bruta,
      sp.valor                                          AS share_pdd_pct,
      ROUND(rb.receita_bruta * sp.valor / 100 * -1, 2)  AS valor_pdd
    FROM receita_agg rb
    INNER JOIN share_pdd sp ON sp.marca = rb.marca
  )
  -- 3. UPSERT no log de auditoria
  INSERT INTO pdd_log
    (year_month, calculated_at, filial, nome_filial, marca,
     receita_bruta, share_pdd_pct, valor_pdd)
  SELECT
    c.ym, v_ts, c.filial, c.nome_filial, c.marca,
    c.receita_bruta, c.share_pdd_pct, c.valor_pdd
  FROM calculo c
  ON CONFLICT (year_month, filial) DO UPDATE SET
    calculated_at = v_ts,
    nome_filial   = EXCLUDED.nome_filial,
    marca         = EXCLUDED.marca,
    receita_bruta = EXCLUDED.receita_bruta,
    share_pdd_pct = EXCLUDED.share_pdd_pct,
    valor_pdd     = EXCLUDED.valor_pdd;

  -- 4. UPSERT em transactions
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
    'PDD calculada Supabase',
    'PDD',
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
    nome_filial = EXCLUDED.nome_filial,
    marca       = EXCLUDED.marca,
    tag0        = EXCLUDED.tag0,
    tag01       = EXCLUDED.tag01,
    tag02       = EXCLUDED.tag02,
    tag03       = EXCLUDED.tag03,
    updated_at  = NOW();

  -- 5. Refresh materialized view
  PERFORM refresh_dre_agg();

  -- 6. Retorno: resumo por mês
  RETURN QUERY
  SELECT
    l.year_month,
    COUNT(*)::BIGINT,
    SUM(l.valor_pdd)
  FROM pdd_log l
  WHERE l.calculated_at = v_ts
  GROUP BY l.year_month
  ORDER BY l.year_month;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 4 — Agendar pg_cron (a cada 15 minutos, igual ao rateio)
-- ══════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'calcular-pdd',
  '*/15 * * * *',
  'SELECT calcular_pdd()'
);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 5 — Executar primeira vez e conferir
-- ══════════════════════════════════════════════════════════════════════

-- Verificar de-para que será usado
SELECT
  cod_conta,
  tag1 AS "tag01",
  tag2 AS "tag02",
  tag3 AS "tag03"
FROM tags
WHERE cod_conta = '4.2.1.13.01.03';

-- Executar o cálculo
SELECT * FROM calcular_pdd();

-- Conferir log
SELECT
  year_month                                  AS mes,
  filial,
  nome_filial,
  marca,
  TO_CHAR(receita_bruta, 'FM999,999,990.00')  AS receita,
  TO_CHAR(share_pdd_pct, 'FM990.00') || '%'   AS "% PDD",
  TO_CHAR(valor_pdd, 'FM999,999,990.00')      AS valor_pdd
FROM pdd_log
ORDER BY year_month, marca, filial;

-- Conferir transactions inseridas
SELECT
  LEFT(date::text, 7) AS mes,
  filial,
  marca,
  TO_CHAR(amount, 'FM999,999,990.00') AS valor,
  conta_contabil,
  tag0, tag01, tag02, tag03,
  vendor, type,
  chave_id
FROM transactions
WHERE chave_id LIKE 'PDD_REAL_%'
  AND scenario = 'Real'
ORDER BY date, filial;

-- Conferir job pg_cron ativo
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'calcular-pdd';
