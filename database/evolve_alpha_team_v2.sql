-- ============================================
-- Equipe Alpha v2 — Expansão para 6 agentes (7 steps)
-- Execute no Supabase SQL Editor
-- IDEMPOTENTE: pode ser executado múltiplas vezes sem efeito duplicado
-- ============================================

-- 1. Inserir novos agentes (Denilson, Edmundo, Falcão)
-- Alex, Bruna e Carlos já existem

INSERT INTO agents (code, name, role, description, avatar_color) VALUES
  ('denilson', 'Denilson', 'Optimization Architect',
   'Encontra a melhor combinação de ações para maximizar resultado respeitando restrições operacionais e estratégicas.',
   '#10b981'),
  ('edmundo',  'Edmundo',  'Forecast & Adaptive Intelligence',
   'Projeta tendências futuras, mede erro histórico e apoia evolução adaptativa do modelo.',
   '#6366f1'),
  ('falcao',   'Falcão',   'Risk & Strategic Oversight',
   'Monitora risco estrutural, macroeconômico, de execução e de portfólio. Pressiona prudência decisória.',
   '#ef4444')
ON CONFLICT (code) DO UPDATE SET
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  avatar_color = EXCLUDED.avatar_color;

-- 2. Atualizar descriptions dos agentes existentes (enriquecidas)

UPDATE agents SET
  role = 'Strategic Supervisor & Executive Consolidator',
  description = 'Planeja a análise, coordena a cadeia decisória, resolve conflitos entre agentes e consolida a recomendação executiva final com Board Presentation.'
WHERE code = 'alex';

UPDATE agents SET
  role = 'Data Quality Specialist',
  description = 'Garante integridade, consistência, padronização e confiabilidade dos dados que sustentam a decisão. Pode bloquear pipeline.'
WHERE code = 'bruna';

UPDATE agents SET
  role = 'Performance Analyst',
  description = 'Executa análise profunda de performance financeira: Real vs Orçado vs A-1, identificando drivers e desvios relevantes.'
WHERE code = 'carlos';

-- 3. Remover pipeline antigo do Alpha (4 steps → 7 steps)

DELETE FROM team_agents
WHERE team_id = (SELECT id FROM teams WHERE name = 'Alpha');

-- 4. Inserir novo pipeline Alpha com 7 steps

INSERT INTO team_agents (team_id, agent_id, step_order, step_type)
SELECT t.id, a.id, v.step_order, v.step_type
FROM (VALUES
  ('alex',     1, 'plan'),
  ('bruna',    2, 'execute'),
  ('carlos',   3, 'execute'),
  ('denilson', 4, 'execute'),
  ('edmundo',  5, 'execute'),
  ('falcao',   6, 'execute'),
  ('alex',     7, 'consolidate')
) AS v(agent_code, step_order, step_type)
JOIN teams t ON t.name = 'Alpha'
JOIN agents a ON a.code = v.agent_code
ON CONFLICT DO NOTHING;

-- 5. Atualizar descrição do time Alpha

UPDATE teams SET
  description = 'Equipe Alpha v2 — 6 agentes, 7 steps: Alex (plan) → Bruna (data quality) → Carlos (performance) → Denilson (optimization) → Edmundo (forecast) → Falcão (risk) → Alex (consolidation + board presentation).'
WHERE name = 'Alpha';

-- ============================================
-- Verificação
-- ============================================

-- Deve retornar 6 agentes
-- SELECT code, name, role FROM agents WHERE is_active = true ORDER BY code;

-- Deve retornar 7 steps
-- SELECT ta.step_order, a.code, a.name, ta.step_type
-- FROM team_agents ta
-- JOIN agents a ON a.id = ta.agent_id
-- JOIN teams t ON t.id = ta.team_id
-- WHERE t.name = 'Alpha'
-- ORDER BY ta.step_order;
