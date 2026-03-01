-- ============================================
-- Equipe Alpha v3 — Adiciona Diretor (Step 8) e CEO (Step 9)
-- Executive Committee Reviewer + Executive Challenger
-- ============================================

-- 0. Expandir CHECK constraint para incluir 'review'
ALTER TABLE team_agents DROP CONSTRAINT IF EXISTS team_agents_step_type_check;
ALTER TABLE team_agents ADD CONSTRAINT team_agents_step_type_check
  CHECK (step_type IN ('plan', 'execute', 'consolidate', 'review'));

ALTER TABLE agent_steps DROP CONSTRAINT IF EXISTS agent_steps_step_type_check;
ALTER TABLE agent_steps ADD CONSTRAINT agent_steps_step_type_check
  CHECK (step_type IN ('plan', 'execute', 'consolidate', 'review'));

-- 1. Inserir agente Diretor
INSERT INTO agents (code, name, role, description, avatar_color) VALUES
  ('diretor', 'Diretor', 'Executive Committee Reviewer',
   'Camada executiva intermediária. Revisa clareza, ownership, prazos, governança e prontidão do material antes do desafio final do CEO.',
   '#475569')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  avatar_color = EXCLUDED.avatar_color;

-- 2. Inserir agente CEO
INSERT INTO agents (code, name, role, description, avatar_color) VALUES
  ('ceo', 'CEO', 'Executive Challenger & Decision Readiness Reviewer',
   'Revisor executivo final. Simula as perguntas críticas do CEO, testa a robustez do material, identifica fragilidades, prepara respostas defensáveis e avalia prontidão para reunião.',
   '#1e293b')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  avatar_color = EXCLUDED.avatar_color;

-- 3. Remover steps antigos de CEO (caso já exista no step 8)
DELETE FROM team_agents
WHERE team_id = (SELECT id FROM teams WHERE name = 'Alpha')
  AND agent_id = (SELECT id FROM agents WHERE code = 'ceo');

-- 4. Adicionar step 8 (Diretor review) ao pipeline Alpha
INSERT INTO team_agents (team_id, agent_id, step_order, step_type)
SELECT t.id, a.id, 8, 'review'
FROM teams t
JOIN agents a ON a.code = 'diretor'
WHERE t.name = 'Alpha'
ON CONFLICT DO NOTHING;

-- 5. Adicionar step 9 (CEO review) ao pipeline Alpha
INSERT INTO team_agents (team_id, agent_id, step_order, step_type)
SELECT t.id, a.id, 9, 'review'
FROM teams t
JOIN agents a ON a.code = 'ceo'
WHERE t.name = 'Alpha'
ON CONFLICT DO NOTHING;

-- 6. Atualizar descrição do time Alpha
UPDATE teams SET
  description = 'Equipe Alpha v3 — 8 agentes, 9 steps: Alex (plan) → Bruna (data quality) → Carlos (performance) → Denilson (optimization) → Edmundo (forecast) → Falcão (risk) → Alex (consolidation + board presentation) → Diretor (executive committee review) → CEO (executive challenge & decision readiness).'
WHERE name = 'Alpha';

-- ============================================
-- Verificação
-- ============================================

-- Deve retornar 8 agentes (incluindo Diretor e CEO)
-- SELECT code, name, role FROM agents WHERE is_active = true ORDER BY code;

-- Deve retornar 9 steps
-- SELECT ta.step_order, a.code, a.name, ta.step_type
-- FROM team_agents ta
-- JOIN agents a ON a.id = ta.agent_id
-- JOIN teams t ON t.id = ta.team_id
-- WHERE t.name = 'Alpha'
-- ORDER BY ta.step_order;
