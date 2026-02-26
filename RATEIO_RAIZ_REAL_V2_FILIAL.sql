-- ══════════════════════════════════════════════════════════════════════
-- RATEIO_RAIZ_REAL_V2_FILIAL.sql
-- Rateio ADM automático para o cenário Real — distribuição por FILIAL
--
-- Lógica:
--   1. EBITDA da marca 'RZ' por mês (tag0: 02.% + 03.% + 04.%)
--   2. Receita Bruta de cada FILIAL por mês (tag0 = '01.%')
--      excluindo Tributos e Devoluções & Cancelamentos
--   3. share_filial = receita_filial / receita_total_mes
--   4. valor_rateado = ebitda_rz × share_filial
--   5. UPSERT em rateio_raiz_log (chave: year_month + filial)
--   6. UPSERT em transactions (chave: RATEIO_RAIZ_REAL_YYYY-MM_FILIAL, tag0='05. RATEIO RAIZ')
--
-- Pré-requisitos:
--   - Coluna tag0 populada em transactions via trigger trg_auto_tag0
--   - tag0_map populado com mapeamentos tag01 → tag0
--   - Índice único em transactions.chave_id
--
-- Agendamento: pg_cron a cada 15 minutos (Passo 5)
-- Versão: 2.1 — 28/02/2026
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 1 — Triggers: auto-populate tag0 via tag0_map nas 3 tabelas
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE transactions              ADD COLUMN IF NOT EXISTS tag0 TEXT;
ALTER TABLE transactions_orcado       ADD COLUMN IF NOT EXISTS tag0 TEXT;
ALTER TABLE transactions_ano_anterior ADD COLUMN IF NOT EXISTS tag0 TEXT;

-- Função: popula tag0 ao inserir/atualizar tag01
CREATE OR REPLACE FUNCTION fn_auto_populate_tag0()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tag0 := (
    SELECT tm.tag0
    FROM tag0_map tm
    WHERE LOWER(TRIM(tm.tag1_norm)) = LOWER(TRIM(NEW.tag01))
    LIMIT 1
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tag0 ON transactions;
CREATE TRIGGER trg_auto_tag0
  BEFORE INSERT OR UPDATE OF tag01 ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tag0();

DROP TRIGGER IF EXISTS trg_auto_tag0_orcado ON transactions_orcado;
CREATE TRIGGER trg_auto_tag0_orcado
  BEFORE INSERT OR UPDATE OF tag01 ON transactions_orcado
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tag0();

DROP TRIGGER IF EXISTS trg_auto_tag0_ano_anterior ON transactions_ano_anterior;
CREATE TRIGGER trg_auto_tag0_ano_anterior
  BEFORE INSERT OR UPDATE OF tag01 ON transactions_ano_anterior
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tag0();

-- Função: propaga mudanças no tag0_map para transações existentes
CREATE OR REPLACE FUNCTION fn_propagate_tag0_map_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE transactions              SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_orcado       SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_ano_anterior SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_tag0_map ON tag0_map;
CREATE TRIGGER trg_propagate_tag0_map
  AFTER INSERT OR UPDATE OF tag0, tag1_norm ON tag0_map
  FOR EACH ROW EXECUTE FUNCTION fn_propagate_tag0_map_change();

-- Backfill das 3 tabelas (popula tag0 em todos os registros existentes)
UPDATE transactions t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS DISTINCT FROM tm.tag0);

UPDATE transactions_orcado t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS DISTINCT FROM tm.tag0);

UPDATE transactions_ano_anterior t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS DISTINCT FROM tm.tag0);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 2 — Tabela de log
-- ══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS rateio_raiz_log;

CREATE TABLE rateio_raiz_log (
  id            BIGSERIAL     PRIMARY KEY,
  calculated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  year_month    TEXT          NOT NULL,
  rz_ebitda     NUMERIC       NOT NULL,
  filial        TEXT          NOT NULL,
  nome_filial   TEXT,
  marca         TEXT,
  receita_bruta NUMERIC       NOT NULL,
  receita_total NUMERIC       NOT NULL,
  share_pct     NUMERIC(12,8) NOT NULL,
  valor_rateado NUMERIC       NOT NULL,
  CONSTRAINT rateio_raiz_log_unico UNIQUE (year_month, filial)
);

