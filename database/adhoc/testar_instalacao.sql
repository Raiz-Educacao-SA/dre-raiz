-- ================================================================================
-- SCRIPT DE TESTE - VERIFICAÇÃO DE INSTALAÇÃO
-- ================================================================================
-- Execute este script após instalar a rotina automática para verificar
-- se tudo foi criado corretamente.
-- ================================================================================

SELECT '🔍 INICIANDO VERIFICAÇÃO DA INSTALAÇÃO...' as status;

-- ================================================================================
-- TESTE 1: Verificar Tabelas
-- ================================================================================

SELECT '1️⃣ VERIFICANDO TABELAS...' as teste;

SELECT
  CASE
    WHEN COUNT(*) = 3 THEN '✅ Todas as 3 tabelas foram criadas com sucesso'
    ELSE '❌ ERRO: Faltam ' || (3 - COUNT(*)) || ' tabelas'
  END as resultado,
  STRING_AGG(table_name, ', ') as tabelas_encontradas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('comparacao_historico', 'comparacao_resumo', 'comparacao_controle');

-- Detalhes das tabelas
SELECT
  table_name,
  '✅ OK' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('comparacao_historico', 'comparacao_resumo', 'comparacao_controle')
ORDER BY table_name;

-- ================================================================================
-- TESTE 2: Verificar Índices
-- ================================================================================

SELECT '2️⃣ VERIFICANDO ÍNDICES...' as teste;

SELECT
  indexname,
  tablename,
  '✅ OK' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('comparacao_historico', 'comparacao_resumo')
ORDER BY tablename, indexname;

-- ================================================================================
-- TESTE 3: Verificar Funções
-- ================================================================================

SELECT '3️⃣ VERIFICANDO FUNÇÕES...' as teste;

SELECT
  routine_name as funcao,
  '✅ OK' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'executar_comparacao_dre_transactions',
    'executar_comparacao_manual',
    'trigger_comparacao_dre_transactions',
    'limpar_historico_comparacao',
    'desabilitar_trigger_comparacao',
    'habilitar_trigger_comparacao'
  )
ORDER BY routine_name;

-- Contar funções criadas
SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✅ Todas as 6 funções foram criadas com sucesso'
    ELSE '⚠️ AVISO: Encontradas ' || COUNT(*) || ' de 6 funções esperadas'
  END as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'executar_comparacao_dre_transactions',
    'executar_comparacao_manual',
    'trigger_comparacao_dre_transactions',
    'limpar_historico_comparacao',
    'desabilitar_trigger_comparacao',
    'habilitar_trigger_comparacao'
  );

-- ================================================================================
-- TESTE 4: Verificar Trigger
-- ================================================================================

SELECT '4️⃣ VERIFICANDO TRIGGER...' as teste;

SELECT
  trigger_name,
  event_object_table as tabela,
  action_timing as momento,
  STRING_AGG(event_manipulation, ', ') as eventos,
  '✅ ATIVO' as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_atualizar_comparacao'
GROUP BY trigger_name, event_object_table, action_timing;

-- Verificar se trigger existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_atualizar_comparacao'
    ) THEN '✅ Trigger criado e configurado corretamente'
    ELSE '❌ ERRO: Trigger não encontrado'
  END as resultado;

-- ================================================================================
-- TESTE 5: Verificar Views
-- ================================================================================

SELECT '5️⃣ VERIFICANDO VIEWS...' as teste;

SELECT
  table_name as view_name,
  '✅ OK' as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'vw_ultima_comparacao',
    'vw_ultimo_resumo',
    'vw_problemas_ultima_comparacao',
    'vw_historico_execucoes'
  )
ORDER BY table_name;

-- Contar views
SELECT
  CASE
    WHEN COUNT(*) = 4 THEN '✅ Todas as 4 views foram criadas com sucesso'
    ELSE '❌ ERRO: Faltam ' || (4 - COUNT(*)) || ' views'
  END as resultado
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'vw_ultima_comparacao',
    'vw_ultimo_resumo',
    'vw_problemas_ultima_comparacao',
    'vw_historico_execucoes'
  );

-- ================================================================================
-- TESTE 6: Verificar Tabela de Controle
-- ================================================================================

SELECT '6️⃣ VERIFICANDO TABELA DE CONTROLE...' as teste;

SELECT
  CASE
    WHEN ultima_execucao IS NULL THEN '⏳ Aguardando primeira execução'
    ELSE '✅ Última execução: ' || TO_CHAR(ultima_execucao, 'DD/MM/YYYY HH24:MI:SS')
  END as status_execucao,
  CASE
    WHEN execucao_em_andamento THEN '🔄 Execução em andamento'
    ELSE '✅ Sistema pronto'
  END as status_sistema,
  CASE
    WHEN ultima_execucao IS NULL THEN 'Nunca executado'
    WHEN ultima_execucao < NOW() - INTERVAL '5 minutes' THEN '✅ Pronto para executar'
    ELSE '⏳ Aguardando intervalo (5 min)'
  END as pode_executar
FROM comparacao_controle
WHERE id = 1;

-- ================================================================================
-- TESTE 7: Teste de Execução Manual
-- ================================================================================

SELECT '7️⃣ EXECUTANDO TESTE DE COMPARAÇÃO...' as teste;

-- Executar comparação de teste
SELECT * FROM executar_comparacao_manual();

-- ================================================================================
-- TESTE 8: Verificar Resultados do Teste
-- ================================================================================

SELECT '8️⃣ VERIFICANDO RESULTADOS...' as teste;

-- Ver se foram gerados registros
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' registros processados com sucesso'
    ELSE '⚠️ Nenhum registro encontrado (verifique se há dados nas tabelas)'
  END as resultado_processamento
