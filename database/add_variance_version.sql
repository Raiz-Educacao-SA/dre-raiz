-- ══════════════════════════════════════════════════════════════
-- Variance Justifications — Adicionar coluna version
-- Controle de versão para regeneração de desvios
-- ══════════════════════════════════════════════════════════════

-- Coluna version: cada "Gerar Desvios" incrementa a versão
-- Ao re-gerar, valores financeiros são atualizados mas justificativas preservadas
ALTER TABLE variance_justifications
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Index para buscar versão máxima rapidamente
CREATE INDEX IF NOT EXISTS idx_vj_version
  ON variance_justifications (year_month, marca, version);

-- Verificação
SELECT 'version column added' AS status;
