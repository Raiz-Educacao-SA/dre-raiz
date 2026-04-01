-- Script para criar dados de teste no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe (deve retornar 1 linha)
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'transactions';

-- 2. Inserir dados de teste
INSERT INTO transactions (date, description, conta_contabil, amount, type, scenario, status, marca, filial, tag0, tag01, vendor, ticket)
VALUES
  -- Janeiro 2026 - Receitas
  ('2026-01-05', 'Mensalidades Janeiro - Ensino Fundamental', '4.1.001', 250000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Mensalidades', 'ALUNOS', 'REC-001'),
  ('2026-01-05', 'Mensalidades Janeiro - Ensino Médio', '4.1.002', 180000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Mensalidades', 'ALUNOS', 'REC-002'),
  ('2026-01-10', 'Material Didático', '4.1.003', 35000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Material', 'ALUNOS', 'REC-003'),

  -- Janeiro 2026 - Custos
  ('2026-01-15', 'Salários Professores', '3.1.001', -120000, 'COST', 'REAL', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'Pessoal', 'RH', 'CST-001'),
  ('2026-01-15', 'Material de Ensino', '3.1.002', -25000, 'COST', 'REAL', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'Material', 'FORNECEDOR_A', 'CST-002'),

  -- Janeiro 2026 - Despesas
  ('2026-01-20', 'Salários Administrativos', '3.2.001', -45000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Pessoal', 'RH', 'DSP-001'),
  ('2026-01-20', 'Marketing Digital', '3.2.002', -15000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Marketing', 'AGENCIA_X', 'DSP-002'),
  ('2026-01-25', 'Aluguel', '3.2.003', -35000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Infraestrutura', 'IMOBILIARIA_Y', 'DSP-003'),
  ('2026-01-25', 'Energia Elétrica', '3.2.004', -8000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Infraestrutura', 'CONCESSIONARIA', 'DSP-004'),
  ('2026-01-25', 'Internet e Telefonia', '3.2.005', -3000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Infraestrutura', 'TELECOM_Z', 'DSP-005'),

  -- Fevereiro 2026 - Receitas
  ('2026-02-05', 'Mensalidades Fevereiro - Ensino Fundamental', '4.1.001', 255000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Mensalidades', 'ALUNOS', 'REC-004'),
  ('2026-02-05', 'Mensalidades Fevereiro - Ensino Médio', '4.1.002', 185000, 'REVENUE', 'REAL', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Mensalidades', 'ALUNOS', 'REC-005'),

  -- Fevereiro 2026 - Custos
  ('2026-02-15', 'Salários Professores', '3.1.001', -122000, 'COST', 'REAL', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'Pessoal', 'RH', 'CST-003'),
  ('2026-02-15', 'Material de Ensino', '3.1.002', -23000, 'COST', 'REAL', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'Material', 'FORNECEDOR_A', 'CST-004'),

  -- Fevereiro 2026 - Despesas
  ('2026-02-20', 'Salários Administrativos', '3.2.001', -45000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Pessoal', 'RH', 'DSP-006'),
  ('2026-02-20', 'Marketing Digital', '3.2.002', -18000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Marketing', 'AGENCIA_X', 'DSP-007'),
  ('2026-02-25', 'Aluguel', '3.2.003', -35000, 'EXPENSE', 'REAL', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Infraestrutura', 'IMOBILIARIA_Y', 'DSP-008'),

  -- Dados de BUDGET para comparação
  ('2026-01-01', 'Budget Receitas Janeiro', '4.1.001', 500000, 'REVENUE', 'BUDGET', 'active', 'RAIZ', 'SP01', 'RECEITAS', 'Budget', 'PLANEJAMENTO', 'BGT-001'),
  ('2026-01-01', 'Budget Custos Janeiro', '3.1.001', -150000, 'COST', 'BUDGET', 'active', 'RAIZ', 'SP01', 'CUSTOS', 'Budget', 'PLANEJAMENTO', 'BGT-002'),
  ('2026-01-01', 'Budget Despesas Janeiro', '3.2.001', -100000, 'EXPENSE', 'BUDGET', 'active', 'RAIZ', 'SP01', 'DESPESAS', 'Budget', 'PLANEJAMENTO', 'BGT-003');

-- 3. Verificar se os dados foram inseridos
SELECT COUNT(*) as total_registros FROM transactions;

-- 4. Ver resumo dos dados por tipo
SELECT
  type,
  scenario,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
GROUP BY type, scenario
ORDER BY type, scenario;

-- 5. Ver dados por mês
SELECT
  DATE_TRUNC('month', date) as mes,
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE scenario = 'REAL'
GROUP BY DATE_TRUNC('month', date), type
ORDER BY mes, type;
