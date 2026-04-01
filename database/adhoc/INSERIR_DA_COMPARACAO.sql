-- ================================================================================
-- SOLUÇÃO SIMPLES: Pegar os 47k da comparação e inserir em transactions
-- ================================================================================
-- A comparação já identificou exatamente quais registros faltam!
-- ================================================================================

-- Inserir registros que estão com status "4. SO TEM NA DRE_FABRIC"
INSERT INTO transactions (
  id,
  chave_id,
  date,
  description,
  category,
  amount,
  type,
  scenario,
  status,
  filial,
  marca,
  created_at,
  updated_at
)
SELECT DISTINCT ON (ch.chave_id)
  gen_random_uuid()::TEXT,
  ch.chave_id,
  ch.df_data::TEXT,
  ch.df_descricao,
  ch.df_categoria,
  ch.df_valor,
  ch.df_type,
  'Real' as scenario,
  'Normal' as status,
  ch.df_filial,
  ch.df_cia,
  NOW(),
  NOW()
FROM comparacao_historico ch
WHERE ch.status = '4. SO TEM NA DRE_FABRIC'
  AND ch.data_execucao = (SELECT MAX(data_execucao) FROM comparacao_historico)
  AND ch.chave_id IS NOT NULL
ORDER BY ch.chave_id, ch.id DESC;

-- Verificar resultado
SELECT
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) as dre_fabric,
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as transactions,
  (SELECT COUNT(DISTINCT chave_id) FROM dre_fabric WHERE type IS NOT NULL AND chave_id IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions WHERE chave_id IS NOT NULL) as gap;

SELECT '✅ SINCRONIZAÇÃO CONCLUÍDA!' as status;
