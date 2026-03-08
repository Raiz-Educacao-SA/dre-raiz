-- ================================================================
-- fix_nome_filial.sql
-- Garante que nome_filial esteja sempre populado em todas as tabelas
-- nome_filial = marca || ' - ' || filial (chave unica por marca)
--
-- Problema: filial pode se repetir entre marcas (ex: BOT em CGS e PHYTUS)
-- nome_filial e unico pois concatena marca+filial
--
-- EXECUTAR no Supabase SQL Editor
-- ================================================================

SET statement_timeout = 0;

-- 1. Corrigir registros com nome_filial null nas 3 tabelas
UPDATE transactions
SET nome_filial = marca || ' - ' || filial
WHERE nome_filial IS NULL
  AND marca IS NOT NULL
  AND filial IS NOT NULL;

UPDATE transactions_orcado
SET nome_filial = marca || ' - ' || filial
WHERE nome_filial IS NULL
  AND marca IS NOT NULL
  AND filial IS NOT NULL;

UPDATE transactions_ano_anterior
SET nome_filial = marca || ' - ' || filial
WHERE nome_filial IS NULL
  AND marca IS NOT NULL
  AND filial IS NOT NULL;

-- 2. Corrigir registros onde nome_filial nao corresponde a marca+filial
-- (ex: nome_filial = 'BOT' ao inves de 'CGS - BOT')
UPDATE transactions
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS NOT NULL
  AND nome_filial NOT LIKE '%' || ' - ' || '%';

UPDATE transactions_orcado
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS NOT NULL
  AND nome_filial NOT LIKE '%' || ' - ' || '%';

UPDATE transactions_ano_anterior
SET nome_filial = marca || ' - ' || filial
WHERE marca IS NOT NULL
  AND filial IS NOT NULL
  AND nome_filial IS NOT NULL
  AND nome_filial NOT LIKE '%' || ' - ' || '%';

-- 3. Trigger para auto-popular nome_filial em INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_auto_nome_filial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.marca IS NOT NULL AND NEW.filial IS NOT NULL THEN
    NEW.nome_filial := NEW.marca || ' - ' || NEW.filial;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger nas 3 tabelas
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions
  FOR EACH ROW EXECUTE FUNCTION trg_auto_nome_filial();

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_orcado;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_orcado
  FOR EACH ROW EXECUTE FUNCTION trg_auto_nome_filial();

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_ano_anterior;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_ano_anterior
  FOR EACH ROW EXECUTE FUNCTION trg_auto_nome_filial();

DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_manual;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_manual
  FOR EACH ROW EXECUTE FUNCTION trg_auto_nome_filial();

-- 4. Refresh dre_agg para refletir as correcoes
REFRESH MATERIALIZED VIEW dre_agg;

RESET statement_timeout;
