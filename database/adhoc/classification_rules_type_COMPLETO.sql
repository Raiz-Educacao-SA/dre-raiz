-- ============================================
-- SCRIPT COMPLETO: Regras de Classificação + Reclassificação
-- ============================================
-- Este script faz TUDO de uma vez:
-- 1. Cria/atualiza a função de classificação
-- 2. Reclassifica todos os registros
-- 3. Mostra os resultados
-- Data: 2026-02-03
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: CRIAR/ATUALIZAR FUNÇÃO DE REGRAS
-- ============================================

CREATE OR REPLACE FUNCTION classify_transaction_type(
  p_tag1 TEXT,
  p_tagorc TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- ============================================
  -- REGRA 1: RECEITAS
  -- ============================================
  IF p_tag1 = 'RECEITAS' THEN
    RETURN '01. RECEITA LIQUIDA';

  -- ============================================
  -- REGRA 2: CUSTOS VARIÁVEIS (UNIDADES)
  -- ============================================
  ELSIF p_tagorc IN (
    'FOLHA (PROFESSORES)',
    'ENERGIA','Energia',
    'ÁGUA & GÁS','Água & Gás',
    'MATERIAL DE CONSUMO & OPERAÇÕES','Material de Consumo & Operações',
    'MATERIAL DIDÁTICO & FRETE','Material Didático & Frete',
    'ALIMENTAÇÃO DE ALUNOS','Alimentação de Alunos'
  ) THEN
    RETURN '02. CUSTOS VARIÁVEIS (UNIDADES)';

  -- ============================================
  -- REGRA 3: CUSTOS FIXOS (UNIDADES)
  -- ============================================
  ELSIF p_tagorc IN (
    'FOLHA (FUNCIONÁRIOS)','Folha (Funcionários)',
    'IMÓVEIS','Imóveis',
    'MANUTENÇÃO & CONSERVAÇÃO','Manutenção & Conservação',
    'PEDAGÓGICO','Pedagógico',
    'CUSTOS C/PESSOAL'
  ) THEN
    RETURN '03. CUSTOS FIXOS (UNIDADES)';

  -- ============================================
  -- REGRA 4: SG&A
  -- ============================================
  ELSIF p_tagorc IN (
    'PUBLICIDADE','Publicidade',
    'EVENTOS COMERCIAIS','Eventos Comerciais',
    'COMERCIAL',
    'SISTEMAS & TECNOLOGIA','Sistemas & Tecnologia',
    'JURÍDICO & AUDITORIA','Jurídico & Auditoria',
    'EXPANSÃO PEDAGÓGICA','Expansão Pedagógica',
    '3. ASSESSORIAS  DE COBRANÇA',
    'ASSESSORIAS  DE COBRANÇA',
    'PROJETOS','Projetos',
    'PDD & ASSESSORIAS',
    'OUTROS','Outros'
  ) THEN
    RETURN '04. SG&A';

  -- ============================================
  -- REGRA 5: RATEIO RAIZ
  -- ============================================
  ELSIF p_tagorc LIKE '%RATEIO%' THEN
    RETURN '05. RATEIO RAIZ';

  -- ============================================
  -- REGRA 6: RESULTADO FINANCEIRO
  -- ============================================
  ELSIF p_tagorc IN ('RESULTADO FINANCEIRO', 'Resultado Financeiro') THEN
    RETURN '09. RESULTADO FINANCEIRO';

  -- ============================================
  -- REGRA 7: DEPRECIAÇÃO
  -- ============================================
  ELSIF p_tagorc IN ('DEPRECIAÇÃO & AMORTIZAÇÃO', 'Depreciação & Amortização') THEN
    RETURN '10. DEPRECIAÇÃO';

  -- ============================================
  -- REGRA 8: IRPJ/CSLL
  -- ============================================
  ELSIF p_tag1 = 'IRPJ/CSLL' THEN
    RETURN '12. IRPJ/CSLL';

  -- ============================================
  -- REGRA 9: CAPEX
  -- ============================================
  ELSIF p_tag1 = 'CAPEX' THEN
    RETURN '14. CAPEX';

  -- ============================================
  -- REGRA 10: ADIANTAMENTO
  -- ============================================
  ELSIF p_tagorc IN ('ADIANTAMENTO', 'Adiantamento') THEN
    RETURN '15. ADIANTAMENTO';

  -- ============================================
  -- REGRA 11: PARTICIPAÇÃO SOCIETÁRIA
  -- ============================================
  ELSIF p_tagorc IN ('PARTICIPAÇÃO SOCIETÁRIA', 'Participação Societária') THEN
    RETURN '16. PARTICIPAÇÃO SOCIETÁRIA';

  -- ============================================
  -- REGRA PADRÃO: TAG NÃO CADASTRADA
  -- ============================================
  ELSE
    RETURN '99. CADASTRAR TAG0';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Adicionar comentário na função
COMMENT ON FUNCTION classify_transaction_type(TEXT, TEXT) IS
'Classifica o tipo de transação baseado em TAG1 e TAGORC.
Editável: Modifique as regras neste arquivo e re-execute para atualizar.';

-- ============================================
-- PARTE 2: RECLASSIFICAR TODOS OS REGISTROS
-- ============================================

-- Mostrar status ANTES da reclassificação
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO RECLASSIFICAÇÃO...';
  RAISE NOTICE 'Total de registros: %', (SELECT COUNT(*) FROM dre_fabric);
  RAISE NOTICE '========================================';
END $$;

-- Reclassificar todos os registros
UPDATE dre_fabric
SET type = classify_transaction_type(tag1, tag_orc);

-- Mostrar status DEPOIS da reclassificação
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECLASSIFICAÇÃO CONCLUÍDA!';
  RAISE NOTICE 'Registros atualizados: %', (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL);
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- PARTE 3: VERIFICAÇÃO DOS RESULTADOS
-- ============================================

-- Resultado 1: Distribuição por tipo
SELECT
  '📊 DISTRIBUIÇÃO POR TIPO' as relatorio;

SELECT
  type,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual
FROM dre_fabric
GROUP BY type
ORDER BY type;

-- Resultado 2: Total de registros não classificados
SELECT
  '⚠️ REGISTROS NÃO CLASSIFICADOS' as relatorio;

SELECT
  COUNT(*) as total_nao_classificados,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric), 2) as percentual
