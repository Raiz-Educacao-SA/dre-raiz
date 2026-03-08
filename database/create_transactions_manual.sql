-- ═══════════════════════════════════════════════════════════════════
-- create_transactions_manual.sql
-- Tabela para lançamentos manuais (importação via Admin).
-- Mesma estrutura da transactions, mas NÃO é afetada pela conciliação
-- bancária que deleta registros de transactions.
--
-- Script AUTOSSUFICIENTE: cria funções de trigger se não existirem.
--
-- EXECUTAR no Supabase SQL Editor (PASSO 1)
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════
-- 0. Garantir que as funções de trigger existam
--    (CREATE OR REPLACE = idempotente, não quebra nada se já existem)
-- ══════════════════════════════════

-- 0a. fn_auto_populate_tag0: popula tag0 via tag0_map ao inserir/atualizar tag01
CREATE OR REPLACE FUNCTION fn_auto_populate_tag0()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tag0 := (
    SELECT tm.tag0
    FROM tag0_map tm
    WHERE LOWER(TRIM(tm.tag1_norm)) = LOWER(TRIM(NEW.tag01))
    LIMIT 1
  );
  RETURN NEW;
END;
$$;

-- 0b. trg_lookup_nome_filial: PROCV na tabela filial (marca + filial → nomefilial)
-- Ex: SAP + BAR → 'SAP - Barra da Tijuca'
CREATE OR REPLACE FUNCTION trg_lookup_nome_filial()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

-- 0c. fn_auto_populate_tags_from_conta: popula tag01/tag02/tag03 + tag0 via tabela tags
CREATE OR REPLACE FUNCTION fn_auto_populate_tags_from_conta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.conta_contabil IS NOT NULL AND NEW.conta_contabil <> '' THEN
    SELECT tg.tag1, tg.tag2, tg.tag3
    INTO NEW.tag01, NEW.tag02, NEW.tag03
    FROM tags tg
    WHERE tg.cod_conta = NEW.conta_contabil
    LIMIT 1;

    -- Também popular tag0 via tag0_map (evita problema de ordem de triggers)
    IF NEW.tag01 IS NOT NULL THEN
      NEW.tag0 := (
        SELECT tm.tag0
        FROM tag0_map tm
        WHERE LOWER(TRIM(tm.tag1_norm)) = LOWER(TRIM(NEW.tag01))
        LIMIT 1
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ══════════════════════════════════
-- 1. Criar tabela com mesma estrutura de transactions
-- ══════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions_manual (
  id              text PRIMARY KEY,
  date            text,
  description     text,
  conta_contabil  text,
  category        text,
  amount          numeric,
  type            text,
  scenario        text DEFAULT 'Real',
  status          text DEFAULT 'Manual',
  filial          text,
  marca           text,
  tag0            text,
  tag01           text,
  tag02           text,
  tag03           text,
  recurring       text,
  ticket          text,
  vendor          text,
  nat_orc         text,
  chave_id        text,
  nome_filial     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. Índices (mesmos da transactions para manter performance nos UNIONs)
CREATE INDEX IF NOT EXISTS idx_tm_date ON transactions_manual (date);
CREATE INDEX IF NOT EXISTS idx_tm_scenario ON transactions_manual (scenario);
CREATE INDEX IF NOT EXISTS idx_tm_marca ON transactions_manual (marca);
CREATE INDEX IF NOT EXISTS idx_tm_nome_filial ON transactions_manual (nome_filial);
CREATE INDEX IF NOT EXISTS idx_tm_tag0 ON transactions_manual (tag0);
CREATE INDEX IF NOT EXISTS idx_tm_tag01 ON transactions_manual (tag01);
CREATE INDEX IF NOT EXISTS idx_tm_tag02 ON transactions_manual (tag02);
CREATE INDEX IF NOT EXISTS idx_tm_tag03 ON transactions_manual (tag03);
CREATE INDEX IF NOT EXISTS idx_tm_recurring ON transactions_manual (recurring);
CREATE INDEX IF NOT EXISTS idx_tm_chave_id ON transactions_manual (chave_id);
CREATE INDEX IF NOT EXISTS idx_tm_conta_contabil ON transactions_manual (conta_contabil);

-- ══════════════════════════════════
-- 3. Triggers (reusam as funções criadas acima)
-- ══════════════════════════════════

-- 3a. tag0 via tag0_map
DROP TRIGGER IF EXISTS trg_auto_tag0_manual ON transactions_manual;
CREATE TRIGGER trg_auto_tag0_manual
  BEFORE INSERT OR UPDATE OF tag01 ON transactions_manual
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_populate_tag0();

-- 3b. nome_filial via PROCV tabela filial (marca + filial → nomefilial)
DROP TRIGGER IF EXISTS trg_set_nome_filial ON transactions_manual;
CREATE TRIGGER trg_set_nome_filial
  BEFORE INSERT OR UPDATE OF marca, filial ON transactions_manual
  FOR EACH ROW
  EXECUTE FUNCTION trg_lookup_nome_filial();

-- 3c. tag01/tag02/tag03 via conta_contabil (tabela tags)
DROP TRIGGER IF EXISTS trg_auto_tags_from_conta ON transactions_manual;
CREATE TRIGGER trg_auto_tags_from_conta
  BEFORE INSERT OR UPDATE OF conta_contabil ON transactions_manual
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_populate_tags_from_conta();

-- ══════════════════════════════════
-- 4. RLS — mesma política da transactions (auth.email)
-- ══════════════════════════════════

ALTER TABLE transactions_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read transactions_manual"
  ON transactions_manual FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert transactions_manual"
  ON transactions_manual FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update transactions_manual"
  ON transactions_manual FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete transactions_manual"
  ON transactions_manual FOR DELETE
  TO authenticated
  USING (true);

-- 5. Grants
GRANT SELECT ON transactions_manual TO anon;
GRANT SELECT ON transactions_manual TO authenticated;
GRANT INSERT ON transactions_manual TO authenticated;
GRANT UPDATE ON transactions_manual TO authenticated;
GRANT DELETE ON transactions_manual TO authenticated;
