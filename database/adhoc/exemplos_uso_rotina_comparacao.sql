-- ================================================================================
-- EXEMPLOS DE USO - ROTINA AUTOMÁTICA DE COMPARAÇÃO
-- ================================================================================

-- ================================================================================
-- 1. CONSULTAS BÁSICAS
-- ================================================================================

-- Ver última comparação completa (primeiros 100 registros)
SELECT * FROM vw_ultima_comparacao LIMIT 100;

-- Ver apenas registros com problemas
SELECT * FROM vw_problemas_ultima_comparacao;

-- Ver resumo da última execução
SELECT * FROM vw_ultimo_resumo;

-- Ver histórico de todas as execuções
SELECT * FROM vw_historico_execucoes;

-- ================================================================================
-- 2. CONSULTAS AVANÇADAS - ÚLTIMA COMPARAÇÃO
-- ================================================================================

-- Contar registros por status
SELECT
  status,
  COUNT(*) as quantidade,
  ROUND(AVG(COALESCE(diferenca_valor, 0)), 2) as media_diferenca
FROM vw_ultima_comparacao
GROUP BY status
ORDER BY quantidade DESC;

-- Top 20 maiores diferenças de valor
SELECT
  chave_id,
  status,
  df_valor,
  t_amount,
  diferenca_valor,
  percentual_diferenca,
  df_descricao,
  t_description
FROM vw_ultima_comparacao
WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
ORDER BY ABS(diferenca_valor) DESC
LIMIT 20;

-- Registros que só existem no DRE_FABRIC (faltam no TRANSACTIONS)
SELECT
  chave_id,
  df_valor,
  df_data,
  df_categoria,
  df_subcategoria,
  df_descricao,
  df_filial,
  df_type
FROM vw_ultima_comparacao
WHERE status = '4. SO TEM NA DRE_FABRIC'
ORDER BY ABS(df_valor) DESC
LIMIT 50;

-- Registros que só existem no TRANSACTIONS (extras)
SELECT
  chave_id,
  t_amount,
  t_date,
  t_category,
  t_subcategory,
  t_description,
  t_filial,
  t_marca
FROM vw_ultima_comparacao
WHERE status = '3. SO TEM NA TRANSACTIONS'
ORDER BY ABS(t_amount) DESC
LIMIT 50;

-- ================================================================================
-- 3. ANÁLISES POR DIMENSÃO
-- ================================================================================

-- Análise por filial (registros com problemas)
SELECT
  df_filial,
  COUNT(*) as total_problemas,
  COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as faltam_transactions,
  COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as valores_diferentes,
  ROUND(SUM(COALESCE(ABS(diferenca_valor), ABS(df_valor), 0)), 2) as soma_diferencas
FROM vw_ultima_comparacao
WHERE status IN (
  '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES',
  '4. SO TEM NA DRE_FABRIC'
)
GROUP BY df_filial
ORDER BY total_problemas DESC;

-- Análise por tipo
SELECT
  df_type,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE status = '1. Tem na TRANSACTIONS e DRE_FABRIC | COM VALORES IGUAIS') as ok,
  COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as diferentes,
  COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as faltam,
  ROUND(AVG(COALESCE(diferenca_valor, 0)), 2) as media_diferenca
FROM vw_ultima_comparacao
GROUP BY df_type
ORDER BY total_registros DESC;

-- Análise por categoria (registros com diferença)
SELECT
  df_categoria,
  COUNT(*) as qtd_diferentes,
  ROUND(SUM(ABS(diferenca_valor)), 2) as soma_diferencas,
  ROUND(AVG(ABS(diferenca_valor)), 2) as media_diferenca,
  ROUND(MAX(ABS(diferenca_valor)), 2) as maior_diferenca
FROM vw_ultima_comparacao
WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES'
GROUP BY df_categoria
ORDER BY soma_diferencas DESC;

