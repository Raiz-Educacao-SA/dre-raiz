-- ============================================
-- create_override_contabil.sql
-- Tabela de regras para substituir dados contábeis (transactions)
-- por dados manuais (transactions_manual) na DRE e Lançamentos.
--
-- EXECUTAR no Supabase SQL Editor (1 vez)
-- ============================================

SET statement_timeout = 0;

-- ══════════════════════════════════
-- PARTE 1: Tabela override_contabil
-- ══════════════════════════════════

CREATE TABLE IF NOT EXISTS override_contabil (
  id         BIGSERIAL PRIMARY KEY,
  tag01      TEXT    NOT NULL,          -- centro de custo a substituir
  marca      TEXT    DEFAULT NULL,      -- NULL = todas as marcas
  filial     TEXT    DEFAULT NULL,      -- NULL = todas as filiais
  mes_de     TEXT    DEFAULT NULL,      -- 'YYYY-MM' início (NULL = sempre)
  mes_ate    TEXT    DEFAULT NULL,      -- 'YYYY-MM' fim (NULL = permanente)
  motivo     TEXT    DEFAULT '',        -- justificativa
  ativo      BOOLEAN DEFAULT true,      -- toggle on/off
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE override_contabil IS 'Regras de substituição: ignora transactions (contábil) e usa transactions_manual para tag01/marca/período especificados.';
COMMENT ON COLUMN override_contabil.tag01 IS 'Centro de custo (tag01) cujo contábil será ignorado';
COMMENT ON COLUMN override_contabil.marca IS 'Marca específica ou NULL para todas';
COMMENT ON COLUMN override_contabil.filial IS 'Filial específica ou NULL para todas';
COMMENT ON COLUMN override_contabil.mes_de IS 'Mês início do override (YYYY-MM) ou NULL = desde sempre';
COMMENT ON COLUMN override_contabil.mes_ate IS 'Mês fim do override (YYYY-MM) ou NULL = permanente';
COMMENT ON COLUMN override_contabil.ativo IS 'Se false, a regra é ignorada (contábil volta a contar)';

-- Índice para consultas rápidas nos RPCs
CREATE INDEX IF NOT EXISTS idx_override_contabil_lookup
  ON override_contabil (tag01, ativo)
  WHERE ativo = true;

-- RLS
ALTER TABLE override_contabil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "override_contabil_select" ON override_contabil
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "override_contabil_insert_admin" ON override_contabil
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "override_contabil_update_admin" ON override_contabil
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "override_contabil_delete_admin" ON override_contabil
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_override_contabil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_override_contabil_updated_at
  BEFORE UPDATE ON override_contabil
  FOR EACH ROW
  EXECUTE FUNCTION update_override_contabil_updated_at();


-- ══════════════════════════════════════════════════════
-- PARTE 2: Recriar dre_agg com filtro override_contabil
-- ══════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS dre_agg;

CREATE MATERIALIZED VIEW dre_agg AS

  -- BLOCO 1: Real (transactions) — EXCLUI linhas com override ativo
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 1b: Real (transactions_manual) — sempre incluso (é a substituição)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Real'                                    AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_manual t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 2: Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char(t.date::date, 'YYYY-MM')          AS year_month,
    'Orçado'                                  AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_orcado t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11

  UNION ALL

  -- BLOCO 3: A-1 (datas +1 ano)
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    t.tag02,
    t.tag03,
    t.conta_contabil,
    t.vendor,
    to_char((t.date::date) + interval '1 year', 'YYYY-MM') AS year_month,
    'A-1'                                     AS scenario,
    t.marca,
    t.nome_filial,
    INITCAP(COALESCE(t.recurring, 'Sim'))     AS recurring,
    SUM(t.amount)                             AS total_amount,
    COUNT(*)                                  AS tx_count
  FROM transactions_ano_anterior t
  GROUP BY 1,2,3,4,5,6,7,8,9,10,11;

-- Índices
CREATE INDEX ON dre_agg (year_month, scenario);
CREATE INDEX ON dre_agg (tag0, scenario);
CREATE INDEX ON dre_agg (tag02, scenario);
CREATE INDEX ON dre_agg (tag03, scenario);
CREATE INDEX ON dre_agg (marca, nome_filial);
CREATE INDEX ON dre_agg (conta_contabil, scenario, year_month);
CREATE INDEX ON dre_agg (recurring);


-- ══════════════════════════════════════════════════════════════
-- PARTE 3: Recriar get_soma_tags com filtro override_contabil
-- ══════════════════════════════════════════════════════════════

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

  -- 1a. Real (transactions) — EXCLUI linhas com override ativo
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions t
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
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR to_char(t.date::date, 'YYYY-MM') >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR to_char(t.date::date, 'YYYY-MM') <= oc.mes_ate)
    )
  GROUP BY
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Real'                                    AS scenario,
    to_char(t.date::date, 'YYYY-MM')          AS month,
    SUM(t.amount)                             AS total
  FROM transactions_manual t
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
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date::date, 'YYYY-MM')

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'Orçado'                                  AS scenario,
    to_char(t.date, 'YYYY-MM')                AS month,
    SUM(t.amount)                             AS total
  FROM transactions_orcado t
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
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    to_char(t.date, 'YYYY-MM')

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(t.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')         AS month,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
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
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(substring(p_month_from, 1, 4), to_char(t.date, 'YYYY'))
      || '-' || to_char(t.date, 'MM')

$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text, text, text[], text[], text[], text[], text, text[]) TO anon;


