-- ══════════════════════════════════════════════════════════════════════
-- calcular_tributos_v2.sql
-- Cálculo automático de tributos (PIS/COFINS, ISS, PAA) sobre receita
-- V2: temp tables, marca no GROUP BY, marca na UNIQUE, marca no chave_id
--
-- Lógica:
--   1. Soma receita por marca/filial/mês/tipo_receita (tag01) de tag0='01. RECEITA LIQUIDA'
--      Empilha transactions + transactions_manual, respeitando override_contabil
--   2. Cruza com tributos_config (alíquotas por marca+filial+tipo_receita)
--   3. Calcula: PIS/COFINS(-), ISS(-), PAA(+)
--   4. Gera 3 lançamentos por combinação
--   5. DELETE + INSERT em transactions_manual (sem lixo)
--   6. UPSERT em tributos_log (auditoria)
--   7. Refresh dre_agg
--   8. pg_cron a cada 15 minutos
--
-- Contas contábeis:
--   PIS/COFINS = 3.1.3.01.01.03 (negativo)
--   ISS        = 3.1.3.01.01.01 (negativo)
--   PAA        = 3.1.3.01.01.50 (positivo)
--
-- chave_id = 'TRIB_{TIPO}_{MARCA}_{YYYY-MM}_{FILIAL}_{TIPORECEITA}'
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1 — Tabela de log (auditoria) — com marca na UNIQUE
-- ══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS tributos_log CASCADE;

CREATE TABLE tributos_log (
  id              BIGSERIAL     PRIMARY KEY,
  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  year_month      TEXT          NOT NULL,
  filial          TEXT          NOT NULL,
  nome_filial     TEXT,
  marca           TEXT          NOT NULL,
  tipo_receita    TEXT          NOT NULL,
  receita_bruta   NUMERIC       NOT NULL,
  pis_cofins_pct  NUMERIC(8,4)  NOT NULL DEFAULT 0,
  pis_cofins_val  NUMERIC       NOT NULL DEFAULT 0,
  iss_pct         NUMERIC(8,4)  NOT NULL DEFAULT 0,
  iss_val         NUMERIC       NOT NULL DEFAULT 0,
  paa_pct         NUMERIC(8,4)  NOT NULL DEFAULT 0,
  paa_val         NUMERIC       NOT NULL DEFAULT 0,
  total_tributos  NUMERIC       NOT NULL DEFAULT 0,
  CONSTRAINT tributos_log_unico UNIQUE (year_month, marca, filial, tipo_receita)
);

CREATE INDEX IF NOT EXISTS idx_tributos_log_yearmonth ON tributos_log (year_month);
CREATE INDEX IF NOT EXISTS idx_tributos_log_filial    ON tributos_log (filial);
CREATE INDEX IF NOT EXISTS idx_tributos_log_marca     ON tributos_log (marca);

ALTER TABLE tributos_log DISABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1b — Garantir UNIQUE no chave_id de transactions_manual
-- ══════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_chave_id_unique
  ON transactions_manual (chave_id)
  WHERE chave_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 2 — Função principal (temp tables)
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS calcular_tributos();

