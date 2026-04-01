-- SQL para renomear a coluna CC para TAG01 na tabela dre_fabric
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)

-- Renomear a coluna cc para tag01 na tabela dre_fabric
ALTER TABLE dre_fabric
RENAME COLUMN cc TO tag01;

-- Atualizar o índice se houver algum relacionado
DROP INDEX IF EXISTS idx_dre_fabric_cc;
CREATE INDEX IF NOT EXISTS idx_dre_fabric_tag01 ON dre_fabric(tag01);

-- Atualizar comentário da coluna
COMMENT ON COLUMN dre_fabric.tag01 IS 'Tag 01 - Centro de Custo';

SELECT 'Coluna CC renomeada para TAG01 com sucesso!' AS status;
