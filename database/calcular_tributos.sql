-- ══════════════════════════════════════════════════════════════════════
-- calcular_tributos.sql
-- Cálculo automático de tributos (PIS/COFINS, ISS, PAA) sobre receita
--
-- Lógica:
--   1. Soma receita por filial/mês/tipo_receita (tag01) de tag0='01. RECEITA LIQUIDA'
--      Empilha transactions + transactions_manual, respeitando override_contabil
--   2. Cruza com tributos_config (alíquotas por marca+filial+tipo_receita)
--   3. Calcula: receita × alíquota / 100 × -1 (dedução = negativo)
--   4. Gera 3 lançamentos por combinação: PIS/COFINS, ISS, PAA
--   5. UPSERT em tributos_log + DELETE/INSERT em transactions_manual
--   6. Refresh dre_agg
--   7. pg_cron a cada 15 minutos
--
-- Destino: transactions_manual (dado gerencial, não contábil)
--   conta_contabil = definida no tributos_config ou default
--   tag0/tag01/tag02/tag03 = populados automaticamente pelos triggers da tabela
--   vendor         = 'Planejamento Financeiro'
--   chave_id       = 'TRIB_{TIPO}_YYYY-MM_FILIAL_TIPORECEITA' (idempotente)
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1 — Tabela de log (auditoria)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tributos_log (
  id              BIGSERIAL     PRIMARY KEY,
  calculated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  year_month      TEXT          NOT NULL,
  filial          TEXT          NOT NULL,
  nome_filial     TEXT,
  marca           TEXT,
  tipo_receita    TEXT          NOT NULL,
  receita_bruta   NUMERIC       NOT NULL,
  pis_cofins_pct  NUMERIC(8,4)  NOT NULL DEFAULT 0,
  pis_cofins_val  NUMERIC       NOT NULL DEFAULT 0,
  iss_pct         NUMERIC(8,4)  NOT NULL DEFAULT 0,
  iss_val         NUMERIC       NOT NULL DEFAULT 0,
  paa_pct         NUMERIC(8,4)  NOT NULL DEFAULT 0,
  paa_val         NUMERIC       NOT NULL DEFAULT 0,
  total_tributos  NUMERIC       NOT NULL DEFAULT 0,
  CONSTRAINT tributos_log_unico UNIQUE (year_month, filial, tipo_receita)
);

CREATE INDEX IF NOT EXISTS idx_tributos_log_yearmonth ON tributos_log (year_month);
CREATE INDEX IF NOT EXISTS idx_tributos_log_filial    ON tributos_log (filial);

