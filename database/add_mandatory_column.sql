-- Adiciona coluna mandatory à variance_justifications
-- Indica se a justificativa é obrigatória (desvio acima do threshold) ou opcional
ALTER TABLE variance_justifications
  ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false;

-- Index para filtrar rapidamente obrigatórias pendentes
CREATE INDEX IF NOT EXISTS idx_vj_mandatory ON variance_justifications (mandatory) WHERE mandatory = true;