CREATE OR REPLACE FUNCTION calcular_tributos()
RETURNS TABLE (
  o_year_month      TEXT,
  o_combinacoes     BIGINT,
  o_total_tributos  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ts       TIMESTAMPTZ := NOW();
  v_tag0_out TEXT := '02. CUSTOS VARIÁVEIS';
  v_vendor   TEXT := 'Planejamento Financeiro';
BEGIN
  SET LOCAL row_security = off;

  -- ====== TEMP TABLE: receita agregada por marca/filial/mês/tipo ======
  CREATE TEMP TABLE _trib_receita ON COMMIT DROP AS
  SELECT
    ym,
    filial,
    nome_filial,
    marca,
    tipo_receita,
    SUM(amount) AS receita_bruta
  FROM (
    -- transactions (contábil) — exclui override ativo
    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN ('Integral','Material Didático','Receita De Mensalidade','Receitas Extras','Receitas Não Operacionais')
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND t.marca IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
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

    -- transactions_manual — sempre incluso
    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions_manual t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN ('Integral','Material Didático','Receita De Mensalidade','Receitas Extras','Receitas Não Operacionais')
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND t.marca IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
  ) base
  WHERE tipo_receita IS NOT NULL
  GROUP BY ym, filial, nome_filial, marca, tipo_receita
  HAVING SUM(amount) <> 0;

  -- ====== TEMP TABLE: cálculo dos tributos ======
  CREATE TEMP TABLE _trib_calculo ON COMMIT DROP AS
  SELECT
    r.ym,
    r.filial,
    r.nome_filial,
    r.marca,
    r.tipo_receita,
    r.receita_bruta,
    tc.pis_cofins                                              AS pis_cofins_pct,
    ROUND(r.receita_bruta * tc.pis_cofins / 100 * -1, 2)      AS pis_cofins_val,
    tc.iss                                                     AS iss_pct,
    ROUND(r.receita_bruta * tc.iss / 100 * -1, 2)             AS iss_val,
    tc.paa                                                     AS paa_pct,
    ROUND(r.receita_bruta * tc.paa / 100, 2)                  AS paa_val,
    ROUND(r.receita_bruta * (tc.pis_cofins + tc.iss) / 100 * -1, 2)
      + ROUND(r.receita_bruta * tc.paa / 100, 2)              AS total_tributos
  FROM _trib_receita r
  INNER JOIN tributos_config tc
    ON tc.marca         = r.marca
   AND tc.filial        = r.nome_filial
   AND tc.tipo_receita  = r.tipo_receita;

  -- ====== UPSERT no log de auditoria ======
  INSERT INTO tributos_log
    (year_month, calculated_at, filial, nome_filial, marca, tipo_receita,
     receita_bruta, pis_cofins_pct, pis_cofins_val, iss_pct, iss_val,
     paa_pct, paa_val, total_tributos)
  SELECT
    c.ym, v_ts, c.filial, c.nome_filial, c.marca, c.tipo_receita,
    c.receita_bruta, c.pis_cofins_pct, c.pis_cofins_val,
    c.iss_pct, c.iss_val, c.paa_pct, c.paa_val, c.total_tributos
  FROM _trib_calculo c
  ON CONFLICT (year_month, marca, filial, tipo_receita) DO UPDATE SET
    calculated_at  = v_ts,
    nome_filial    = EXCLUDED.nome_filial,
    receita_bruta  = EXCLUDED.receita_bruta,
    pis_cofins_pct = EXCLUDED.pis_cofins_pct,
    pis_cofins_val = EXCLUDED.pis_cofins_val,
    iss_pct        = EXCLUDED.iss_pct,
    iss_val        = EXCLUDED.iss_val,
    paa_pct        = EXCLUDED.paa_pct,
    paa_val        = EXCLUDED.paa_val,
    total_tributos = EXCLUDED.total_tributos;

  -- ====== DELETE + INSERT em transactions_manual ======
  DELETE FROM transactions_manual WHERE chave_id LIKE 'TRIB_%';

  -- PIS/COFINS (chave_id inclui marca)
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_PISCOFINS_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_'),
    (c.ym || '-01'),
    'PIS/COFINS s/ ' || c.tipo_receita,
    'Tributos', '3.1.3.01.01.03',
    c.pis_cofins_val, v_tag0_out, 'Real', 'Calculado',
    c.filial, c.nome_filial, c.marca,
    v_tag0_out, NULL, NULL, NULL,
    v_vendor, 'Sim',
    'TRIB_PISCOFINS_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_')
  FROM _trib_calculo c
  WHERE c.pis_cofins_val <> 0;

  -- ISS
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_ISS_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_'),
    (c.ym || '-01'),
    'ISS s/ ' || c.tipo_receita,
    'Tributos', '3.1.3.01.01.01',
    c.iss_val, v_tag0_out, 'Real', 'Calculado',
    c.filial, c.nome_filial, c.marca,
    v_tag0_out, NULL, NULL, NULL,
    v_vendor, 'Sim',
    'TRIB_ISS_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_')
  FROM _trib_calculo c
  WHERE c.iss_val <> 0;

  -- PAA
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_PAA_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_'),
    (c.ym || '-01'),
    'PAA s/ ' || c.tipo_receita,
    'Tributos', '3.1.3.01.01.50',
    c.paa_val, v_tag0_out, 'Real', 'Calculado',
    c.filial, c.nome_filial, c.marca,
    v_tag0_out, NULL, NULL, NULL,
    v_vendor, 'Sim',
    'TRIB_PAA_' || c.marca || '_' || c.ym || '_' || c.filial || '_' || REPLACE(c.tipo_receita, ' ', '_')
  FROM _trib_calculo c
  WHERE c.paa_val <> 0;

  -- Refresh materialized view
  PERFORM refresh_dre_agg();

  -- Retorno: resumo por mês
  RETURN QUERY
  SELECT c.ym, COUNT(*)::BIGINT, SUM(c.total_tributos)
  FROM _trib_calculo c
  GROUP BY c.ym
  ORDER BY c.ym;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 2b — Função de pendências (receita sem config de tributos)
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_tributos_pendentes();

