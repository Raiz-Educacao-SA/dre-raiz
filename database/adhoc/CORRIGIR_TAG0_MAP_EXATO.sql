-- ════════════════════════════════════════════════════════════════
-- CORRIGIR TAG0_MAP COM ESCRITA EXATA DO BANCO
-- ════════════════════════════════════════════════════════════════

-- ⚠️ LIMPAR MAPEAMENTOS ANTIGOS (OPCIONAL)
-- DELETE FROM tag0_map;

-- ════════════════════════════════════════════════════════════════
-- INSERIR MAPEAMENTOS COM ESCRITA EXATA
-- ════════════════════════════════════════════════════════════════

-- 🟢 RECEITA LÍQUIDA
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Tributos')), 'Tributos', 'Receita Líquida'),
  (LOWER(TRIM('Devoluções & Cancelamentos')), 'Devoluções & Cancelamentos', 'Receita Líquida'),
  (LOWER(TRIM('Integral')), 'Integral', 'Receita Líquida'),
  (LOWER(TRIM('Material Didático')), 'Material Didático', 'Receita Líquida'),
  (LOWER(TRIM('Material Didático & Frete')), 'Material Didático & Frete', 'Receita Líquida'),
  (LOWER(TRIM('Receita De Mensalidade')), 'Receita De Mensalidade', 'Receita Líquida'),
  (LOWER(TRIM('Receitas')), 'Receitas', 'Receita Líquida'),
  (LOWER(TRIM('Receitas Extras')), 'Receitas Extras', 'Receita Líquida'),
  (LOWER(TRIM('Receitas Não Operacionais')), 'Receitas Não Operacionais', 'Receita Líquida')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🔵 CUSTOS VARIÁVEIS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Alimentacao Dos Alunos')), 'Alimentacao Dos Alunos', 'Custos Variáveis'),
  (LOWER(TRIM('Material De Consumo & Operaçoes')), 'Material De Consumo & Operaçoes', 'Custos Variáveis'),
  (LOWER(TRIM('Folha (Professores)')), 'Folha (Professores)', 'Custos Variáveis')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟡 CUSTOS FIXOS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Concessionárias')), 'Concessionárias', 'Custos Fixos'),
  (LOWER(TRIM('Custos')), 'Custos', 'Custos Fixos'),
  (LOWER(TRIM('Imóveis')), 'Imóveis', 'Custos Fixos'),
  (LOWER(TRIM('Manutenção & Conservação')), 'Manutenção & Conservação', 'Custos Fixos')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟣 DESPESAS ADMINISTRATIVAS (SG&A)
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Folha (Funcionários)')), 'Folha (Funcionários)', 'Despesas Administrativas'),
  (LOWER(TRIM('Sistemas & Tecnologia')), 'Sistemas & Tecnologia', 'Despesas Administrativas'),
  (LOWER(TRIM('Vendas & Marketing')), 'Vendas & Marketing', 'Despesas Administrativas'),
  (LOWER(TRIM('Jurídico & Auditoria')), 'Jurídico & Auditoria', 'Despesas Administrativas'),
  (LOWER(TRIM('Despesas')), 'Despesas', 'Despesas Administrativas'),
  (LOWER(TRIM('Rateio Adm')), 'Rateio Adm', 'Despesas Administrativas'),
  (LOWER(TRIM('Rateio Raiz')), 'Rateio Raiz', 'Despesas Administrativas')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟠 DESPESAS FINANCEIRAS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Res_Fin')), 'Res_Fin', 'Despesas Financeiras'),
  (LOWER(TRIM('Resultado Financeiro')), 'Resultado Financeiro', 'Despesas Financeiras'),
  (LOWER(TRIM('Irpj/Csll')), 'Irpj/Csll', 'Despesas Financeiras')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🔴 INVESTIMENTOS & CAPEX
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Capex')), 'Capex', 'Investimentos'),
  (LOWER(TRIM('Expansão Pedagógica')), 'Expansão Pedagógica', 'Investimentos'),
  (LOWER(TRIM('Projetos')), 'Projetos', 'Investimentos')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- ⚫ OUTRAS DESPESAS OPERACIONAIS
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Depreciação')), 'Depreciação', 'Outras Despesas Operacionais'),
  (LOWER(TRIM('Depreciação & Amortização')), 'Depreciação & Amortização', 'Outras Despesas Operacionais'),
  (LOWER(TRIM('Pdd')), 'Pdd', 'Outras Despesas Operacionais')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- 🟤 OUTROS/AJUSTES
INSERT INTO tag0_map (tag1_norm, tag1_raw, tag0) VALUES
  (LOWER(TRIM('Adiant_Fornec')), 'Adiant_Fornec', 'Outros'),
  (LOWER(TRIM('Eventos Pedagógicos')), 'Eventos Pedagógicos', 'Outros'),
  (LOWER(TRIM('N/A')), 'N/A', 'Outros'),
  (LOWER(TRIM('Outros')), 'Outros', 'Outros'),
  (LOWER(TRIM('Part_Societ')), 'Part_Societ', 'Outros'),
  (LOWER(TRIM('Participação Societária')), 'Participação Societária', 'Outros')
ON CONFLICT (tag1_norm) DO UPDATE
  SET tag0 = EXCLUDED.tag0, tag1_raw = EXCLUDED.tag1_raw;

-- ════════════════════════════════════════════════════════════════
-- VERIFICAÇÕES
-- ════════════════════════════════════════════════════════════════

-- ✅ Ver todos os mapeamentos por Tag0
SELECT
  tag0,
  COUNT(*) as qtd_mapeamentos,
  STRING_AGG(tag1_raw, ', ' ORDER BY tag1_raw) as tags_mapeadas
FROM tag0_map
GROUP BY tag0
ORDER BY tag0;

-- ✅ Ver especificamente Receita Líquida
SELECT
  tag0,
  tag1_norm,
  tag1_raw
FROM tag0_map
WHERE tag0 = 'Receita Líquida'
ORDER BY tag1_raw;

-- ✅ Verificar se TEM algum tag01 ainda sem mapeamento
SELECT
  t.tag01 as "Tag01 SEM mapeamento",
  COUNT(*) as qtd_registros
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = m.tag1_norm
WHERE t.tag01 IS NOT NULL
  AND m.tag0 IS NULL
GROUP BY t.tag01
ORDER BY COUNT(*) DESC;

-- ✅ Resumo por Tag0
SELECT
  COALESCE(m.tag0, '❌ SEM MAPEAMENTO') as tag0,
  COUNT(DISTINCT t.tag01) as qtd_tag01,
  COUNT(*) as total_registros
FROM transactions t
LEFT JOIN tag0_map m ON LOWER(TRIM(t.tag01)) = m.tag1_norm
WHERE t.tag01 IS NOT NULL
GROUP BY m.tag0
ORDER BY COUNT(*) DESC;
