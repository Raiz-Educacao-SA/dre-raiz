-- =============================================================================
-- RATEIO_RAIZ_REAL_AUTOMATICO.sql
-- Rateio ADM automático para o cenário Real
--
-- Lógica:
--   1. Calcula o EBITDA da marca 'RZ' por mês (tag0: 01+02+03+04)
--   2. Calcula a Receita Bruta de cada marca por mês
--      (tag0 = '01.%', excluindo tag01 = 'Tributos' e 'Devoluções & Cancelamentos')
--   3. Calcula o share % de cada marca sobre a receita bruta total
--   4. Aplica: valor_rateado = ebitda_rz × share_%
--   5. Grava log de auditoria em rateio_raiz_log
--   6. Faz UPSERT em transactions (chave determinística por marca/mês)
--   7. Chama refresh_dre_agg() — dre_agg atualizado automaticamente
--
-- Agendamento: pg_cron a cada 15 minutos
-- Execute os passos em sequência no Supabase SQL Editor
-- =============================================================================


-- =============================================================================
-- PASSO 1 — Tabela de auditoria e validação: rateio_raiz_log
-- =============================================================================

CREATE TABLE IF NOT EXISTS rateio_raiz_log (
  id              BIGSERIAL PRIMARY KEY,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  year_month      TEXT        NOT NULL,          -- 'YYYY-MM'
  rz_ebitda       NUMERIC     NOT NULL,          -- EBITDA total da RZ no mês
  marca           TEXT        NOT NULL,          -- Marca beneficiada
  receita_bruta   NUMERIC     NOT NULL,          -- Receita bruta da marca (sem tributos)
  receita_total   NUMERIC     NOT NULL,          -- Receita bruta total de todas as marcas
  share_pct       NUMERIC(12,8) NOT NULL,        -- share_pct = receita_bruta / receita_total
  valor_rateado   NUMERIC     NOT NULL,          -- valor_rateado = rz_ebitda × share_pct

  -- Unicidade por mês+marca: UPSERT sobrescreve a cada recalculo
  CONSTRAINT rateio_raiz_log_unico UNIQUE (year_month, marca)
);

-- Índices para facilitar as queries de validação
CREATE INDEX IF NOT EXISTS idx_rateio_log_yearmonth ON rateio_raiz_log (year_month);
CREATE INDEX IF NOT EXISTS idx_rateio_log_marca     ON rateio_raiz_log (marca);

COMMENT ON TABLE rateio_raiz_log IS
'Auditoria do cálculo de Rateio ADM Real.
Cada linha representa o share de uma marca em um mês.
Atualizado a cada execução de calcular_rateio_raiz_real().';


-- =============================================================================
-- PASSO 2 — Garantir mapeamento tag01 → tag0 no tag0_map
--
-- 'RATEIO ADM' (mesmo tag01 usado no Orçado e A-1) deve mapear para
-- '05. RATEIO RAIZ' assim como nos outros cenários.
-- =============================================================================

INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0)
VALUES ('rateio adm', 'RATEIO ADM', '05. RATEIO RAIZ')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0     = EXCLUDED.tag0,
      tag1_raw = EXCLUDED.tag1_raw;

-- Verificar se o mapeamento foi inserido:
-- SELECT * FROM tag0_map WHERE tag1_norm = 'rateio adm';


-- =============================================================================
-- PASSO 3 — Função principal: calcular_rateio_raiz_real()
-- =============================================================================

