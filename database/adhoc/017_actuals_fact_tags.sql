-- Migration 017: Adicionar colunas tag02 e tag03 à actuals_fact
-- Necessário para suportar filtros de Segmento e Projeto no DRE Gerencial

ALTER TABLE public.actuals_fact
  ADD COLUMN IF NOT EXISTS tag02 TEXT,
  ADD COLUMN IF NOT EXISTS tag03 TEXT;

COMMENT ON COLUMN public.actuals_fact.tag02 IS 'Segmento: Educação Infantil, Fundamental I, Fundamental II, Ensino Médio, Integral, Geral';
COMMENT ON COLUMN public.actuals_fact.tag03 IS 'Projeto: Operação Regular, Reforma Predial, Campanha Matrículas, Evento Pedagógico, Formação Docente';

-- Índices para performance nos filtros do DRE
CREATE INDEX IF NOT EXISTS idx_actuals_fact_tag02 ON public.actuals_fact(tenant_id, tag02)
  WHERE tag02 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actuals_fact_tag03 ON public.actuals_fact(tenant_id, tag03)
  WHERE tag03 IS NOT NULL;
