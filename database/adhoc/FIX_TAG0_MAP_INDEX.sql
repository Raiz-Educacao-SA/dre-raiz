-- =====================================================
-- CORREÇÃO CRÍTICA: Índice em tag0_map
-- =====================================================
-- Problema: LEFT JOIN LOWER(TRIM()) sem índice = lento
-- Solução: Índice funcional para acelerar JOIN
-- =====================================================

-- 1. Criar índice funcional em tag0_map
CREATE INDEX IF NOT EXISTS idx_tag0_map_tag1_norm_lower
  ON tag0_map (LOWER(TRIM(tag1_norm)));

-- 2. Criar índice em tag1_raw para lookup reverso
CREATE INDEX IF NOT EXISTS idx_tag0_map_tag1_raw
  ON tag0_map (tag1_raw);

-- 3. Criar índice em tag0 para filtros
CREATE INDEX IF NOT EXISTS idx_tag0_map_tag0
  ON tag0_map (tag0);

-- =====================================================
-- VERIFICAÇÃO: Ver se índices foram criados
-- =====================================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tag0_map'
ORDER BY indexname;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ idx_tag0_map_tag1_norm_lower criado
-- ✅ JOIN em get_dre_summary() vai usar índice
-- ✅ DRE Gerencial deve acelerar de 30s → 5s
-- =====================================================
