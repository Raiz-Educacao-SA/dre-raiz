-- ═══════════════════════════════════════════════════════════════════
-- FIX: get_filtered_transactions_page + override_contabil
-- Aplica o mesmo NOT EXISTS filter que existe no get_soma_tags:
-- transações cujo tag01 está no override_contabil são ocultadas;
-- transações_manual (substitutas) continuam aparecendo normalmente.
-- ═══════════════════════════════════════════════════════════════════

-- Dropar TODAS as versões existentes dinamicamente
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'get_filtered_transactions_page'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END;
$$;

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
  p_created_from  text    DEFAULT NULL,
  p_created_to    text    DEFAULT NULL,
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
    -- transactions: exclui linhas cobertas pelo override_contabil
    -- transactions_manual: sempre inclui (são as substitutas do override)
    v_sql := 'SELECT id::text, date::text, description, conta_contabil, category, amount::numeric, type, scenario, status, filial, marca, tag0, tag01, tag02, tag03, recurring, ticket, vendor, nat_orc, chave_id, nome_filial, updated_at, created_at FROM ('
      || 'SELECT t.id::text, t.date::text, t.description::text, t.conta_contabil::text, t.category::text, t.amount::numeric, t.type::text, t.scenario::text, t.status::text, t.filial::text, t.marca::text, t.tag0::text, t.tag01::text, t.tag02::text, t.tag03::text, t.recurring::text, t.ticket::text, t.vendor::text, t.nat_orc::text, t.chave_id::text, t.nome_filial::text, t.updated_at::timestamptz, t.created_at::timestamptz FROM transactions t'
      || ' WHERE NOT EXISTS ('
      ||   'SELECT 1 FROM override_contabil oc'
      ||   ' WHERE oc.ativo = true'
      ||     ' AND oc.tag01 = COALESCE(t.tag01, ''Sem Subclassificação'')'
      ||     ' AND (oc.marca  IS NULL OR oc.marca  = t.marca)'
      ||     ' AND (oc.filial IS NULL OR oc.filial = t.nome_filial)'
      ||     ' AND (oc.mes_de  IS NULL OR to_char(t.date::date, ''YYYY-MM'') >= oc.mes_de)'
      ||     ' AND (oc.mes_ate IS NULL OR to_char(t.date::date, ''YYYY-MM'') <= oc.mes_ate)'
      || ')'
      || ' UNION ALL '
      || 'SELECT id::text, date::text, description::text, conta_contabil::text, category::text, amount::numeric, type::text, scenario::text, status::text, filial::text, marca::text, tag0::text, tag01::text, tag02::text, tag03::text, recurring::text, ticket::text, vendor::text, nat_orc::text, chave_id::text, nome_filial::text, updated_at::timestamptz, created_at::timestamptz FROM transactions_manual'
      || ') AS _combined WHERE true';
  ELSE
    v_sql := format(
      'SELECT id::text, date::text, description, conta_contabil, category, amount, type, scenario, status, filial, marca, tag0, tag01, tag02, tag03, recurring, ticket, vendor, nat_orc, chave_id, nome_filial, updated_at, created_at FROM %I WHERE true',
      p_table_name
    );
  END IF;

  -- Filtros de data (competência)
  IF p_month_from IS NOT NULL THEN
    v_sql := v_sql || format(' AND date >= %L', p_month_from || '-01');
  END IF;
  IF p_month_to IS NOT NULL THEN
    v_sql := v_sql || format(' AND date <= %L', p_month_to || '-31');
  END IF;

  -- Filtros de data de lançamento (created_at)
  IF p_created_from IS NOT NULL THEN
    v_sql := v_sql || format(' AND created_at >= %L::date', p_created_from);
  END IF;
  IF p_created_to IS NOT NULL THEN
    v_sql := v_sql || format(' AND created_at < (%L::date + interval ''1 day'')', p_created_to);
  END IF;

  -- Filtro de cenário
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

  RETURN QUERY EXECUTE
    'SELECT sub.*, ' || v_total || '::bigint AS total_count FROM (' || v_sql || ') sub';
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_filtered_transactions_page TO authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_transactions_page TO anon;
