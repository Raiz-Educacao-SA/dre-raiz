-- ============================================================
-- FIX: Resolver tag0 via tag0_map na tabela tags e na RPC
-- Problema: muitas contas em tags têm tag0 = '99 cadastrar tag0'
-- mesmo tendo tag1 (tag01) mapeado na tag0_map
-- ============================================================

-- 1. UPDATE one-time: preencher tag0 na tabela tags usando tag0_map
-- Atualiza toda conta que tem tag1 mapeada na tag0_map
UPDATE tags t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
  AND (
    t.tag0 IS NULL
    OR t.tag0 = ''
    OR t.tag0 LIKE '99%'
  );

-- Verificação: quantas contas ainda ficaram sem tag0?
SELECT
  COUNT(*) FILTER (WHERE tag0 IS NOT NULL AND tag0 NOT LIKE '99%') AS com_tag0,
  COUNT(*) FILTER (WHERE tag0 IS NULL OR tag0 = '' OR tag0 LIKE '99%') AS sem_tag0,
  COUNT(*) AS total
FROM tags
WHERE cod_conta IS NOT NULL AND LENGTH(cod_conta) = 14;

-- 2. Ver quais tag1 (tag01) ainda não têm mapeamento na tag0_map
-- Use isso para cadastrar manualmente na tag0_map se necessário
SELECT DISTINCT t.tag1 AS tag01_sem_mapeamento, COUNT(*) AS qtd_contas
FROM tags t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.cod_conta IS NOT NULL
  AND LENGTH(t.cod_conta) = 14
  AND tm.tag0 IS NULL
  AND t.tag1 IS NOT NULL
  AND t.tag1 <> ''
GROUP BY t.tag1
ORDER BY qtd_contas DESC;

-- 3. Recriar RPC com COALESCE(tag0_map.tag0, tags.tag0)
-- Assim mesmo que a tabela tags não tenha tag0, a RPC resolve via tag0_map
CREATE OR REPLACE FUNCTION get_conta_contabil_options()
RETURNS SETOF jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'cod_conta',    t.cod_conta,
    'nome_nat_orc', COALESCE(t.nome_nat_orc, t.nat_orc),
    'tag0',         COALESCE(tm.tag0, t.tag0),
    'tag01',        t.tag1,
    'tag02',        t.tag2,
    'tag03',        t.tag3
  )
  FROM tags t
  LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
  WHERE t.cod_conta IS NOT NULL AND LENGTH(t.cod_conta) = 14
  ORDER BY t.cod_conta;
$$;

-- 4. Verificação final: listar contas que AINDA teriam tag0 null/99 mesmo com JOIN
SELECT t.cod_conta, t.tag1, t.tag0 AS tag0_original, tm.tag0 AS tag0_map
FROM tags t
LEFT JOIN tag0_map tm ON LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
WHERE t.cod_conta IS NOT NULL
  AND LENGTH(t.cod_conta) = 14
  AND tm.tag0 IS NULL
  AND (t.tag0 IS NULL OR t.tag0 = '' OR t.tag0 LIKE '99%')
ORDER BY t.tag1, t.cod_conta;
