-- ============================================================
-- FUNÇÕES PARA CONTROLAR O TRIGGER DE SINCRONIZAÇÃO
-- ============================================================
-- Data: 2026-02-04
-- Objetivo: Permitir desabilitar/habilitar o trigger via Python
-- ============================================================

-- ============================================================
-- FUNÇÃO 1: DESABILITAR TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION desabilitar_trigger_sincronizacao()
RETURNS JSON AS $$
BEGIN
  -- Desabilitar o trigger
  EXECUTE 'ALTER TABLE dre_fabric DISABLE TRIGGER trigger_sincronizacao_automatica';

  RETURN json_build_object(
    'success', true,
    'message', 'Trigger desabilitado com sucesso',
    'timestamp', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Erro ao desabilitar trigger: ' || SQLERRM,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION desabilitar_trigger_sincronizacao() IS
  'Desabilita o trigger de sincronização automática na tabela dre_fabric';

-- ============================================================
-- FUNÇÃO 2: HABILITAR TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION habilitar_trigger_sincronizacao()
RETURNS JSON AS $$
BEGIN
  -- Habilitar o trigger
  EXECUTE 'ALTER TABLE dre_fabric ENABLE TRIGGER trigger_sincronizacao_automatica';

  RETURN json_build_object(
    'success', true,
    'message', 'Trigger habilitado com sucesso',
    'timestamp', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Erro ao habilitar trigger: ' || SQLERRM,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION habilitar_trigger_sincronizacao() IS
  'Habilita o trigger de sincronização automática na tabela dre_fabric';

-- ============================================================
-- FUNÇÃO 3: VERIFICAR STATUS DO TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION verificar_status_trigger()
RETURNS JSON AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Verificar se o trigger está habilitado
  SELECT tgenabled::TEXT
  INTO v_status
  FROM pg_trigger
  WHERE tgname = 'trigger_sincronizacao_automatica'
    AND tgrelid = 'dre_fabric'::regclass;

  RETURN json_build_object(
    'trigger_name', 'trigger_sincronizacao_automatica',
    'table_name', 'dre_fabric',
    'status', CASE
      WHEN v_status = 'O' THEN 'HABILITADO'
      WHEN v_status = 'D' THEN 'DESABILITADO'
      ELSE 'DESCONHECIDO'
    END,
    'status_code', v_status,
    'timestamp', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', true,
    'message', 'Erro ao verificar status: ' || SQLERRM,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_status_trigger() IS
  'Verifica se o trigger de sincronização está habilitado ou desabilitado';

-- ============================================================
-- TESTE DAS FUNÇÕES
-- ============================================================

-- Para testar, execute:
-- SELECT * FROM verificar_status_trigger();
-- SELECT * FROM desabilitar_trigger_sincronizacao();
-- SELECT * FROM verificar_status_trigger();
-- SELECT * FROM habilitar_trigger_sincronizacao();
-- SELECT * FROM verificar_status_trigger();

-- ============================================================
-- GRANT PERMISSIONS (se necessário)
-- ============================================================

-- Garantir que as funções possam ser executadas via service_role
GRANT EXECUTE ON FUNCTION desabilitar_trigger_sincronizacao() TO service_role;
GRANT EXECUTE ON FUNCTION habilitar_trigger_sincronizacao() TO service_role;
GRANT EXECUTE ON FUNCTION verificar_status_trigger() TO service_role;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