FROM comparacao_historico
WHERE data_execucao >= NOW() - INTERVAL '1 minute';

-- Ver resumo gerado
SELECT
  '✅ Resumo gerado com sucesso' as status,
  total_registros,
  qtd_valores_iguais as ok,
  qtd_valores_diferentes as diferentes,
  qtd_so_dre_fabric as faltam_transactions,
  qtd_so_transactions as extras_transactions,
  perc_valores_iguais as percentual_ok,
  tempo_execucao_ms || ' ms' as tempo
FROM comparacao_resumo
ORDER BY data_execucao DESC
LIMIT 1;

-- ================================================================================
-- TESTE 9: Testar Views
-- ================================================================================

SELECT '9️⃣ TESTANDO VIEWS...' as teste;

-- Testar vw_ultimo_resumo
SELECT
  'vw_ultimo_resumo' as view_testada,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Funcionando corretamente'
    ELSE '❌ Erro ao consultar'
  END as status
FROM vw_ultimo_resumo;

-- Testar vw_ultima_comparacao
SELECT
  'vw_ultima_comparacao' as view_testada,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Funcionando - ' || COUNT(*) || ' registros'
    ELSE '⚠️ Sem dados'
  END as status
FROM vw_ultima_comparacao;

-- Testar vw_problemas_ultima_comparacao
SELECT
  'vw_problemas_ultima_comparacao' as view_testada,
  CASE
    WHEN COUNT(*) >= 0 THEN '✅ Funcionando - ' || COUNT(*) || ' problemas encontrados'
    ELSE '❌ Erro ao consultar'
  END as status
FROM vw_problemas_ultima_comparacao;

-- Testar vw_historico_execucoes
SELECT
  'vw_historico_execucoes' as view_testada,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Funcionando - ' || COUNT(*) || ' execuções registradas'
    ELSE '⚠️ Sem histórico'
  END as status
FROM vw_historico_execucoes;

-- ================================================================================
-- TESTE 10: Verificar Distribuição de Status
-- ================================================================================

SELECT '🔟 VERIFICANDO DISTRIBUIÇÃO DE STATUS...' as teste;

SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual,
  '✅' as status_verificacao
FROM vw_ultima_comparacao
GROUP BY status
ORDER BY
  CASE status
    WHEN '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS' THEN 1
    WHEN '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES' THEN 2
    WHEN '3. SO TEM NA TRANSACTIONS' THEN 3
    WHEN '4. SO TEM NA DRE_FABRIC' THEN 4
    ELSE 5
  END;

-- ================================================================================
-- RESUMO FINAL
-- ================================================================================

SELECT '📊 RESUMO FINAL DA VERIFICAÇÃO' as secao;

WITH verificacoes AS (
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('comparacao_historico', 'comparacao_resumo', 'comparacao_controle')) = 3 as tabelas_ok,

    (SELECT COUNT(*) FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_name IN (
         'executar_comparacao_dre_transactions',
         'executar_comparacao_manual',
         'trigger_comparacao_dre_transactions',
         'limpar_historico_comparacao',
         'desabilitar_trigger_comparacao',
         'habilitar_trigger_comparacao'
       )) = 6 as funcoes_ok,

    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE trigger_name = 'trigger_atualizar_comparacao') = 1 as trigger_ok,

    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public'
       AND table_name IN (
         'vw_ultima_comparacao',
         'vw_ultimo_resumo',
         'vw_problemas_ultima_comparacao',
         'vw_historico_execucoes'
       )) = 4 as views_ok,

    (SELECT COUNT(*) FROM comparacao_historico
     WHERE data_execucao >= NOW() - INTERVAL '1 minute') > 0 as dados_ok
)
SELECT
  CASE WHEN tabelas_ok THEN '✅' ELSE '❌' END || ' Tabelas' as item_1,
  CASE WHEN funcoes_ok THEN '✅' ELSE '❌' END || ' Funções' as item_2,
  CASE WHEN trigger_ok THEN '✅' ELSE '❌' END || ' Trigger' as item_3,
  CASE WHEN views_ok THEN '✅' ELSE '❌' END || ' Views' as item_4,
  CASE WHEN dados_ok THEN '✅' ELSE '⚠️' END || ' Dados processados' as item_5,
  CASE
    WHEN tabelas_ok AND funcoes_ok AND trigger_ok AND views_ok AND dados_ok THEN
      '🎉 INSTALAÇÃO 100% COMPLETA E FUNCIONAL!'
    WHEN tabelas_ok AND funcoes_ok AND trigger_ok AND views_ok THEN
      '✅ INSTALAÇÃO COMPLETA (executar comparação manual)'
    ELSE
      '⚠️ INSTALAÇÃO INCOMPLETA - verificar erros acima'
  END as status_final
FROM verificacoes;

-- ================================================================================
-- PRÓXIMOS PASSOS
-- ================================================================================

SELECT '📋 PRÓXIMOS PASSOS' as secao;

SELECT
  '1. Consultar resultados' as passo_1,
  'SELECT * FROM vw_ultimo_resumo;' as comando_1,
  '2. Ver problemas encontrados' as passo_2,
  'SELECT * FROM vw_problemas_ultima_comparacao LIMIT 20;' as comando_2,
  '3. Acompanhar histórico' as passo_3,
  'SELECT * FROM vw_historico_execucoes;' as comando_3,
  '4. Ver exemplos de uso' as passo_4,
  'Consultar arquivo: exemplos_uso_rotina_comparacao.sql' as info_4;

-- ================================================================================
-- FIM DOS TESTES
-- ================================================================================

SELECT '✅ VERIFICAÇÃO CONCLUÍDA!' as status;
