-- ================================================================================
-- DIAGNÓSTICO COMPLETO - COMPARAÇÃO DRE_FABRIC vs TRANSACTIONS
-- ================================================================================
-- Execute este script completo no Supabase SQL Editor
-- ================================================================================

-- ================================================================================
-- PASSO 1: VERIFICAR SE AS TABELAS DE COMPARAÇÃO EXISTEM
-- ================================================================================

SELECT
  '📋 VERIFICANDO TABELAS...' as titulo;

SELECT
  table_name,
  CASE
    WHEN table_name = 'comparacao_historico' THEN '✅ Tabela de histórico detalhado'
    WHEN table_name = 'comparacao_resumo' THEN '✅ Tabela de resumo estatístico'
    WHEN table_name = 'comparacao_controle' THEN '✅ Tabela de controle do trigger'
    ELSE '✅ Existe'
  END as descricao
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('comparacao_historico', 'comparacao_resumo', 'comparacao_controle')
ORDER BY table_name;

-- ================================================================================
-- PASSO 2: VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- ================================================================================

SELECT
  '🔔 VERIFICANDO TRIGGER...' as titulo;

SELECT
  trigger_name,
  event_manipulation as evento,
  action_timing as quando,
  action_statement as funcao,
  CASE
    WHEN tgenabled = 'O' THEN '✅ ATIVO'
    WHEN tgenabled = 'D' THEN '❌ DESABILITADO'
    ELSE '⚠️ OUTRO: ' || tgenabled
  END as status
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
WHERE t.event_object_table = 'dre_fabric'
  AND t.trigger_name = 'trigger_atualizar_comparacao';

-- ================================================================================
-- PASSO 3: VERIFICAR ÚLTIMA EXECUÇÃO DO TRIGGER
-- ================================================================================

SELECT
  '⏰ ÚLTIMA EXECUÇÃO DO TRIGGER...' as titulo;

SELECT
  ultima_execucao,
  execucao_em_andamento,
  CASE
    WHEN ultima_execucao IS NULL THEN '⚠️ Nunca executou'
    WHEN ultima_execucao > NOW() - INTERVAL '10 minutes' THEN '✅ Executou recentemente (últimos 10 min)'
    WHEN ultima_execucao > NOW() - INTERVAL '1 hour' THEN '⚠️ Executou há mais de 10 minutos'
    ELSE '❌ Executou há mais de 1 hora'
  END as status,
  NOW() - ultima_execucao as tempo_desde_ultima_execucao
FROM comparacao_controle
WHERE id = 1;

-- ================================================================================
-- PASSO 4: VERIFICAR SE HÁ DADOS DE COMPARAÇÃO
-- ================================================================================

SELECT
  '📊 CONTAGEM DE DADOS...' as titulo;

SELECT
  'Comparações no histórico' as tipo,
  COUNT(DISTINCT data_execucao) as execucoes,
  COUNT(*) as registros_total,
  MAX(data_execucao) as ultima_comparacao
FROM comparacao_historico
UNION ALL
SELECT
  'Resumos salvos' as tipo,
  COUNT(*) as execucoes,
  NULL as registros_total,
  MAX(data_execucao) as ultima_comparacao
FROM comparacao_resumo;

-- ================================================================================
-- PASSO 5: VER ÚLTIMO RESUMO (SE HOUVER)
-- ================================================================================

SELECT
  '📈 ÚLTIMO RESUMO DA COMPARAÇÃO...' as titulo;

SELECT
  data_execucao,
  total_registros,
  qtd_valores_iguais,
  qtd_valores_diferentes,
  qtd_so_transactions,
  qtd_so_dre_fabric,
  perc_valores_iguais || '%' as taxa_sucesso,
  diferenca_total,
  tempo_execucao_ms || ' ms' as tempo,
  CASE
    WHEN qtd_valores_diferentes = 0 AND qtd_so_dre_fabric = 0 THEN '✅ Perfeito'
    WHEN qtd_valores_diferentes > 0 OR qtd_so_dre_fabric > 0 THEN '⚠️ Divergências encontradas'
    ELSE '❓ Verificar'
  END as situacao
FROM comparacao_resumo
ORDER BY data_execucao DESC
LIMIT 1;

-- ================================================================================
-- PASSO 6: VER PROBLEMAS (SE HOUVER)
-- ================================================================================

SELECT
  '⚠️ PROBLEMAS ENCONTRADOS (SE HOUVER)...' as titulo;

SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(SUM(COALESCE(diferenca_valor, df_valor, 0))::NUMERIC, 2) as soma_diferencas
FROM comparacao_historico
WHERE data_execucao = (SELECT MAX(data_execucao) FROM comparacao_historico)
  AND status IN (
    '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES',
    '4. SO TEM NA DRE_FABRIC'
  )
GROUP BY status
ORDER BY status;

-- ================================================================================
-- PASSO 7: VERIFICAR CONTAGENS DIRETAS (ATUAL)
-- ================================================================================

SELECT
  '🔢 CONTAGENS DIRETAS (TEMPO REAL)...' as titulo;

SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) as total_dre_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as total_transactions,
  (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as diferenca,
  CASE
    WHEN (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) =
         (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '✅ Quantidades iguais'
    WHEN (SELECT COUNT(*) FROM dre_fabric WHERE chave_id IS NOT NULL) >
         (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL)
    THEN '⚠️ DRE_FABRIC tem mais registros'
    ELSE '⚠️ TRANSACTIONS tem mais registros'
  END as situacao;

-- ================================================================================
-- PASSO 8: VERIFICAR SE VIEWS EXISTEM
-- ================================================================================

SELECT
  '👁️ VIEWS DE CONSULTA...' as titulo;

SELECT
  table_name as view_name,
  CASE table_name
    WHEN 'vw_ultima_comparacao' THEN '✅ View com última comparação detalhada'
    WHEN 'vw_ultimo_resumo' THEN '✅ View com último resumo'
    WHEN 'vw_problemas_ultima_comparacao' THEN '✅ View apenas com problemas'
    WHEN 'vw_historico_execucoes' THEN '✅ View com histórico de execuções'
    ELSE '✅ Existe'
  END as descricao
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'vw_%comparacao%'
  OR table_name LIKE 'vw_%execucoes%'
ORDER BY table_name;

-- ================================================================================
-- RESUMO FINAL E RECOMENDAÇÕES
-- ================================================================================

DO $$
DECLARE
  v_trigger_ativo BOOLEAN;
  v_tem_dados BOOLEAN;
  v_ultima_execucao TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar trigger
  SELECT tgenabled = 'O'
  INTO v_trigger_ativo
  FROM pg_trigger
  WHERE tgname = 'trigger_atualizar_comparacao'
  LIMIT 1;

  -- Verificar dados
  SELECT COUNT(*) > 0
  INTO v_tem_dados
  FROM comparacao_resumo;

  -- Verificar última execução
  SELECT ultima_execucao
  INTO v_ultima_execucao
  FROM comparacao_controle
  WHERE id = 1;

  RAISE NOTICE '
================================================================================
📊 RESUMO DO DIAGNÓSTICO
================================================================================

Trigger de comparação: %
Dados de comparação: %
Última execução: %

================================================================================
🔧 AÇÕES RECOMENDADAS:
================================================================================

%

================================================================================
',
  CASE WHEN v_trigger_ativo THEN '✅ ATIVO' ELSE '❌ DESABILITADO' END,
  CASE WHEN v_tem_dados THEN '✅ Possui histórico' ELSE '⚠️ Sem dados' END,
  COALESCE(v_ultima_execucao::TEXT, '❌ Nunca executou'),
  CASE
    WHEN NOT v_trigger_ativo THEN
      '1. ❌ Trigger está DESABILITADO!
   → Execute: SELECT habilitar_trigger_comparacao();

2. Após habilitar, execute manualmente:
   → Execute: SELECT * FROM executar_comparacao_manual();'
    WHEN NOT v_tem_dados THEN
      '1. ⚠️ Não há dados de comparação ainda
   → Execute manualmente: SELECT * FROM executar_comparacao_manual();

2. O trigger executará automaticamente nas próximas atualizações'
    WHEN v_ultima_execucao IS NULL OR v_ultima_execucao < NOW() - INTERVAL '1 hour' THEN
      '1. ⚠️ Comparação desatualizada (>1 hora)
   → Execute manualmente: SELECT * FROM executar_comparacao_manual();

2. Verifique os resultados:
   → SELECT * FROM vw_ultimo_resumo;'
    ELSE
      '✅ Tudo funcionando corretamente!

Para ver resultados:
→ SELECT * FROM vw_ultimo_resumo;
→ SELECT * FROM vw_problemas_ultima_comparacao;'
  END;

END $$;

-- ================================================================================
-- FIM DO DIAGNÓSTICO
-- ================================================================================
