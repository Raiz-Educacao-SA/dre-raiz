-- ================================================================
-- sync_filial_procv.sql
-- PROCV automatico: popula nome_filial nas 3 tabelas de transactions
-- usando a tabela de referencia "filial" (sync Google Sheets)
--
-- Lookup: filial.cia = transactions.marca
--     AND filial.filial = transactions.filial
--       -> transactions.nome_filial = filial.nome_filial
--
-- Triggers:
--   1. Em transactions (INSERT/UPDATE de marca ou filial) -> auto-popula
--   2. Em filial (via sync_filial RPC do Google Sheets) -> recalcula batch
--
-- EXECUTAR no Supabase SQL Editor (1 vez, idempotente)
-- ================================================================

SET statement_timeout = 0;

-- ================================================
-- 1. Limpar triggers e funcoes anteriores
-- ================================================

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions;
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_orcado;
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_ano_anterior;
DROP FUNCTION IF EXISTS trg_lookup_nome_filial();

-- ================================================
-- 2. Trigger unitario: auto-popula nome_filial em INSERT/UPDATE
-- ================================================

CREATE OR REPLACE FUNCTION trg_lookup_nome_filial()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_nome text;
BEGIN
  IF NEW.marca IS NOT NULL AND NEW.filial IS NOT NULL THEN
    SELECT f.nome_filial INTO v_nome
    FROM filial f
    WHERE f.cia = NEW.marca
      AND f.filial = NEW.filial
    LIMIT 1;

    IF v_nome IS NOT NULL THEN
      NEW.nome_filial := v_nome;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions
  FOR EACH ROW EXECUTE FUNCTION trg_lookup_nome_filial();

CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_orcado
  FOR EACH ROW EXECUTE FUNCTION trg_lookup_nome_filial();

CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_ano_anterior
  FOR EACH ROW EXECUTE FUNCTION trg_lookup_nome_filial();

-- ================================================
-- 3. Funcao sync_filial (chamada pelo Google Sheets via RPC)
-- ================================================

CREATE OR REPLACE FUNCTION sync_filial(dados jsonb)
RETURNS void AS $$
BEGIN
  ALTER TABLE filial DISABLE TRIGGER ALL;

  TRUNCATE filial;
  INSERT INTO filial (codcoligada, codfilial, chave_coligadafilial, cia, nomemarca, nomefilial, filial, nome_filial)
  SELECT
    x->>'codcoligada',
    x->>'codfilial',
    x->>'chave_coligadafilial',
    x->>'cia',
    x->>'nomemarca',
    x->>'nomefilial',
    x->>'filial',
    x->>'nome_filial'
  FROM jsonb_array_elements(dados) x;

  ALTER TABLE filial ENABLE TRIGGER ALL;

  -- PROCV batch nas 3 tabelas
  UPDATE transactions t
  SET nome_filial = f.nome_filial
  FROM filial f
  WHERE f.filial = t.filial AND f.cia = t.marca
    AND t.nome_filial IS DISTINCT FROM f.nome_filial;

  UPDATE transactions_orcado t
  SET nome_filial = f.nome_filial
  FROM filial f
  WHERE f.filial = t.filial AND f.cia = t.marca
    AND t.nome_filial IS DISTINCT FROM f.nome_filial;

  UPDATE transactions_ano_anterior t
  SET nome_filial = f.nome_filial
  FROM filial f
  WHERE f.filial = t.filial AND f.cia = t.marca
    AND t.nome_filial IS DISTINCT FROM f.nome_filial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '300s';

RESET statement_timeout;