FROM dre_fabric
WHERE type = '99. CADASTRAR TAG0';

-- Resultado 3: Top 20 tags não classificadas
SELECT
  '🔍 TOP 20 TAGS NÃO CLASSIFICADAS' as relatorio;

SELECT
  tag1,
  tag_orc,
  COUNT(*) as qtd_registros,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dre_fabric WHERE type = '99. CADASTRAR TAG0'), 2) as percentual_do_nao_classificado
FROM dre_fabric
WHERE type = '99. CADASTRAR TAG0'
GROUP BY tag1, tag_orc
ORDER BY qtd_registros DESC
LIMIT 20;

-- Resultado 4: Mensagem de sucesso
SELECT
  '✅ PROCESSO CONCLUÍDO COM SUCESSO!' as status,
  (SELECT COUNT(*) FROM dre_fabric) as total_registros,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL) as classificados,
  (SELECT COUNT(*) FROM dre_fabric WHERE type = '99. CADASTRAR TAG0') as nao_classificados;

-- ============================================
-- INSTRUÇÕES PARA PRÓXIMAS EDIÇÕES
-- ============================================

/*
🔧 COMO EDITAR AS REGRAS NO FUTURO:

1. Edite a PARTE 1 deste arquivo (função classify_transaction_type)
2. Adicione/remova itens nas listas IN ou crie novos blocos ELSIF
3. Salve o arquivo
4. Execute TODO o arquivo novamente no Supabase
5. A função será recriada E os registros serão reclassificados automaticamente

📝 EXEMPLO - Adicionar nova tag em Custos Variáveis:

ELSIF p_tagorc IN (
  'FOLHA (PROFESSORES)',
  'ENERGIA','Energia',
  'NOVA_TAG_AQUI',  -- ✨ Adicione aqui
  'ÁGUA & GÁS','Água & Gás',
  ...
) THEN
  RETURN '02. CUSTOS VARIÁVEIS (UNIDADES)';

🎯 DICA: Sempre adicione versões com maiúsculas e minúsculas para garantir compatibilidade!
*/
