-- ============================================================
-- REVIEW TRACKING — Parte 4: Atualizar RPC para incluir created_at
-- Rodar DEPOIS dos 3 anteriores
-- ============================================================
-- Esta RPC substitui a v3 mantendo a mesma assinatura.
-- Unica mudanca: adiciona created_at::timestamptz nos SELECTs.
-- ============================================================

DROP FUNCTION IF EXISTS get_filtered_transactions_page(text, text, text, text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text, text, text, numeric, text, int, int, boolean);

CREATE OR REPLACE FUNCTION get_filtered_transactions_page(
  p_table_name    text    DEFAULT 'transactions',
  p_month_from    text    DEFAULT NULL,
  p_month_to      text    DEFAULT NULL,
  p_scenario      text    DEFAULT NULL,
  p_marcas        text[]  DEFAULT NULL,
  p_nome_filiais  text[]  DEFAULT NULL,
  p_tag0          text[]  DEFAULT NULL,
  p_tags01        text[]  DEFAULT NULL,
  p_tags02        text[]  DEFAULT NULL,
  p_tags03        text[]  DEFAULT NULL,
  p_categories    text[]  DEFAULT NULL,
  p_conta_contabils text[] DEFAULT NULL,
  p_recurring     text[]  DEFAULT NULL,
  p_statuses      text[]  DEFAULT NULL,
  p_ticket        text    DEFAULT NULL,
  p_vendor        text    DEFAULT NULL,
  p_description   text    DEFAULT NULL,
  p_amount        numeric DEFAULT NULL,
  p_chave_id      text    DEFAULT NULL,
  p_offset        int     DEFAULT 0,
  p_limit         int     DEFAULT 1000,
  p_skip_count    boolean DEFAULT false
)
RETURNS TABLE(
  id text,
  date text,
  description text,
  conta_contabil text,
  category text,
  amount numeric,
  type text,
  scenario text,
  status text,
  filial text,
  marca text,
  tag0 text,
  tag01 text,
  tag02 text,
  tag03 text,
  recurring text,
  ticket text,
  vendor text,
  nat_orc text,
  chave_id text,
  nome_filial text,
  updated_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET statement_timeout = '60s'
AS $fn$
DECLARE
  v_sql text;
  v_count_sql text;
  v_total bigint;
BEGIN
  IF p_table_name = 'transactions' THEN
    v_sql := 'SELECT id::text, date::text, description, conta_contabil, category, amount::numeric, type, scenario, status, filial, marca, tag0, tag01, tag02, tag03, recurring, ticket, vendor, nat_orc, chave_id, nome_filial, updated_at, created_at FROM ('
      || 'SELECT id::text, date::text, description::text, conta_contabil::text, category::text, amount::numeric, type::text, scenario::text, status::text, filial::text, marca::text, tag0::text, tag01::text, tag02::text, tag03::text, recurring::text, ticket::text, vendor::text, nat_orc::text, chave_id::text, nome_filial::text, updated_at::timestamptz, created_at::timestamptz FROM transactions'
      || ' UNION ALL '
      || 'SELECT id::text, date::text, description::text, conta_contabil::text, category::text, amount::numeric, type::text, scenario::text, status::text, filial::text, marca::text, tag0::text, tag01::text, tag02::text, tag03::text, recurring::text, ticket::text, vendor::text, nat_orc::text, chave_id::text, nome_filial::text, updated_at::timestamptz, created_at::timestamptz FROM transactions_manual'
      || ') AS _combined WHERE true';
  ELSE
    v_sql := format(
      'SELECT id::text, date::text, description, conta_contabil, category, amount, type, scenario, status, filial, marca, tag0, tag01, tag02, tag03, recurring, ticket, vendor, nat_orc, chave_id, nome_filial, updated_at, created_at FROM %I WHERE true',
      p_table_name
    );
  END IF;

  -- Filtros de data
  IF p_month_from IS NOT NULL THEN
    v_sql := v_sql || format(' AND date >= %L', p_month_from || '-01');
  END IF;
  IF p_month_to IS NOT NULL THEN
    v_sql := v_sql || format(' AND date <= %L', p_month_to || '-31');
  END IF;

  -- Filtro de cenario
  IF p_scenario IS NOT NULL THEN
    IF p_scenario = 'Real' THEN
      v_sql := v_sql || ' AND (scenario IS NULL OR scenario = ''Real'')';
    ELSE
      v_sql := v_sql || format(' AND scenario = %L', p_scenario);
    END IF;
  END IF;

  -- Filtros de array
  IF p_marcas IS NOT NULL AND array_length(p_marcas, 1) > 0 THEN
    v_sql := v_sql || format(' AND marca = ANY(%L)', p_marcas);
  END IF;
  IF p_nome_filiais IS NOT NULL AND array_length(p_nome_filiais, 1) > 0 THEN
    v_sql := v_sql || format(' AND nome_filial = ANY(%L)', p_nome_filiais);
  END IF;
  IF p_tag0 IS NOT NULL AND array_length(p_tag0, 1) > 0 THEN
    v_sql := v_sql || format(' AND tag0 = ANY(%L)', p_tag0);
  END IF;
  IF p_tags01 IS NOT NULL AND array_length(p_tags01, 1) > 0 THEN
    v_sql := v_sql || format(' AND tag01 = ANY(%L)', p_tags01);
  END IF;
  IF p_tags02 IS NOT NULL AND array_length(p_tags02, 1) > 0 THEN
    v_sql := v_sql || format(' AND tag02 = ANY(%L)', p_tags02);
  END IF;
  IF p_tags03 IS NOT NULL AND array_length(p_tags03, 1) > 0 THEN
    v_sql := v_sql || format(' AND tag03 = ANY(%L)', p_tags03);
  END IF;
  IF p_categories IS NOT NULL AND array_length(p_categories, 1) > 0 THEN
    v_sql := v_sql || format(' AND category = ANY(%L)', p_categories);
  END IF;
  IF p_conta_contabils IS NOT NULL AND array_length(p_conta_contabils, 1) > 0 THEN
    v_sql := v_sql || format(' AND conta_contabil = ANY(%L)', p_conta_contabils);
  END IF;
  IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
    v_sql := v_sql || format(' AND status = ANY(%L)', p_statuses);
  END IF;

  -- Filtro recurring
  IF p_recurring IS NOT NULL AND array_length(p_recurring, 1) > 0 THEN
    v_sql := v_sql || format(' AND recurring = ANY(%L)', p_recurring);
  END IF;

  -- Filtros de texto (ILIKE)
  IF p_ticket IS NOT NULL AND p_ticket <> '' THEN
    v_sql := v_sql || format(' AND ticket ILIKE %L', '%%' || p_ticket || '%%');
  END IF;
  IF p_vendor IS NOT NULL AND p_vendor <> '' THEN
    v_sql := v_sql || format(' AND vendor ILIKE %L', '%%' || p_vendor || '%%');
  END IF;
  IF p_description IS NOT NULL AND p_description <> '' THEN
    v_sql := v_sql || format(' AND description ILIKE %L', '%%' || p_description || '%%');
  END IF;
  IF p_chave_id IS NOT NULL AND p_chave_id <> '' THEN
    v_sql := v_sql || format(' AND chave_id ILIKE %L', '%%' || p_chave_id || '%%');
  END IF;

  -- Filtro de valor exato
  IF p_amount IS NOT NULL THEN
    v_sql := v_sql || format(' AND amount = %L', p_amount);
  END IF;

  -- COUNT
  IF p_skip_count THEN
    v_total := -1;
  ELSE
    v_count_sql := 'SELECT count(*) FROM (' || v_sql || ') sub';
    EXECUTE v_count_sql INTO v_total;
  END IF;

  -- ORDER + LIMIT
  v_sql := v_sql || ' ORDER BY date DESC, id ASC';
  v_sql := v_sql || format(' OFFSET %s LIMIT %s', p_offset, p_limit);

  -- Retornar dados + total_count
  RETURN QUERY EXECUTE
    'SELECT sub.*, ' || v_total || '::bigint AS total_count FROM (' || v_sql || ') sub';
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_filtered_transactions_page TO authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_transactions_page TO anon;
