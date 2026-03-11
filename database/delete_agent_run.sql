-- RPC para deletar agent_run (bypassa RLS via SECURITY DEFINER)
-- Aceita TEXT para evitar problemas de cast no PostgREST
DROP FUNCTION IF EXISTS delete_agent_run(UUID);
DROP FUNCTION IF EXISTS delete_agent_run(TEXT);

CREATE OR REPLACE FUNCTION delete_agent_run(p_run_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem deletar análises';
  END IF;

  -- Steps são deletados via CASCADE (FK run_id REFERENCES agent_runs ON DELETE CASCADE)
  DELETE FROM agent_runs WHERE id = p_run_id::UUID;
END;
$$;
