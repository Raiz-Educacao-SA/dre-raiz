-- ============================================
-- Slide Versions + Edit History
-- Sistema de versionamento de slides com audit trail
-- ============================================

-- 1. Tabela principal: versões de slides
CREATE TABLE IF NOT EXISTS slide_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_hash TEXT NOT NULL,
  filter_context JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  label TEXT DEFAULT '',
  ppt_data JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca por contexto (mais comum)
CREATE INDEX IF NOT EXISTS idx_slide_versions_filter_hash ON slide_versions(filter_hash);
CREATE INDEX IF NOT EXISTS idx_slide_versions_created_by ON slide_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_slide_versions_created_at ON slide_versions(created_at DESC);

-- 2. Tabela de histórico de edições (audit trail)
CREATE TABLE IF NOT EXISTS slide_version_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_version_id UUID NOT NULL REFERENCES slide_versions(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by TEXT NOT NULL,
  edited_by_name TEXT NOT NULL DEFAULT '',
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slide_version_edits_version ON slide_version_edits(slide_version_id);
CREATE INDEX IF NOT EXISTS idx_slide_version_edits_at ON slide_version_edits(edited_at DESC);

-- 3. RLS
ALTER TABLE slide_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE slide_version_edits ENABLE ROW LEVEL SECURITY;

-- Política: qualquer usuário autenticado pode ler todas as versões
CREATE POLICY "slide_versions_select" ON slide_versions
  FOR SELECT TO authenticated USING (true);

-- Política: qualquer usuário autenticado pode inserir
CREATE POLICY "slide_versions_insert" ON slide_versions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Política: qualquer usuário autenticado pode atualizar
CREATE POLICY "slide_versions_update" ON slide_versions
  FOR UPDATE TO authenticated USING (true);

-- Política: apenas o criador ou admin pode deletar
CREATE POLICY "slide_versions_delete" ON slide_versions
  FOR DELETE TO authenticated USING (
    created_by = auth.email()
    OR auth.email() IN (SELECT email FROM users WHERE role = 'admin')
  );

-- Edits: mesmas políticas (leitura aberta, escrita autenticada)
CREATE POLICY "slide_version_edits_select" ON slide_version_edits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "slide_version_edits_insert" ON slide_version_edits
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_slide_version_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_slide_version_updated
  BEFORE UPDATE ON slide_versions
  FOR EACH ROW EXECUTE FUNCTION update_slide_version_timestamp();
