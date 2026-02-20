-- ═══════════════════════════════════════════════════════════════════════════
-- garantir_todas_tag01_na_dre.sql
-- Garante que TODAS as tag01 (Real + Orçado + A-1) apareçam na DRE Gerencial
-- As não mapeadas vão automaticamente para tag0 = 'Sem Classificação'
--
-- EXECUTE NA ORDEM NO SUPABASE SQL EDITOR:
--   PASSO 1  → Diagnóstico (só leitura — não modifica nada)
--   PASSO 2  → Atualiza get_dre_filter_options (inclui tag01 do A-1)
--   PASSO 3  → Cria get_soma_tags (diagnóstico SomaTagsView)
--   PASSO 4  → (Opcional) Mapear tag01 órfãs se souber a classificação
--   VERIFICAÇÃO → Confirmar cobertura total
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: Diagnóstico — todas as tag01 de TODAS as tabelas ─────────────
-- Mostra quais tag01 existem e se estão mapeadas no tag0_map
-- NÃO modifica nada; serve para identificar o que falta mapear

SELECT
  src,
  tag01,
  qtd_registros,
  CASE WHEN tag0 IS NULL THEN '❌ SEM MAPEAMENTO' ELSE '✅ ' || tag0 END AS status_mapeamento
FROM (
  -- Real + Orçado (tabela transactions)
  SELECT
    'transactions' AS src,
    t.tag01,
    COUNT(*) AS qtd_registros,
    m.tag0
  FROM transactions t
  LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(m.tag1_norm))
  WHERE t.tag01 IS NOT NULL
  GROUP BY t.tag01, m.tag0

  UNION ALL

  -- A-1 (tabela transactions_ano_anterior)
  SELECT
    'transactions_ano_anterior' AS src,
    t.tag01,
    COUNT(*) AS qtd_registros,
    m.tag0
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(m.tag1_norm))
  WHERE t.tag01 IS NOT NULL
  GROUP BY t.tag01, m.tag0
) x
ORDER BY status_mapeamento DESC, qtd_registros DESC;


-- ─── PASSO 2: Atualizar get_dre_filter_options ────────────────────────────
-- Inclui tag01 de ambas as tabelas (transactions + transactions_ano_anterior)
-- Garante que tag01 exclusivas do A-1 apareçam no filtro da DRE
-- e sejam auto-selecionadas quando o usuário carrega a tela

DROP FUNCTION IF EXISTS get_dre_filter_options(text, text);

CREATE OR REPLACE FUNCTION get_dre_filter_options(
  p_month_from text DEFAULT NULL,
  p_month_to   text DEFAULT NULL
)
RETURNS TABLE(marcas text[], nome_filiais text[], tags01 text[])
LANGUAGE sql STABLE
AS $$
  SELECT
    -- Marcas: UNION de ambas as tabelas
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT marca AS tag FROM transactions
          WHERE marca IS NOT NULL
            AND (p_month_from IS NULL OR date >= p_month_from || '-01')
            AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT marca AS tag FROM transactions_ano_anterior
          WHERE marca IS NOT NULL
            AND (p_month_from IS NULL OR to_char(date, 'MM') >= substring(p_month_from, 6, 2))
            AND (p_month_to   IS NULL OR to_char(date, 'MM') <= substring(p_month_to,   6, 2))
      ) m ORDER BY tag
    ) AS marcas,

    -- Filiais: UNION de ambas as tabelas
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT nome_filial AS tag FROM transactions
          WHERE nome_filial IS NOT NULL
            AND (p_month_from IS NULL OR date >= p_month_from || '-01')
            AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT nome_filial AS tag FROM transactions_ano_anterior
          WHERE nome_filial IS NOT NULL
            AND (p_month_from IS NULL OR to_char(date, 'MM') >= substring(p_month_from, 6, 2))
            AND (p_month_to   IS NULL OR to_char(date, 'MM') <= substring(p_month_to,   6, 2))
      ) f ORDER BY tag
    ) AS nome_filiais,

    -- Tags01: UNION de ambas as tabelas
    -- CRÍTICO: sem isso, tag01 exclusivas do A-1 ficam fora do filtro
    --          e são excluídas pelo filtro p_tags01 no get_dre_summary
    ARRAY(
      SELECT DISTINCT tag FROM (
        SELECT tag01 AS tag FROM transactions
          WHERE tag01 IS NOT NULL
            AND (p_month_from IS NULL OR date >= p_month_from || '-01')
            AND (p_month_to   IS NULL OR date <= p_month_to   || '-31')
        UNION
        SELECT tag01 AS tag FROM transactions_ano_anterior
          WHERE tag01 IS NOT NULL
            AND (p_month_from IS NULL OR to_char(date, 'MM') >= substring(p_month_from, 6, 2))
            AND (p_month_to   IS NULL OR to_char(date, 'MM') <= substring(p_month_to,   6, 2))
      ) t ORDER BY tag
    ) AS tags01
