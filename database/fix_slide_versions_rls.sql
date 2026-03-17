-- Fix RLS: remover policies com TO authenticated e recriar sem role restriction
-- (padrão do projeto: policies sem TO, + GRANT para anon/authenticated)

-- Drop policies antigas
DROP POLICY IF EXISTS "slide_versions_select" ON slide_versions;
DROP POLICY IF EXISTS "slide_versions_insert" ON slide_versions;
DROP POLICY IF EXISTS "slide_versions_update" ON slide_versions;
DROP POLICY IF EXISTS "slide_versions_delete" ON slide_versions;
DROP POLICY IF EXISTS "slide_version_edits_select" ON slide_version_edits;
DROP POLICY IF EXISTS "slide_version_edits_insert" ON slide_version_edits;

-- Recriar sem TO (aplica para anon + authenticated)
CREATE POLICY "slide_versions_select" ON slide_versions
  FOR SELECT USING (true);

CREATE POLICY "slide_versions_insert" ON slide_versions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "slide_versions_update" ON slide_versions
  FOR UPDATE USING (true);

CREATE POLICY "slide_versions_delete" ON slide_versions
  FOR DELETE USING (
    created_by = auth.email()
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "slide_version_edits_select" ON slide_version_edits
  FOR SELECT USING (true);

CREATE POLICY "slide_version_edits_insert" ON slide_version_edits
  FOR INSERT WITH CHECK (true);

-- GRANTs
GRANT ALL ON slide_versions TO authenticated, anon;
GRANT ALL ON slide_version_edits TO authenticated, anon;
