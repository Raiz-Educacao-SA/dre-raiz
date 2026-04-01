-- ============================================================
-- FUNÇÃO: normalizar_conta_contabil()
-- Propósito: Aplica o De-Para de Conta Contábil em todas as
--            tabelas de transações, igual à lógica do
--            normalizar_fornecedores() para o campo vendor.
-- Execução: Manual via botão no Admin ou automática via pg_cron
-- ============================================================

CREATE OR REPLACE FUNCTION normalizar_conta_contabil()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  v_real        INT := 0;
  v_orcado      INT := 0;
  v_ant         INT := 0;
  v_manual      INT := 0;
  v_rows        INT;
  v_row         RECORD;
BEGIN
  -- Loop por cada mapeamento cadastrado em depara_conta_contabil
  FOR v_row IN
    SELECT conta_de, conta_para
    FROM depara_conta_contabil
    WHERE conta_de IS NOT NULL
      AND conta_para IS NOT NULL
      AND conta_de <> conta_para   -- ignora mapeamentos idênticos (sem-op)
  LOOP
    -- Atualiza transactions (Real)
    UPDATE transactions
    SET conta_contabil = v_row.conta_para
    WHERE conta_contabil = v_row.conta_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_real := v_real + v_rows;

    -- Atualiza transactions_orcado (Orçado)
    UPDATE transactions_orcado
    SET conta_contabil = v_row.conta_para
    WHERE conta_contabil = v_row.conta_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_orcado := v_orcado + v_rows;

    -- Atualiza transactions_ano_anterior (Ano Anterior)
    UPDATE transactions_ano_anterior
    SET conta_contabil = v_row.conta_para
    WHERE conta_contabil = v_row.conta_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_ant := v_ant + v_rows;

    -- Atualiza transactions_manual (lançamentos manuais)
    UPDATE transactions_manual
    SET conta_contabil = v_row.conta_para
    WHERE conta_contabil = v_row.conta_de;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_manual := v_manual + v_rows;

  END LOOP;

  -- Refresh da view materializada apenas se houve mudanças
  IF (v_real + v_orcado + v_ant + v_manual) > 0 THEN
    SET statement_timeout = 0;
    REFRESH MATERIALIZED VIEW dre_agg;
  END IF;

  RETURN jsonb_build_object(
    'status',        'ok',
    'real',          v_real,
    'orcado',        v_orcado,
    'ano_anterior',  v_ant,
    'manual',        v_manual,
    'total',         v_real + v_orcado + v_ant + v_manual,
    'executado_em',  NOW()
  );
END;
$$;

-- Permissão: apenas usuários autenticados podem chamar via RPC
GRANT EXECUTE ON FUNCTION normalizar_conta_contabil() TO authenticated;

-- ============================================================
-- AGENDAMENTO AUTOMÁTICO (pg_cron)
-- Roda todo dia às 03:30 UTC (00:30 BRT), 30 min após o
-- normalizar_fornecedores() para evitar conflito de locks.
-- ============================================================
-- Executar UMA VEZ no Supabase SQL Editor para ativar:
--
-- SELECT cron.schedule(
--   'normalizar-conta-contabil',
--   '30 3 * * *',
--   $$SELECT normalizar_conta_contabil()$$
-- );