-- ══════════════════════════════════════════════════════════════
-- PARTE 4: Recriar get_variance_snapshot com filtro override
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_variance_snapshot(text, text[], text);

CREATE OR REPLACE FUNCTION get_variance_snapshot(
  p_year_month text,
  p_marcas     text[] DEFAULT NULL,
  p_recurring  text   DEFAULT 'Sim'
)
RETURNS TABLE(
  tag0   text,
  tag01  text,
  tag02  text,
  marca  text,
  scenario text,
  total  numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$

  -- 1a. Real (transactions) — EXCLUI override ativo
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'Real'::text,
    SUM(t.amount)
  FROM transactions t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
    AND NOT EXISTS (
      SELECT 1 FROM override_contabil oc
      WHERE oc.ativo = true
        AND oc.tag01 = COALESCE(t.tag01, 'Sem Subclassificação')
        AND (oc.marca  IS NULL OR oc.marca  = t.marca)
        AND (oc.filial IS NULL OR oc.filial = t.nome_filial)
        AND (oc.mes_de  IS NULL OR p_year_month >= oc.mes_de)
        AND (oc.mes_ate IS NULL OR p_year_month <= oc.mes_ate)
    )
  GROUP BY 1, 2, 3, 4

  UNION ALL

  -- 1b. Real (transactions_manual) — sempre incluso
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'Real'::text,
    SUM(t.amount)
  FROM transactions_manual t
  WHERE COALESCE(t.scenario, 'Real') IN ('Real', 'Original')
    AND to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  -- 2. Orçado
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'Orçado'::text,
    SUM(t.amount)
  FROM transactions_orcado t
  WHERE to_char(t.date::date, 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

  UNION ALL

  -- 3. A-1
  SELECT
    COALESCE(t.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    t.tag02,
    t.marca,
    'A-1'::text,
    SUM(t.amount)
  FROM transactions_ano_anterior t
  WHERE to_char((t.date::date) + interval '1 year', 'YYYY-MM') = p_year_month
    AND (p_marcas    IS NULL OR t.marca = ANY(p_marcas))
    AND (p_recurring IS NULL OR INITCAP(COALESCE(t.recurring, 'Sim')) = INITCAP(p_recurring))
  GROUP BY 1, 2, 3, 4

$$;

GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_variance_snapshot(text, text[], text) TO anon;


-- ══════════════════════════════════════════════════════════════
-- PARTE 5: Recriar get_dre_dimension (lê de dre_agg, já herda o filtro)
-- ══════════════════════════════════════════════════════════════
-- Não precisa alterar — já lê de dre_agg que agora exclui overrides.
-- Apenas REFRESH para que dre_agg reflita as regras.

REFRESH MATERIALIZED VIEW dre_agg;

RESET statement_timeout;