CREATE INDEX IF NOT EXISTS idx_rateio_log_yearmonth ON rateio_raiz_log (year_month);
CREATE INDEX IF NOT EXISTS idx_rateio_log_filial    ON rateio_raiz_log (filial);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 3 — Garantir mapeamento 'RATEIO ADM' → '06. RATEIO RAIZ'
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
VALUES ('rateio adm', 'RATEIO ADM', '05. RATEIO RAIZ')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 4 — Função principal
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

  WITH
  -- 1. EBITDA da RZ por mês (custos da holding: 02, 03, 04)
  rz_ebitda AS (
    SELECT
      LEFT(date::text, 7) AS ym,
      SUM(amount)         AS ebitda_rz
    FROM transactions
    WHERE COALESCE(scenario, 'Real') IN ('Real', 'Original')
      AND marca = 'RZ'
      AND (tag0 LIKE '02.%' OR tag0 LIKE '03.%' OR tag0 LIKE '04.%')
    GROUP BY 1
  ),
  -- 2. Receita bruta por filial por mês
  --    Agrupa por (ym, filial) sem marca para evitar duplicatas no ON CONFLICT
  receita_por_filial AS (
    SELECT
      LEFT(date::text, 7)                           AS ym,
      filial,
      COALESCE(MAX(nome_filial), MAX(filial))        AS nome_filial,
      MAX(CASE WHEN marca <> 'RZ' THEN marca END)   AS marca,
      SUM(amount)                                   AS receita_bruta
    FROM transactions
    WHERE COALESCE(scenario, 'Real') IN ('Real', 'Original')
      AND filial IS NOT NULL
      AND (marca IS NULL OR marca <> 'RZ')
      AND tag0 LIKE '01.%'
      AND LOWER(TRIM(tag01)) NOT IN (
            'tributos',
            'devolu' || chr(231) || chr(245) || 'es & cancelamentos',
            'devolucoes & cancelamentos'
          )
    GROUP BY 1, 2
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
    JOIN rz_ebitda          rz  ON rz.ym  = rpf.ym
  )
  -- 5. UPSERT no log de auditoria
  INSERT INTO rateio_raiz_log
    (year_month, calculated_at, rz_ebitda,
     filial, nome_filial, marca,
     receita_bruta, receita_total, share_pct, valor_rateado)
  SELECT
    r.ym, v_ts, r.ebitda_rz,
    r.filial, r.nome_filial, r.marca,
    r.receita_bruta, r.receita_total, r.share_pct, r.valor_rateado
  FROM rateio r
  ON CONFLICT (year_month, filial) DO UPDATE SET
    calculated_at = v_ts,
    rz_ebitda     = EXCLUDED.rz_ebitda,
    nome_filial   = EXCLUDED.nome_filial,
    marca         = EXCLUDED.marca,
    receita_bruta = EXCLUDED.receita_bruta,
    receita_total = EXCLUDED.receita_total,
    share_pct     = EXCLUDED.share_pct,
    valor_rateado = EXCLUDED.valor_rateado;

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
    '05. RATEIO RAIZ',
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
    nome_filial = EXCLUDED.nome_filial,
    marca       = EXCLUDED.marca,
    updated_at  = NOW();

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


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 5 — Agendar pg_cron (a cada 15 minutos)
-- ══════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'rateio-raiz-real',
  '*/15 * * * *',
  'SELECT calcular_rateio_raiz_real()'
);


-- ══════════════════════════════════════════════════════════════════════
-- PASSO 6 — Executar e conferir
-- ══════════════════════════════════════════════════════════════════════

-- Executar o rateio
SELECT * FROM calcular_rateio_raiz_real();

-- Log: share e valor por filial
SELECT
  year_month,
  filial,
  nome_filial,
  marca,
  TO_CHAR(rz_ebitda,     'FM999,999,990.00') AS rz_ebitda,
  TO_CHAR(receita_bruta, 'FM999,999,990.00') AS receita_filial,
  TO_CHAR(receita_total, 'FM999,999,990.00') AS receita_total,
  TO_CHAR(share_pct * 100, 'FM990.00') || '%' AS share,
  TO_CHAR(valor_rateado, 'FM999,999,990.00') AS valor_rateado
FROM rateio_raiz_log
ORDER BY year_month, valor_rateado DESC;

-- Lançamentos inseridos em transactions
SELECT
  LEFT(date::text, 7)                       AS mes,
  filial,
  nome_filial,
  marca,
  TO_CHAR(amount, 'FM999,999,990.00')       AS valor,
  tag0,
  chave_id
FROM transactions
WHERE tag01 = 'RATEIO ADM'
  AND scenario = 'Real'
ORDER BY date, filial;

-- Job pg_cron ativo?
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'rateio-raiz-real';