-- ================================================================================
-- 4. COMPARAÇÃO ENTRE EXECUÇÕES (EVOLUÇÃO)
-- ================================================================================

-- Ver evolução dos últimos 10 processamentos
SELECT
  data_execucao::DATE as data,
  TO_CHAR(data_execucao, 'HH24:MI') as hora,
  total_registros,
  qtd_valores_iguais,
  qtd_valores_diferentes,
  qtd_so_dre_fabric,
  perc_valores_iguais,
  tempo_execucao_ms,
  situacao
FROM vw_historico_execucoes
LIMIT 10;

-- Comparar última execução com penúltima
WITH ultimas_duas AS (
  SELECT
    data_execucao,
    qtd_valores_diferentes,
    qtd_so_dre_fabric,
    diferenca_total,
    ROW_NUMBER() OVER (ORDER BY data_execucao DESC) as rn
  FROM comparacao_resumo
)
SELECT
  atual.data_execucao as data_atual,
  anterior.data_execucao as data_anterior,
  atual.qtd_valores_diferentes - COALESCE(anterior.qtd_valores_diferentes, 0) as evolucao_diferentes,
  atual.qtd_so_dre_fabric - COALESCE(anterior.qtd_so_dre_fabric, 0) as evolucao_faltantes,
  atual.diferenca_total - COALESCE(anterior.diferenca_total, 0) as evolucao_diferenca_total,
  CASE
    WHEN atual.qtd_valores_diferentes < COALESCE(anterior.qtd_valores_diferentes, 999999) THEN '✅ Melhorou'
    WHEN atual.qtd_valores_diferentes > COALESCE(anterior.qtd_valores_diferentes, 0) THEN '⚠️ Piorou'
    ELSE '➡️ Igual'
  END as situacao
FROM ultimas_duas atual
LEFT JOIN ultimas_duas anterior ON anterior.rn = atual.rn + 1
WHERE atual.rn = 1;

-- ================================================================================
-- 5. EXECUÇÃO MANUAL E MANUTENÇÃO
-- ================================================================================

-- Executar comparação manualmente (ignora limite de 5 minutos)
SELECT * FROM executar_comparacao_manual();

-- Verificar status do controle
SELECT
  ultima_execucao,
  CASE
    WHEN ultima_execucao IS NULL THEN 'Nunca executado'
    WHEN ultima_execucao > NOW() - INTERVAL '5 minutes' THEN 'Executado recentemente (aguardar)'
    ELSE 'Pronto para executar'
  END as status_execucao,
  execucao_em_andamento,
  NOW() - ultima_execucao as tempo_desde_ultima
FROM comparacao_controle;

-- Limpar histórico com mais de 30 dias
SELECT * FROM limpar_historico_comparacao(30);

-- Limpar histórico com mais de 7 dias (manter apenas última semana)
SELECT * FROM limpar_historico_comparacao(7);

-- ================================================================================
-- 6. GERENCIAMENTO DO TRIGGER
-- ================================================================================

-- Verificar se o trigger está ativo
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_atualizar_comparacao';

-- Desabilitar trigger temporariamente (útil para carga em massa)
SELECT desabilitar_trigger_comparacao();

-- Habilitar trigger novamente
SELECT habilitar_trigger_comparacao();

-- ================================================================================
-- 7. RELATÓRIOS EXECUTIVOS
-- ================================================================================

