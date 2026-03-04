-- Adiciona coluna snapshot_at na tabela variance_justifications
-- Registra o momento exato em que a "foto" da DRE foi tirada
-- Executar no Supabase SQL Editor

ALTER TABLE variance_justifications
ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

-- Preencher retroativamente: usar created_at como aproximação para dados existentes
UPDATE variance_justifications
SET snapshot_at = created_at
WHERE snapshot_at IS NULL;
