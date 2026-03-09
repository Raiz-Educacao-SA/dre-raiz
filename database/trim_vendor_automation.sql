-- ============================================
-- trim_vendor_automation.sql
-- Remove espaços no início/fim do campo vendor
-- nas 4 tabelas de transactions + trigger para novos registros
--
-- EXECUTAR no Supabase SQL Editor (1 vez)
-- ============================================

-- ══════════════════════════════════════════
-- 1. Limpar espaços existentes (batch)
-- ══════════════════════════════════════════

UPDATE transactions
SET vendor = TRIM(vendor)
WHERE vendor IS NOT NULL AND vendor <> TRIM(vendor);

UPDATE transactions_manual
SET vendor = TRIM(vendor)
WHERE vendor IS NOT NULL AND vendor <> TRIM(vendor);

UPDATE transactions_orcado
SET vendor = TRIM(vendor)
WHERE vendor IS NOT NULL AND vendor <> TRIM(vendor);

UPDATE transactions_ano_anterior
SET vendor = TRIM(vendor)
WHERE vendor IS NOT NULL AND vendor <> TRIM(vendor);

-- ══════════════════════════════════════════
-- 2. Trigger: auto-trim em INSERT/UPDATE
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_trim_vendor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.vendor IS NOT NULL THEN
    NEW.vendor := TRIM(NEW.vendor);
  END IF;
  RETURN NEW;
END;
$$;

-- transactions
DROP TRIGGER IF EXISTS trg_trim_vendor ON transactions;
CREATE TRIGGER trg_trim_vendor
  BEFORE INSERT OR UPDATE OF vendor ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_trim_vendor();

-- transactions_manual
DROP TRIGGER IF EXISTS trg_trim_vendor ON transactions_manual;
CREATE TRIGGER trg_trim_vendor
  BEFORE INSERT OR UPDATE OF vendor ON transactions_manual
  FOR EACH ROW EXECUTE FUNCTION fn_trim_vendor();

-- transactions_orcado
DROP TRIGGER IF EXISTS trg_trim_vendor ON transactions_orcado;
CREATE TRIGGER trg_trim_vendor
  BEFORE INSERT OR UPDATE OF vendor ON transactions_orcado
  FOR EACH ROW EXECUTE FUNCTION fn_trim_vendor();

-- transactions_ano_anterior
DROP TRIGGER IF EXISTS trg_trim_vendor ON transactions_ano_anterior;
CREATE TRIGGER trg_trim_vendor
  BEFORE INSERT OR UPDATE OF vendor ON transactions_ano_anterior
  FOR EACH ROW EXECUTE FUNCTION fn_trim_vendor();

-- ══════════════════════════════════════════
-- 3. Atualizar normalizar_fornecedores para usar TRIM
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION normalizar_fornecedores()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  v_real INT := 0;
  v_orcado INT := 0;
  v_ant INT := 0;
  v_manual INT := 0;
  v_rows INT;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT d.fornecedor_de, d.fornecedor_para
    FROM depara_fornec d
  LOOP
    -- transactions (Real) — match com TRIM para pegar espaços residuais
    UPDATE transactions
    SET vendor = v_row.fornecedor_para
    WHERE TRIM(vendor) = TRIM(v_row.fornecedor_de)
      AND vendor IS DISTINCT FROM v_row.fornecedor_para;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_real := v_real + v_rows;

    -- transactions_manual
    UPDATE transactions_manual
    SET vendor = v_row.fornecedor_para
    WHERE TRIM(vendor) = TRIM(v_row.fornecedor_de)
      AND vendor IS DISTINCT FROM v_row.fornecedor_para;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_manual := v_manual + v_rows;

    -- transactions_orcado
    UPDATE transactions_orcado
    SET vendor = v_row.fornecedor_para
    WHERE TRIM(vendor) = TRIM(v_row.fornecedor_de)
      AND vendor IS DISTINCT FROM v_row.fornecedor_para;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_orcado := v_orcado + v_rows;

    -- transactions_ano_anterior
    UPDATE transactions_ano_anterior
    SET vendor = v_row.fornecedor_para
    WHERE TRIM(vendor) = TRIM(v_row.fornecedor_de)
      AND vendor IS DISTINCT FROM v_row.fornecedor_para;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_ant := v_ant + v_rows;
  END LOOP;

  -- Refresh dre_agg para refletir no drill-down da DRE Gerencial
  IF (v_real + v_manual + v_orcado + v_ant) > 0 THEN
    REFRESH MATERIALIZED VIEW dre_agg;
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'real', v_real,
    'manual', v_manual,
    'orcado', v_orcado,
    'ano_anterior', v_ant,
    'total', v_real + v_manual + v_orcado + v_ant,
    'executado_em', NOW()
  );
END;
$$;

-- ══════════════════════════════════════════
-- 4. Refresh dre_agg agora
-- ══════════════════════════════════════════

REFRESH MATERIALIZED VIEW dre_agg;