CREATE OR REPLACE FUNCTION calcular_rateio_raiz_real()
RETURNS TABLE (
  o_year_month    TEXT,
  o_rz_ebitda     NUMERIC,
  o_marcas_ok     BIGINT,
  o_total_rateado NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ts TIMESTAMPTZ := NOW();
BEGIN

  -- Desabilita RLS para garantir acesso completo às tabelas
  SET LOCAL row_security = off;

  -- -------------------------------------------------------------------
  -- PASSO A — Calcula rateio e faz UPSERT em rateio_raiz_log
  -- CTEs inline: elimina a dependência de tabela temporária
  -- -------------------------------------------------------------------
  WITH
  rz_ebitda AS (
    SELECT
      to_char(t.date::date, 'YYYY-MM') AS ym,
      SUM(t.amount)                    AS ebitda_rz
    FROM transactions t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.marca = 'RZ'
      AND (tm.tag0 LIKE '02.%' OR tm.tag0 LIKE '03.%' OR tm.tag0 LIKE '04.%')
    GROUP BY 1
  ),
  receita_por_marca AS (
    SELECT
      to_char(t.date::date, 'YYYY-MM') AS ym,
      t.marca,
      SUM(t.amount)                    AS receita_bruta
    FROM transactions t
    LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
    WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
      AND t.marca IS NOT NULL
      AND t.marca <> 'RZ'
      AND tm.tag0 LIKE '01.%'
      AND LOWER(TRIM(t.tag01)) NOT IN (
            'tributos',
            'devolu' || chr(231) || chr(245) || 'es & cancelamentos',
            'devolucoes & cancelamentos'
          )
    GROUP BY 1, 2
    HAVING SUM(t.amount) > 0
  ),
  receita_total_mes AS (
    SELECT rpm.ym, SUM(rpm.receita_bruta) AS receita_total
    FROM receita_por_marca rpm
    GROUP BY rpm.ym
  ),
  rateio AS (
    SELECT
      rpm.ym                                                  AS ym,
      rpm.marca                                               AS marca,
      rz.ebitda_rz                                            AS ebitda_rz,
      rpm.receita_bruta                                       AS receita_bruta,
      rtm.receita_total                                       AS receita_total,
      rpm.receita_bruta / rtm.receita_total                   AS share_pct,
      rz.ebitda_rz * (rpm.receita_bruta / rtm.receita_total)  AS valor_rateado
    FROM receita_por_marca  rpm
    JOIN receita_total_mes  rtm ON rtm.ym = rpm.ym
    JOIN rz_ebitda          rz  ON rz.ym  = rpm.ym
  )
  INSERT INTO rateio_raiz_log
    (year_month, calculated_at, rz_ebitda,
     marca, receita_bruta, receita_total, share_pct, valor_rateado)
  SELECT
    r.ym, v_ts, r.ebitda_rz,
    r.marca, r.receita_bruta, r.receita_total, r.share_pct, r.valor_rateado
  FROM rateio r
  ON CONFLICT (year_month, marca) DO UPDATE SET
    calculated_at = v_ts,
    rz_ebitda     = EXCLUDED.rz_ebitda,
    receita_bruta = EXCLUDED.receita_bruta,
    receita_total = EXCLUDED.receita_total,
    share_pct     = EXCLUDED.share_pct,
    valor_rateado = EXCLUDED.valor_rateado;

  -- -------------------------------------------------------------------
  -- PASSO B — UPSERT em transactions a partir do rateio_raiz_log
  -- Usa o v_ts para selecionar apenas os registros desta execução
  -- Elimina duplicação das CTEs e evita temp table
  -- -------------------------------------------------------------------
  INSERT INTO transactions (
    id, date, description, category, conta_contabil,
    amount, type, scenario, status,
    filial, marca, tag01, tag02, tag03,
    vendor, chave_id, created_at, updated_at
  )
  SELECT
    gen_random_uuid()::TEXT,
    (l.year_month || '-01')::date::TEXT,
    'Rateio ADM ' || l.year_month        AS description,
    'RATEIO ADM'                          AS category,
    'Rateio ADM'                          AS conta_contabil,
    l.valor_rateado                       AS amount,
    'RATEIO'                              AS type,
    'Real'                                AS scenario,
    'Rateado'                             AS status,
    'CORP'                                AS filial,  -- ⚠️ Ajuste se necessário
    l.marca,
    'RATEIO ADM'                          AS tag01,
    NULL                                  AS tag02,
    NULL                                  AS tag03,
    'RZ Educação — CSC'                   AS vendor,
    'RATEIO_RAIZ_REAL_' || l.year_month || '_' || l.marca AS chave_id,
    v_ts, v_ts
  FROM rateio_raiz_log l
  WHERE l.calculated_at = v_ts
  ON CONFLICT (chave_id) DO UPDATE SET
    amount     = EXCLUDED.amount,
    updated_at = v_ts;

  -- -------------------------------------------------------------------
  -- PASSO C — Atualiza dre_agg
  -- -------------------------------------------------------------------
  PERFORM refresh_dre_agg();

  -- -------------------------------------------------------------------
  -- Retorna resumo usando v_ts (timestamp exato desta execução)
  -- Sem dependência de janela de tempo — garante resultado correto
  -- -------------------------------------------------------------------
  RETURN QUERY
    SELECT
      l.year_month    AS o_year_month,
      l.rz_ebitda     AS o_rz_ebitda,
      COUNT(*)::BIGINT AS o_marcas_ok,
      SUM(l.valor_rateado) AS o_total_rateado
    FROM rateio_raiz_log l
    WHERE l.calculated_at = v_ts
    GROUP BY 1, 2
    ORDER BY 1;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro em calcular_rateio_raiz_real(): %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION calcular_rateio_raiz_real() TO authenticated;

COMMENT ON FUNCTION calcular_rateio_raiz_real IS
'Calcula e insere o Rateio ADM para o cenário Real.
Distribui o EBITDA da marca RZ proporcionalmente à Receita Bruta
(sem Tributos e sem Devoluções) de cada marca no mesmo mês.
Grava log de auditoria em rateio_raiz_log.
Chama refresh_dre_agg() ao final.';


-- =============================================================================
-- PASSO 4 — Agendar via pg_cron (a cada 15 minutos)
--
-- PRÉ-REQUISITO: pg_cron habilitado em
-- Supabase Dashboard → Database → Extensions → pg_cron
-- =============================================================================

-- Agendar
SELECT cron.schedule(
  'rateio-raiz-real',            -- nome do job
  '*/15 * * * *',                -- a cada 15 minutos
  $$SELECT calcular_rateio_raiz_real()$$
);

-- Verificar se foi agendado:
-- SELECT jobid, jobname, schedule, command, active FROM cron.job;

-- Cancelar (se precisar):
-- SELECT cron.unschedule('rateio-raiz-real');


-- =============================================================================
-- PASSO 5 — Teste manual e validação
-- Execute após rodar os passos 1-3
-- =============================================================================

-- 5.1 Executar manualmente (primeira vez / teste)
-- SELECT * FROM calcular_rateio_raiz_real();


-- 5.2 Tabela de validação: ver cálculo detalhado por mês
-- Substitua '2026-02' pelo mês desejado
/*
SELECT
  year_month,
  TO_CHAR(rz_ebitda,    'FM999,999,990.00')          AS ebitda_rz,
  marca,
  TO_CHAR(receita_bruta, 'FM999,999,990.00')          AS receita_bruta_marca,
  TO_CHAR(receita_total, 'FM999,999,990.00')          AS receita_total_geral,
  TO_CHAR(share_pct * 100, 'FM990.0000') || '%'       AS share,
  TO_CHAR(valor_rateado, 'FM999,999,990.00')          AS valor_rateado,
  TO_CHAR(calculated_at, 'DD/MM/YYYY HH24:MI')        AS calculado_em
FROM rateio_raiz_log
WHERE year_month = '2026-02'
ORDER BY share_pct DESC;
*/


-- 5.3 Verificar soma dos shares (deve ser ~100% por mês)
/*
SELECT
  year_month,
  TO_CHAR(rz_ebitda, 'FM999,999,990.00')     AS ebitda_rz,
  COUNT(*)                                    AS qtd_marcas,
  TO_CHAR(SUM(share_pct) * 100, 'FM990.0000') || '%' AS soma_shares,
  TO_CHAR(SUM(valor_rateado), 'FM999,999,990.00')    AS total_rateado
FROM rateio_raiz_log
GROUP BY year_month, rz_ebitda
ORDER BY year_month;
*/


-- 5.4 Verificar se os registros entraram em transactions
/*
SELECT
  year_month     = to_char(date::date, 'YYYY-MM') AS year_month,
  marca,
  tag01,
  amount,
  status,
  chave_id,
  updated_at
FROM transactions
WHERE chave_id LIKE 'RATEIO_RAIZ_REAL_%'
ORDER BY date DESC, marca;
*/


-- 5.5 Verificar se aparece na dre_agg (após refresh)
/*
SELECT
  year_month,
  scenario,
  tag0,
  marca,
  SUM(total_amount) AS total
FROM dre_agg
WHERE tag0 = '05. RATEIO RAIZ'
  AND scenario = 'Real'
  AND year_month BETWEEN '2026-01' AND '2026-12'
GROUP BY year_month, scenario, tag0, marca
ORDER BY year_month, marca;
*/


-- 5.6 Conferência cruzada: rateio_raiz_log vs dre_agg (devem bater)
/*
SELECT
  l.year_month,
  l.marca,
  TO_CHAR(l.valor_rateado, 'FM999,999,990.00') AS log_valor,
  TO_CHAR(a.total,         'FM999,999,990.00') AS dre_agg_valor,
  CASE
    WHEN ABS(l.valor_rateado - COALESCE(a.total,0)) < 0.01
    THEN '✅ OK'
    ELSE '❌ DIVERGÊNCIA'
  END AS status
FROM rateio_raiz_log l
LEFT JOIN (
  SELECT year_month, marca, SUM(total_amount) AS total
  FROM dre_agg
  WHERE tag0 = '05. RATEIO RAIZ' AND scenario = 'Real'
  GROUP BY year_month, marca
) a ON a.year_month = l.year_month AND a.marca = l.marca
WHERE l.year_month BETWEEN '2026-01' AND '2026-12'
ORDER BY l.year_month, l.marca;
*/