ALTER TABLE tributos_log DISABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1b — Garantir UNIQUE no chave_id de transactions_manual
-- (necessário para ON CONFLICT funcionar)
-- ══════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_chave_id_unique
  ON transactions_manual (chave_id)
  WHERE chave_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 2 — Função principal
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

  WITH
  -- 1. Receita bruta por filial/mês/tag01 (tipo_receita)
  --    Tag0 = '01. RECEITA LIQUIDA'
  --    Tag01 IN (Integral, Material Didático, Receita De Mensalidade, Receitas Extras, Receitas Não Operacionais)
  --    Empilha transactions + transactions_manual, respeitando override_contabil
  receita_base AS (
    -- 1a. transactions (contábil) — exclui linhas com override ativo
    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN (
        'Integral',
        'Material Didático',
        'Receita De Mensalidade',
        'Receitas Extras',
        'Receitas Não Operacionais'
      )
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
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

    -- 1b. transactions_manual — sempre incluso (exclui tributos calculados anteriormente)
    SELECT
      LEFT(t.date::text, 7)  AS ym,
      t.filial,
      t.nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions_manual t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN (
        'Integral',
        'Material Didático',
        'Receita De Mensalidade',
        'Receitas Extras',
        'Receitas Não Operacionais'
      )
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
  ),

  -- 2. Agregar por filial/mês/tipo_receita
  receita_agg AS (
    SELECT
      ym,
      filial,
      COALESCE(MAX(nome_filial), MAX(filial))  AS nome_filial,
      MAX(marca)                               AS marca,
      tipo_receita,
      SUM(amount)                              AS receita_bruta
    FROM receita_base
    WHERE tipo_receita IS NOT NULL
    GROUP BY ym, filial, tipo_receita
    HAVING SUM(amount) <> 0
  ),

  -- 3. Cruzar com tributos_config (alíquotas por marca+filial+tipo_receita)
  calculo AS (
    SELECT
      ra.ym,
      ra.filial,
      ra.nome_filial,
      ra.marca,
      ra.tipo_receita,
      ra.receita_bruta,
      tc.pis_cofins                                              AS pis_cofins_pct,
      ROUND(ra.receita_bruta * tc.pis_cofins / 100 * -1, 2)     AS pis_cofins_val,
      tc.iss                                                     AS iss_pct,
      ROUND(ra.receita_bruta * tc.iss / 100 * -1, 2)            AS iss_val,
      tc.paa                                                     AS paa_pct,
      ROUND(ra.receita_bruta * tc.paa / 100, 2)                 AS paa_val,       -- PAA positivo
      ROUND(ra.receita_bruta * (tc.pis_cofins + tc.iss) / 100 * -1, 2)
        + ROUND(ra.receita_bruta * tc.paa / 100, 2)             AS total_tributos
    FROM receita_agg ra
    INNER JOIN tributos_config tc
      ON tc.marca = ra.marca
     AND tc.filial = ra.nome_filial
     AND tc.tipo_receita = ra.tipo_receita
  )

  -- 4. UPSERT no log de auditoria
  INSERT INTO tributos_log
    (year_month, calculated_at, filial, nome_filial, marca, tipo_receita,
     receita_bruta, pis_cofins_pct, pis_cofins_val, iss_pct, iss_val,
     paa_pct, paa_val, total_tributos)
  SELECT
    c.ym, v_ts, c.filial, c.nome_filial, c.marca, c.tipo_receita,
    c.receita_bruta, c.pis_cofins_pct, c.pis_cofins_val,
    c.iss_pct, c.iss_val, c.paa_pct, c.paa_val, c.total_tributos
  FROM calculo c
  ON CONFLICT (year_month, filial, tipo_receita) DO UPDATE SET
    calculated_at  = v_ts,
    nome_filial    = EXCLUDED.nome_filial,
    marca          = EXCLUDED.marca,
    receita_bruta  = EXCLUDED.receita_bruta,
    pis_cofins_pct = EXCLUDED.pis_cofins_pct,
    pis_cofins_val = EXCLUDED.pis_cofins_val,
    iss_pct        = EXCLUDED.iss_pct,
    iss_val        = EXCLUDED.iss_val,
    paa_pct        = EXCLUDED.paa_pct,
    paa_val        = EXCLUDED.paa_val,
    total_tributos = EXCLUDED.total_tributos;

  -- 5. UPSERT em transactions_manual — PIS/COFINS (só se valor <> 0)
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_PISCOFINS_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_'),
    (l.year_month || '-01'),
    'PIS/COFINS s/ ' || l.tipo_receita,
    'Tributos',
    '3.1.3.01.01.03',
    l.pis_cofins_val,
    v_tag0_out,
    'Real',
    'Calculado',
    l.filial,
    l.nome_filial,
    l.marca,
    v_tag0_out,
    NULL,  -- tag01: será populado pelo trigger fn_auto_populate_tags_from_conta
    NULL,  -- tag02: idem
    NULL,  -- tag03: idem
    v_vendor,
    'Sim',
    'TRIB_PISCOFINS_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_')
  FROM tributos_log l
  WHERE l.calculated_at = v_ts
    AND l.pis_cofins_val <> 0
  ON CONFLICT (chave_id) WHERE chave_id IS NOT NULL DO UPDATE SET
    amount         = EXCLUDED.amount,
    conta_contabil = EXCLUDED.conta_contabil,
    description    = EXCLUDED.description,
    nome_filial    = EXCLUDED.nome_filial,
    marca          = EXCLUDED.marca,
    updated_at     = NOW();

  -- 6. UPSERT em transactions_manual — ISS (só se valor <> 0)
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_ISS_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_'),
    (l.year_month || '-01'),
    'ISS s/ ' || l.tipo_receita,
    'Tributos',
    '3.1.3.01.01.01',
    l.iss_val,
    v_tag0_out,
    'Real',
    'Calculado',
    l.filial,
    l.nome_filial,
    l.marca,
    v_tag0_out,
    NULL,
    NULL,
    NULL,
    v_vendor,
    'Sim',
    'TRIB_ISS_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_')
  FROM tributos_log l
  WHERE l.calculated_at = v_ts
    AND l.iss_val <> 0
  ON CONFLICT (chave_id) WHERE chave_id IS NOT NULL DO UPDATE SET
    amount         = EXCLUDED.amount,
    conta_contabil = EXCLUDED.conta_contabil,
    description    = EXCLUDED.description,
    nome_filial    = EXCLUDED.nome_filial,
    marca          = EXCLUDED.marca,
    updated_at     = NOW();

  -- 7. UPSERT em transactions_manual — PAA (só se valor <> 0)
  INSERT INTO transactions_manual (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, nome_filial, marca,
    tag0, tag01, tag02, tag03,
    vendor, recurring, chave_id
  )
  SELECT
    'TRIB_PAA_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_'),
    (l.year_month || '-01'),
    'PAA s/ ' || l.tipo_receita,
    'Tributos',
    '3.1.3.01.01.50',
    l.paa_val,
    v_tag0_out,
    'Real',
    'Calculado',
    l.filial,
    l.nome_filial,
    l.marca,
    v_tag0_out,
    NULL,
    NULL,
    NULL,
    v_vendor,
    'Sim',
    'TRIB_PAA_' || l.year_month || '_' || l.filial || '_' || REPLACE(l.tipo_receita, ' ', '_')
  FROM tributos_log l
  WHERE l.calculated_at = v_ts
    AND l.paa_val <> 0
  ON CONFLICT (chave_id) WHERE chave_id IS NOT NULL DO UPDATE SET
    amount         = EXCLUDED.amount,
    conta_contabil = EXCLUDED.conta_contabil,
    description    = EXCLUDED.description,
    nome_filial    = EXCLUDED.nome_filial,
    marca          = EXCLUDED.marca,
    updated_at     = NOW();

  -- 8. Refresh materialized view
  PERFORM refresh_dre_agg();

  -- 9. Retorno: resumo por mês
  RETURN QUERY
  SELECT
    l.year_month,
    COUNT(*)::BIGINT,
    SUM(l.total_tributos)
  FROM tributos_log l
  WHERE l.calculated_at = v_ts
  GROUP BY l.year_month
  ORDER BY l.year_month;
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
      COALESCE(t.nome_filial, t.filial) AS nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN (
        'Integral',
        'Material Didático',
        'Receita De Mensalidade',
        'Receitas Extras',
        'Receitas Não Operacionais'
      )
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
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
      COALESCE(t.nome_filial, t.filial) AS nome_filial,
      t.marca,
      t.tag01                AS tipo_receita,
      t.amount
    FROM transactions_manual t
    WHERE t.tag0 = '01. RECEITA LIQUIDA'
      AND t.tag01 IN (
        'Integral',
        'Material Didático',
        'Receita De Mensalidade',
        'Receitas Extras',
        'Receitas Não Operacionais'
      )
      AND COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND COALESCE(t.recurring, 'Sim') = 'Sim'
      AND t.filial IS NOT NULL
      AND COALESCE(t.chave_id, '') NOT LIKE 'TRIB_%'
  ),
  receita_agg AS (
    SELECT
      COALESCE(MAX(nome_filial), MAX(filial)) AS nome_filial,
      MAX(marca)                              AS marca,
      tipo_receita,
      COUNT(DISTINCT ym)                      AS meses,
      SUM(amount)                             AS receita_total
    FROM receita_base
    WHERE tipo_receita IS NOT NULL
    GROUP BY filial, tipo_receita
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

-- Remover job anterior se existir (caso já tenha rodado versão antiga)
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

-- Executar o cálculo
SELECT * FROM calcular_tributos();

-- Conferir log
SELECT
  year_month                                  AS mes,
  filial,
  nome_filial,
  marca,
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
  filial,
  marca,
  description,
  TO_CHAR(amount, 'FM999,999,990.00') AS valor,
  conta_contabil,
  tag0, tag01, tag02, tag03,
  chave_id
FROM transactions_manual
WHERE chave_id LIKE 'TRIB_%'
ORDER BY date, filial, chave_id;

-- Conferir job pg_cron ativo
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'calcular-tributos';
