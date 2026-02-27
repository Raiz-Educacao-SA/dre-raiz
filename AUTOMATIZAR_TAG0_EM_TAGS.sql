-- ════════════════════════════════════════════════════════════════
-- AUTOMATIZAR PREENCHIMENTO DE tag0 NA TABELA tags
-- ════════════════════════════════════════════════════════════════
--
-- LÓGICA:
--   1. Trigger na tabela tags → preenche tag0 via tag0_map quando tag1 é inserido/alterado
--   2. Trigger na tabela tag0_map → propaga mudanças de mapeamento para tags
--
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════


-- ── PASSO 1: APLICAR O UPDATE INICIAL (preencher registros existentes) ─────────
UPDATE tags t
SET tag0 = tm.tag0
FROM tag0_map tm
WHERE LOWER(TRIM(t.tag1)) = LOWER(TRIM(tm.tag1_norm))
  AND (t.tag0 IS NULL OR t.tag0 = '99 - Cadastrar Tag0');

-- Verificar quantos foram atualizados
SELECT
  COUNT(*) FILTER (WHERE tag0 IS NOT NULL AND tag0 != '99 - Cadastrar Tag0') AS com_tag0,
  COUNT(*) FILTER (WHERE tag0 IS NULL OR tag0 = '99 - Cadastrar Tag0')       AS sem_tag0,
  COUNT(*) AS total
FROM tags
WHERE cod_conta IS NOT NULL AND LENGTH(cod_conta) = 14;


-- ── PASSO 2: FUNÇÃO TRIGGER — preenche tag0 ao inserir/atualizar tags ─────────
CREATE OR REPLACE FUNCTION fn_auto_tag0_em_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag0 text;
BEGIN
  -- Só age se tag1 (novo ou alterado) não for nulo
  IF NEW.tag1 IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca o tag0 correspondente no mapa
  SELECT tag0
    INTO v_tag0
    FROM tag0_map
   WHERE LOWER(TRIM(tag1_norm)) = LOWER(TRIM(NEW.tag1))
   LIMIT 1;

  -- Preenche tag0 se encontrou mapeamento
  IF v_tag0 IS NOT NULL THEN
    NEW.tag0 := v_tag0;
  END IF;

  RETURN NEW;
END;
$$;


-- ── PASSO 3: TRIGGER na tabela tags ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_tag0_em_tags ON tags;

CREATE TRIGGER trg_auto_tag0_em_tags
  BEFORE INSERT OR UPDATE OF tag1
  ON tags
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_tag0_em_tags();


-- ── PASSO 4: FUNÇÃO TRIGGER — propaga mudança no tag0_map para tags ────────────
CREATE OR REPLACE FUNCTION fn_propagar_tag0_map_para_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Quando um mapeamento é inserido ou atualizado:
  -- atualiza todos os registros de tags que usam aquela tag1_norm
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE tags
    SET tag0 = NEW.tag0
    WHERE LOWER(TRIM(tag1)) = LOWER(TRIM(NEW.tag1_norm));
  END IF;

  -- Quando um mapeamento é deletado:
  -- volta para o placeholder padrão
  IF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET tag0 = '99 - Cadastrar Tag0'
    WHERE LOWER(TRIM(tag1)) = LOWER(TRIM(OLD.tag1_norm));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ── PASSO 5: TRIGGER na tabela tag0_map ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_propagar_tag0_map_para_tags ON tag0_map;

CREATE TRIGGER trg_propagar_tag0_map_para_tags
  AFTER INSERT OR UPDATE OR DELETE
  ON tag0_map
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_tag0_map_para_tags();


-- ── PASSO 6: VERIFICAÇÃO FINAL ────────────────────────────────────────────────
SELECT
  COALESCE(tag0, '(nulo)') AS tag0,
  COUNT(*) AS total_contas
FROM tags
WHERE cod_conta IS NOT NULL AND LENGTH(cod_conta) = 14
GROUP BY tag0
ORDER BY total_contas DESC;