-- Dashboard completo da situação atual
WITH resumo AS (
  SELECT * FROM vw_ultimo_resumo
),
top_problemas AS (
  SELECT
    df_filial,
    COUNT(*) as problemas
  FROM vw_problemas_ultima_comparacao
  GROUP BY df_filial
  ORDER BY problemas DESC
  LIMIT 5
)
SELECT
  '📊 DASHBOARD DE COMPARAÇÃO' as titulo,
  TO_CHAR(r.data_execucao, 'DD/MM/YYYY HH24:MI') as ultima_execucao,
  r.total_registros,
  r.qtd_valores_iguais || ' (' || r.perc_valores_iguais || '%)' as registros_ok,
  r.qtd_valores_diferentes || ' (' || r.perc_valores_diferentes || '%)' as valores_diferentes,
  r.qtd_so_dre_fabric || ' (' || r.perc_so_dre_fabric || '%)' as faltam_transactions,
  r.qtd_so_transactions || ' (' || r.perc_so_transactions || '%)' as extras_transactions,
  'R$ ' || TO_CHAR(r.diferenca_total, '999G999G999D99') as diferenca_financeira,
  r.tempo_execucao_ms || ' ms' as tempo_processamento
FROM resumo r;

-- Top 5 filiais com mais problemas
SELECT
  'TOP 5 FILIAIS COM PROBLEMAS' as relatorio,
  df_filial,
  COUNT(*) as total_problemas,
  'R$ ' || TO_CHAR(SUM(COALESCE(ABS(diferenca_valor), ABS(df_valor), 0)), '999G999G999D99') as valor_total
FROM vw_problemas_ultima_comparacao
GROUP BY df_filial
ORDER BY total_problemas DESC
LIMIT 5;

-- Resumo de ações necessárias
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = '4. SO TEM NA DRE_FABRIC') as faltam,
    COUNT(*) FILTER (WHERE status = '2. TEM NA TRANSACTIONS e DRE_FABRIC | COM VALORES DIFERENTES') as diferentes,
    COUNT(*) FILTER (WHERE status = '3. SO TEM NA TRANSACTIONS') as extras
  FROM vw_ultima_comparacao
)
SELECT
  '🎯 AÇÕES NECESSÁRIAS' as relatorio,
  CASE
    WHEN faltam > 0 THEN '1. 🔧 Sincronizar ' || faltam || ' registros que só existem no DRE_FABRIC'
    ELSE '1. ✅ Nenhum registro faltando'
  END as acao_1,
  CASE
    WHEN diferentes > 0 THEN '2. ⚠️ Atualizar ' || diferentes || ' registros com valores diferentes'
    ELSE '2. ✅ Todos os valores estão corretos'
  END as acao_2,
  CASE
    WHEN extras > 0 THEN '3. 🔍 Revisar ' || extras || ' registros extras no TRANSACTIONS'
    ELSE '3. ✅ Nenhum registro extra'
  END as acao_3,
  CASE
    WHEN faltam = 0 AND diferentes = 0 AND extras = 0 THEN '4. 🎉 Tudo sincronizado perfeitamente!'
    ELSE '4. 📋 Executar correções necessárias'
  END as acao_4
FROM stats;

-- ================================================================================
-- 8. EXPORTAÇÃO PARA ANÁLISE EXTERNA
-- ================================================================================

-- Exportar todos os problemas para análise (formato CSV-friendly)
SELECT
  chave_id,
  status,
  df_valor,
  t_amount,
  diferenca_valor,
  df_filial,
  df_categoria,
  df_descricao,
  t_description,
  df_data,
  t_date
FROM vw_problemas_ultima_comparacao
ORDER BY ABS(COALESCE(diferenca_valor, df_valor, 0)) DESC;

-- Exportar resumo diário dos últimos 30 dias
SELECT
  data_execucao::DATE as data,
  MAX(total_registros) as total_registros,
  MAX(qtd_valores_iguais) as ok,
  MAX(qtd_valores_diferentes) as diferentes,
  MAX(qtd_so_dre_fabric) as faltam,
  MAX(perc_valores_iguais) as perc_ok,
  MAX(diferenca_total) as diferenca_total
FROM comparacao_resumo
WHERE data_execucao >= NOW() - INTERVAL '30 days'
GROUP BY data_execucao::DATE
ORDER BY data DESC;

-- ================================================================================
-- FIM DOS EXEMPLOS
-- ================================================================================
