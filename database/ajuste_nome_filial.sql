-- ================================================================
-- ajuste_nome_filial.sql
-- PROCV automatico: popula nome_filial nas 3 tabelas de transactions
-- usando a tabela de referencia "filial" (sync Google Sheets)
--
-- Lookup: transactions.marca = filial.nomemarca
--     AND transactions.filial = filial.filial
--       -> nome_filial = marca || ' - ' || filial.nomefilial
--       Ex: marca='QI', nomefilial='Tijuca' -> nome_filial='QI - Tijuca'
--
-- Triggers:
--   1. Em transactions (INSERT/UPDATE de marca ou filial) -> auto-popula
--   2. Em filial (INSERT/UPDATE/DELETE) -> recalcula todas as transactions
--
-- EXECUTAR no Supabase SQL Editor (1 vez, idempotente)
-- ================================================================

SET statement_timeout = 0;

-- ================================================
-- 1. Limpar TODOS os triggers e funcoes anteriores
-- ================================================

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions;
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_orcado;
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_ano_anterior;
DROP TRIGGER IF EXISTS trg_filial_sync ON filial;

DROP FUNCTION IF EXISTS trg_auto_nome_filial();
DROP FUNCTION IF EXISTS trg_lookup_nome_filial();
DROP FUNCTION IF EXISTS trg_filial_changed();
DROP FUNCTION IF EXISTS fn_lookup_nome_filial(text, text);
DROP FUNCTION IF EXISTS ajuste_nome_filial();

-- ================================================
-- 2. Funcao de lookup unitario
-- ================================================

CREATE OR REPLACE FUNCTION fn_lookup_nome_filial(p_marca text, p_filial text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT p_marca || ' - ' || f.nomefilial
  FROM filial f
  WHERE f.nomemarca = p_marca
    AND f.filial = p_filial
  LIMIT 1;
$$;

-- ================================================
-- 3. Funcao batch: atualiza nome_filial em TODAS as transactions
-- ================================================

CREATE OR REPLACE FUNCTION ajuste_nome_filial()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE transactions t
  SET nome_filial = t.marca || ' - ' || f.nomefilial
  FROM filial f
  WHERE f.nomemarca = t.marca
    AND f.filial = t.filial
    AND t.nome_filial IS DISTINCT FROM (t.marca || ' - ' || f.nomefilial);

  UPDATE transactions_orcado t
  SET nome_filial = t.marca || ' - ' || f.nomefilial
  FROM filial f
  WHERE f.nomemarca = t.marca
    AND f.filial = t.filial
    AND t.nome_filial IS DISTINCT FROM (t.marca || ' - ' || f.nomefilial);

  UPDATE transactions_ano_anterior t
  SET nome_filial = t.marca || ' - ' || f.nomefilial
  FROM filial f
  WHERE f.nomemarca = t.marca
    AND f.filial = t.filial
    AND t.nome_filial IS DISTINCT FROM (t.marca || ' - ' || f.nomefilial);

  UPDATE transactions_manual t
  SET nome_filial = t.marca || ' - ' || f.nomefilial
  FROM filial f
  WHERE f.nomemarca = t.marca
    AND f.filial = t.filial
    AND t.nome_filial IS DISTINCT FROM (t.marca || ' - ' || f.nomefilial);

  REFRESH MATERIALIZED VIEW dre_agg;
END;
$$;

-- ================================================
-- 4. Trigger: auto-popula em INSERT/UPDATE de transactions
-- ================================================

CREATE OR REPLACE FUNCTION trg_lookup_nome_filial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NEW.marca IS NOT NULL AND NEW.filial IS NOT NULL THEN
    SELECT NEW.marca || ' - ' || f.nomefilial INTO v_nome
    FROM filial f
    WHERE f.nomemarca = NEW.marca
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

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_manual;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_manual
  FOR EACH ROW EXECUTE FUNCTION trg_lookup_nome_filial();

-- ================================================
-- 5. Trigger: quando tabela filial muda, recalcula tudo
-- ================================================

CREATE OR REPLACE FUNCTION trg_filial_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM ajuste_nome_filial();
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_filial_sync
  AFTER INSERT OR UPDATE OR DELETE ON filial
  FOR EACH STATEMENT EXECUTE FUNCTION trg_filial_changed();

-- ================================================
-- 6. Executar agora
-- ================================================

SELECT ajuste_nome_filial();

-- Verificacao
SELECT 'transactions' AS tabela, count(*) AS sem_nome_filial
FROM transactions WHERE nome_filial IS NULL AND marca IS NOT NULL AND filial IS NOT NULL
UNION ALL
SELECT 'transactions_orcado', count(*)
FROM transactions_orcado WHERE nome_filial IS NULL AND marca IS NOT NULL AND filial IS NOT NULL
UNION ALL
SELECT 'transactions_ano_anterior', count(*)
FROM transactions_ano_anterior WHERE nome_filial IS NULL AND marca IS NOT NULL AND filial IS NOT NULL;

RESET statement_timeout;
