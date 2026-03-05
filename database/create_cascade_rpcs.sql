-- ✅ JÁ EXECUTADO (04/03/2026)
-- RPCs para cascata de filtros DISTINCT (otimização de performance)
-- Substitui full-table-scans por SELECT DISTINCT no servidor
-- Executar no Supabase SQL Editor

-- RPC: get_tag02_for_tag01s (substitui SELECT tag02 FROM transactions WHERE tag01 IN (...) LIMIT 10000)
CREATE OR REPLACE FUNCTION get_tag02_for_tag01s(p_tag01s text[])
RETURNS text[] AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag02 FROM transactions WHERE tag01 = ANY(p_tag01s) AND tag02 IS NOT NULL ORDER BY tag02),
    '{}'::text[]
  );
$$ LANGUAGE sql STABLE;

-- RPC: get_tag03_for_tag02s (substitui SELECT tag03 FROM transactions WHERE tag02 IN (...) LIMIT 10000)
CREATE OR REPLACE FUNCTION get_tag03_for_tag02s(p_tag02s text[])
RETURNS text[] AS $$
  SELECT COALESCE(
    ARRAY(SELECT DISTINCT tag03 FROM transactions WHERE tag02 = ANY(p_tag02s) AND tag03 IS NOT NULL ORDER BY tag03),
    '{}'::text[]
  );
$$ LANGUAGE sql STABLE;
