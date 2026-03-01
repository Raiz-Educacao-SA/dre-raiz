-- ============================================
-- Adicionar 'cancelled' ao CHECK constraint de agent_steps.status
-- Executar no Supabase SQL Editor
-- ============================================

ALTER TABLE agent_steps
  DROP CONSTRAINT IF EXISTS agent_steps_status_check;

ALTER TABLE agent_steps
  ADD CONSTRAINT agent_steps_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