CREATE OR REPLACE FUNCTION get_tributos_pendentes()
RETURNS TABLE (
  o_marca        TEXT,
  o_filial       TEXT,
  o_tipo_receita TEXT,
  o_meses        BIGINT,
  o_receita_total NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SET LOCAL row_security = off;

  RETURN QUERY
  WITH receita_base AS (
    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN ('Integral','Material Didático','Receita De Mensalidade','Receitas Extras','Receitas Não Operacionais')
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND t.marca IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
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

    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions_manual t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN ('Integral','Material Didático','Receita De Mensalidade','Receitas Extras','Receitas Não Operacionais')
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND t.marca IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
  ),
  receita_agg AS (
    SELECT
      nome_filial,
      marca,
      tipo_receita,
      COUNT(DISTINCT ym)  AS meses,
      SUM(amount)         AS receita_total
    FROM receita_base
    WHERE tipo_receita IS NOT NULL
    GROUP BY filial, nome_filial, marca, tipo_receita
    HAVING SUM(amount) <> 0
  )
  SELECT
    ra.marca,
    ra.nome_filial,
    ra.tipo_receita,
    ra.meses,
    ra.receita_total
  FROM receita_agg ra
  WHERE NOT EXISTS (
    SELECT 1 FROM tributos_config tc
    WHERE tc.marca = ra.marca
      AND tc.filial = ra.nome_filial
      AND tc.tipo_receita = ra.tipo_receita
  )
  ORDER BY ra.marca, ra.nome_filial, ra.tipo_receita;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 3 — Agendar pg_cron (a cada 15 minutos)
-- ══════════════════════════════════════════════════════════════════════

SELECT cron.unschedule('calcular-tributos')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calcular-tributos');

SELECT cron.schedule(
  'calcular-tributos',
  '*/15 * * * *',
  'SELECT calcular_tributos()'
);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 4 — Executar primeira vez e conferir
-- ══════════════════════════════════════════════════════════════════════

SELECT * FROM calcular_tributos();

-- Conferir log
SELECT
  year_month                                  AS mes,
  marca,
  filial,
  nome_filial,
  tipo_receita,
  TO_CHAR(receita_bruta, 'FM999,999,990.00')  AS receita,
  TO_CHAR(pis_cofins_pct, 'FM990.0000') || '%' AS "PIS/COFINS %",
  TO_CHAR(pis_cofins_val, 'FM999,999,990.00')  AS "PIS/COFINS R$",
  TO_CHAR(iss_pct, 'FM990.0000') || '%'        AS "ISS %",
  TO_CHAR(iss_val, 'FM999,999,990.00')         AS "ISS R$",
  TO_CHAR(paa_pct, 'FM990.0000') || '%'        AS "PAA %",
  TO_CHAR(paa_val, 'FM999,999,990.00')         AS "PAA R$",
  TO_CHAR(total_tributos, 'FM999,999,990.00')  AS "Total Tributos"
FROM tributos_log
ORDER BY year_month, marca, filial, tipo_receita;

-- Conferir transactions_manual inseridas
SELECT
  LEFT(date::text, 7) AS mes,
  marca,
  filial,
  description,
  TO_CHAR(amount, 'FM999,999,990.00') AS valor,
  conta_contabil,
  tag0, tag01, tag02, tag03,
  chave_id
FROM transactions_manual
WHERE chave_id LIKE 'TRIB_%'
ORDER BY date, marca, filial, chave_id;

-- Conferir job pg_cron ativo
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'calcular-tributos';