$$;

GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dre_filter_options(text, text) TO anon;


-- ─── PASSO 3: Criar get_soma_tags ─────────────────────────────────────────
-- Usada pelo SomaTagsView para diagnóstico visual (Tag0 > Tag01, Real vs A-1)
-- Agrega ambas as tabelas com mapeamento tag0_map

DROP FUNCTION IF EXISTS get_soma_tags(text);

CREATE OR REPLACE FUNCTION get_soma_tags(p_year text DEFAULT NULL)
RETURNS TABLE(tag0 text, tag01 text, scenario text, total numeric)
LANGUAGE sql STABLE
AS $$
  -- Real + Orçado (transactions — date é TEXT 'YYYY-MM-DD')
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    COALESCE(t.scenario, 'Real')              AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE (p_year IS NULL OR substring(t.date, 1, 4) = p_year)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação'),
    COALESCE(t.scenario, 'Real')

  UNION ALL

  -- A-1 (transactions_ano_anterior — date é tipo DATE)
  SELECT
    COALESCE(tm.tag0, 'Sem Classificação')    AS tag0,
    COALESCE(t.tag01, 'Sem Subclassificação') AS tag01,
    'A-1'                                     AS scenario,
    SUM(t.amount)                             AS total
  FROM transactions_ano_anterior t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag01)) = LOWER(TRIM(tm.tag1_norm))
  WHERE (p_year IS NULL OR to_char(t.date, 'YYYY') = p_year)
  GROUP BY
    COALESCE(tm.tag0, 'Sem Classificação'),
    COALESCE(t.tag01, 'Sem Subclassificação')
$$;

GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_soma_tags(text) TO anon;


-- ─── PASSO 4 (OPCIONAL): Mapear tag01 órfãs ──────────────────────────────
-- Execute APENAS se o PASSO 1 mostrar tag01 sem mapeamento que você reconhece
-- Para cada tag01 identificada como '❌ SEM MAPEAMENTO', adicione abaixo:
--
-- Exemplo:
-- INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
--   ('nome da tag01 em lowercase', 'Nome Original', 'Tag0 Correta')
-- ON CONFLICT (tag1_norm) DO UPDATE
--   SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;
--
-- Se NÃO souber classificar → não precisa fazer nada.
-- O COALESCE já garante que vão para 'Sem Classificação' automaticamente.


-- ─── VERIFICAÇÃO FINAL ─────────────────────────────────────────────────────
-- Execute após todos os passos para confirmar cobertura total

-- 1. Confirmar que get_dre_filter_options inclui tag01 do A-1
-- SELECT unnest(tags01) AS tag01
-- FROM get_dre_filter_options('2026-01', '2026-12')
-- ORDER BY tag01;

-- 2. Confirmar cobertura no DRE (todas tag01 sob algum tag0)
-- SELECT tag0, COUNT(DISTINCT tag01) AS qtd_tag01, SUM(total_amount) AS soma
-- FROM get_dre_summary('2026-01', '2026-12')
-- GROUP BY tag0
-- ORDER BY tag0;

-- 3. Confirmar get_soma_tags (SomaTagsView)
-- SELECT tag0, tag01, scenario, total
-- FROM get_soma_tags('2026')
-- ORDER BY tag0, tag01, scenario
-- LIMIT 50;
