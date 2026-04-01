-- ============================================================
-- ATUALIZAR ESTRUTURA TABELA dre_fabric
-- Adiciona coluna chave_id
-- ============================================================

-- 1. Adicionar coluna chave_id (TEXT)
-- Identificador unico composto: CODCOLIGADA + INTEGRACHAVE_TRATADA + contador sequencial
-- Formato exemplo: "1-12345-1", "1-12345-2", "2-67890-1"
-- O contador reinicia a cada mudanca de CODCOLIGADA ou INTEGRACHAVE_TRATADA
ALTER TABLE dre_fabric
ADD COLUMN IF NOT EXISTS chave_id TEXT;

-- 2. Criar indice para melhor performance nas consultas por chave_id
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave_id ON dre_fabric(chave_id);

-- 3. Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dre_fabric'
  AND column_name = 'chave_id';

-- ============================================================
-- NOTAS:
-- - A coluna chave_id permite NULL pois dados antigos nao terao este valor
-- - Novos registros sincronizados sempre terao chave_id populado
-- - O indice melhora a performance de consultas e joins por chave_id
-- ============================================================
