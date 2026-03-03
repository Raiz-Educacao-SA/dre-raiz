-- ============================================
-- Automação: tag01/tag02/tag03 via conta_contabil
-- 1. Trigger nas 3 tabelas (INSERT/UPDATE de conta_contabil)
-- 2. Função de backfill para pg_cron (01:00 BRT = 04:00 UTC)
-- ============================================

-- ============================================
-- PARTE 1: Trigger — auto-popula tag01/tag02/tag03
-- ============================================

CREATE OR REPLACE FUNCTION fn_auto_populate_tags_from_conta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Só buscar se conta_contabil não é nulo
  IF NEW.conta_contabil IS NOT NULL AND NEW.conta_contabil <> '' THEN
    SELECT tg.tag1, tg.tag2, tg.tag3
    INTO NEW.tag01, NEW.tag02, NEW.tag03
    FROM tags tg
    WHERE tg.cod_conta = NEW.conta_contabil
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_auto_populate_tags_from_conta() IS 'Busca tag01/tag02/tag03 da tabela tags via conta_contabil. Roda em BEFORE INSERT/UPDATE.';

-- Trigger em transactions (Real)
DROP TRIGGER IF EXISTS trg_auto_tags_from_conta ON transactions;
CREATE TRIGGER trg_auto_tags_from_conta
  BEFORE INSERT OR UPDATE OF conta_contabil ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tags_from_conta();

-- Trigger em transactions_orcado (Orçado)
DROP TRIGGER IF EXISTS trg_auto_tags_from_conta ON transactions_orcado;
CREATE TRIGGER trg_auto_tags_from_conta
  BEFORE INSERT OR UPDATE OF conta_contabil ON transactions_orcado
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tags_from_conta();

-- Trigger em transactions_ano_anterior (Ano Anterior)
DROP TRIGGER IF EXISTS trg_auto_tags_from_conta ON transactions_ano_anterior;
CREATE TRIGGER trg_auto_tags_from_conta
  BEFORE INSERT OR UPDATE OF conta_contabil ON transactions_ano_anterior
  FOR EACH ROW EXECUTE FUNCTION fn_auto_populate_tags_from_conta();

-- ============================================
-- PARTE 2: Função de backfill — atualiza existentes
-- ============================================

CREATE OR REPLACE FUNCTION backfill_tags_via_conta_contabil()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  v_real INT := 0;
  v_orcado INT := 0;
  v_ant INT := 0;
BEGIN
  -- transactions (Real)
  UPDATE transactions AS tr
  SET tag01 = tg.tag1,
      tag02 = tg.tag2,
      tag03 = tg.tag3
  FROM tags tg
  WHERE tr.conta_contabil = tg.cod_conta
    AND tr.conta_contabil IS NOT NULL
    AND (tr.tag01 IS DISTINCT FROM tg.tag1
      OR tr.tag02 IS DISTINCT FROM tg.tag2
      OR tr.tag03 IS DISTINCT FROM tg.tag3);
  GET DIAGNOSTICS v_real = ROW_COUNT;

  -- transactions_orcado (Orçado)
  UPDATE transactions_orcado AS tr
  SET tag01 = tg.tag1,
      tag02 = tg.tag2,
      tag03 = tg.tag3
  FROM tags tg
  WHERE tr.conta_contabil = tg.cod_conta
    AND tr.conta_contabil IS NOT NULL
    AND (tr.tag01 IS DISTINCT FROM tg.tag1
      OR tr.tag02 IS DISTINCT FROM tg.tag2
      OR tr.tag03 IS DISTINCT FROM tg.tag3);
  GET DIAGNOSTICS v_orcado = ROW_COUNT;

  -- transactions_ano_anterior (Ano Anterior)
  UPDATE transactions_ano_anterior AS tr
  SET tag01 = tg.tag1,
      tag02 = tg.tag2,
      tag03 = tg.tag3
  FROM tags tg
  WHERE tr.conta_contabil = tg.cod_conta
    AND tr.conta_contabil IS NOT NULL
    AND (tr.tag01 IS DISTINCT FROM tg.tag1
      OR tr.tag02 IS DISTINCT FROM tg.tag2
      OR tr.tag03 IS DISTINCT FROM tg.tag3);
  GET DIAGNOSTICS v_ant = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', 'ok',
    'real', v_real,
    'orcado', v_orcado,
    'ano_anterior', v_ant,
    'total', v_real + v_orcado + v_ant,
    'executado_em', NOW()
  );
END;
$$;

COMMENT ON FUNCTION backfill_tags_via_conta_contabil() IS 'Backfill de tag01/tag02/tag03 nas 3 tabelas via tags.cod_conta. Roda via pg_cron 01:00 BRT.';

-- ============================================
-- PARTE 3: Agendar pg_cron — 01:00 BRT = 04:00 UTC
-- ============================================
-- EXECUTAR MANUALMENTE NO SUPABASE SQL EDITOR:
-- SELECT cron.schedule(
--   'backfill-tags-conta-contabil',
--   '0 4 * * *',
--   $$SELECT backfill_tags_via_conta_contabil()$$
-- );
