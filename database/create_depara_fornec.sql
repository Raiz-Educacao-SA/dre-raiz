-- ============================================
-- Tabela: depara_fornec
-- De-Para para normalização de nomes de fornecedores
-- ============================================

CREATE TABLE IF NOT EXISTS depara_fornec (
  fornecedor_de TEXT PRIMARY KEY,
  fornecedor_para TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE depara_fornec IS 'De-Para para normalização de nomes de fornecedores em transactions';
COMMENT ON COLUMN depara_fornec.fornecedor_de IS 'Nome original do fornecedor (como vem na importação)';
COMMENT ON COLUMN depara_fornec.fornecedor_para IS 'Nome normalizado do fornecedor (como deve aparecer)';

-- RLS
ALTER TABLE depara_fornec ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depara_fornec_select" ON depara_fornec
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "depara_fornec_insert_admin" ON depara_fornec
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "depara_fornec_update_admin" ON depara_fornec
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "depara_fornec_delete_admin" ON depara_fornec
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_depara_fornec_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_depara_fornec_updated_at
  BEFORE UPDATE ON depara_fornec
  FOR EACH ROW
  EXECUTE FUNCTION update_depara_fornec_updated_at();

-- ============================================
-- Função: normalizar_fornecedores()
-- Aplica o de-para em transactions (real, orçado, ano anterior)
-- Roda via pg_cron todo dia à meia-noite
-- ============================================

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
  v_rows INT;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT d.fornecedor_de, d.fornecedor_para
    FROM depara_fornec d
  LOOP
    -- transactions (Real)
    UPDATE transactions
    SET vendor = v_row.fornecedor_para
    WHERE vendor = v_row.fornecedor_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_real := v_real + v_rows;

    -- transactions_orcado (Orçado)
    UPDATE transactions_orcado
    SET vendor = v_row.fornecedor_para
    WHERE vendor = v_row.fornecedor_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_orcado := v_orcado + v_rows;

    -- transactions_ano_anterior (Ano Anterior)
    UPDATE transactions_ano_anterior
    SET vendor = v_row.fornecedor_para
    WHERE vendor = v_row.fornecedor_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_ant := v_ant + v_rows;
  END LOOP;

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

COMMENT ON FUNCTION normalizar_fornecedores() IS 'Aplica de-para de fornecedores em transactions, transactions_orcado e transactions_ano_anterior. Roda via pg_cron.';

-- ============================================
-- Agendar pg_cron: todo dia à meia-noite (00:00 BRT = 03:00 UTC)
-- ============================================
-- EXECUTAR MANUALMENTE NO SUPABASE SQL EDITOR:
-- SELECT cron.schedule(
--   'normalizar-fornecedores',
--   '0 3 * * *',
--   $$SELECT normalizar_fornecedores()$$
-- );
