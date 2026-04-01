-- ════════════════════════════════════════════════════════════════
-- MAPEAR TODAS AS TAG01 PARA TAG0 (ESTRUTURA DRE COMPLETA)
-- ════════════════════════════════════════════════════════════════

-- 🔍 DIAGNÓSTICO: Ver todas as tag01 que existem no banco
SELECT
  tag01,
  COUNT(*) as total_registros,
  SUM(amount) as total_valor
FROM transactions
WHERE tag01 IS NOT NULL
GROUP BY tag01
ORDER BY COUNT(*) DESC;

-- 🔍 VER QUAIS TAG01 JÁ ESTÃO MAPEADAS
SELECT
  t.tag01,
  m.tag0,
  COUNT(*) as registros,
  CASE WHEN m.tag0 IS NULL THEN '❌ NÃO MAPEADO' ELSE '✅ MAPEADO' END as status
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE t.tag01 IS NOT NULL
GROUP BY t.tag01, m.tag0
ORDER BY COUNT(*) DESC;

-- ════════════════════════════════════════════════════════════════
-- INSERIR MAPEAMENTOS COMPLETOS (baseado na estrutura DRE)
-- ════════════════════════════════════════════════════════════════

-- 🟢 RECEITA LÍQUIDA
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('tributos', 'Tributos', 'Receita Líquida'),
  ('devoluções & cancelamentos', 'Devoluções & Cancelamentos', 'Receita Líquida'),
  ('integral', 'Integral', 'Receita Líquida'),
  ('material didático', 'Material Didático', 'Receita Líquida'),
  ('receita de mensalidade', 'Receita De Mensalidade', 'Receita Líquida'),
  ('receitas não operacionais', 'Receitas Não Operacionais', 'Receita Líquida'),
  ('receitas extras', 'Receitas Extras', 'Receita Líquida')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🔵 CUSTOS VARIÁVEIS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('pessoal docente', 'Pessoal Docente', 'Custos Variáveis'),
  ('insumos operacionais', 'Insumos Operacionais', 'Custos Variáveis'),
  ('encargos docentes', 'Encargos Docentes', 'Custos Variáveis'),
  ('horas extras docentes', 'Horas Extras Docentes', 'Custos Variáveis'),
  ('energia', 'Energia', 'Custos Variáveis'),
  ('água & gás', 'Água & Gás', 'Custos Variáveis'),
  ('alimentação alunos', 'Alimentação Alunos', 'Custos Variáveis'),
  ('material de consumo', 'Material de Consumo', 'Custos Variáveis')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟡 CUSTOS FIXOS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('infraestrutura', 'Infraestrutura', 'Custos Fixos'),
  ('manutenção', 'Manutenção', 'Custos Fixos'),
  ('aluguel imóveis', 'Aluguel Imóveis', 'Custos Fixos'),
  ('iptu', 'IPTU', 'Custos Fixos'),
  ('seguros patrimoniais', 'Seguros Patrimoniais', 'Custos Fixos'),
  ('limpeza', 'Limpeza', 'Custos Fixos'),
  ('conservação predial', 'Conservação Predial', 'Custos Fixos'),
  ('jardinagem', 'Jardinagem', 'Custos Fixos')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟣 DESPESAS ADMINISTRATIVAS (SG&A)
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('comercial & mkt', 'Comercial & MKT', 'Despesas Administrativas'),
  ('corporativo', 'Corporativo', 'Despesas Administrativas'),
  ('google ads', 'Google Ads', 'Despesas Administrativas'),
  ('redes sociais', 'Redes Sociais', 'Despesas Administrativas'),
  ('eventos comerciais', 'Eventos Comerciais', 'Despesas Administrativas'),
  ('sistemas erp', 'Sistemas ERP', 'Despesas Administrativas'),
  ('assessoria jurídica', 'Assessoria Jurídica', 'Despesas Administrativas'),
  ('consultoria', 'Consultoria', 'Despesas Administrativas'),
  ('pessoal administrativo', 'Pessoal Administrativo', 'Despesas Administrativas'),
  ('encargos administrativos', 'Encargos Administrativos', 'Despesas Administrativas')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟠 DESPESAS FINANCEIRAS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('juros empréstimos', 'Juros Empréstimos', 'Despesas Financeiras'),
  ('tarifas bancárias', 'Tarifas Bancárias', 'Despesas Financeiras'),
  ('iof', 'IOF', 'Despesas Financeiras'),
  ('despesas financeiras', 'Despesas Financeiras', 'Despesas Financeiras')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🔴 OUTRAS DESPESAS OPERACIONAIS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  ('depreciação', 'Depreciação', 'Outras Despesas Operacionais'),
  ('amortização', 'Amortização', 'Outras Despesas Operacionais'),
  ('perdas diversas', 'Perdas Diversas', 'Outras Despesas Operacionais')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- ════════════════════════════════════════════════════════════════
-- VERIFICAÇÕES FINAIS
-- ════════════════════════════════════════════════════════════════

-- ✅ Ver resumo por Tag0
SELECT
  COALESCE(m.tag0, '❌ SEM MAPEAMENTO') as tag0,
  COUNT(DISTINCT t.tag01) as qtd_tag01_unicas,
  COUNT(*) as total_registros,
  SUM(t.amount) as total_valor
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE t.tag01 IS NOT NULL
GROUP BY m.tag0
ORDER BY COUNT(*) DESC;

-- ✅ Ver tags ainda sem mapeamento
SELECT
  t.tag01,
  COUNT(*) as registros,
  SUM(t.amount) as valor_total
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE t.tag01 IS NOT NULL
  AND m.tag0 IS NULL
GROUP BY t.tag01
ORDER BY COUNT(*) DESC;

-- ✅ Ver mapeamentos de Receita Líquida especificamente
SELECT
  m.tag0,
  m.tag1_norm,
  m.tag1_raw,
  COUNT(t.id) as qtd_registros
FROM tag0_map m
LEFT JOIN transactions t ON LOWER(TRIM(t.tag01)) = LOWER(m.tag1_norm)
WHERE m.tag0 = 'Receita Líquida'
GROUP BY m.tag0, m.tag1_norm, m.tag1_raw
ORDER BY m.tag1_norm;
