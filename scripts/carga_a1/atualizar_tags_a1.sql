-- ═══════════════════════════════════════════════════════════════════════════
-- atualizar_tags_a1.sql
-- Atualiza tag01, tag02, tag03 em transactions_ano_anterior
-- fazendo um PROCV (JOIN) com a tabela "tags" pela coluna conta_contabil
--
-- Mapeamento:
--   transactions_ano_anterior.conta_contabil  →  tags.cod_conta  (chave)
--   transactions_ano_anterior.tag01           ←  tags.tag1
--   transactions_ano_anterior.tag02           ←  tags.tag2
--   transactions_ano_anterior.tag03           ←  tags.tag3
--
-- COMO USAR:
--   1. Abra o SQL Editor no Supabase
--   2. Cole este arquivo e clique em Run
--   3. Verifique o resultado nos SELECTs de diagnóstico
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── PASSO 1: DIAGNÓSTICO — quantos registros serão atualizados ───────────────
SELECT
  COUNT(*) AS total_registros_a1,
  COUNT(t.cod_conta) AS com_match_na_tabela_tags,
  COUNT(*) - COUNT(t.cod_conta) AS sem_match_ficam_inalterados
FROM transactions_ano_anterior a
LEFT JOIN tags t ON a.conta_contabil = t.cod_conta
WHERE a.scenario = 'A-1';


-- ─── PASSO 2: PREVIEW — amostra do que será atualizado ────────────────────────
SELECT
  a.conta_contabil,
  a.tag01   AS tag01_atual,
  a.tag02   AS tag02_atual,
  a.tag03   AS tag03_atual,
  t.tag1    AS tag01_novo,
  t.tag2    AS tag02_novo,
  t.tag3    AS tag03_novo
FROM transactions_ano_anterior a
INNER JOIN tags t ON a.conta_contabil = t.cod_conta
WHERE a.scenario = 'A-1'
LIMIT 20;


-- ─── PASSO 3: UPDATE — aplica o PROCV ────────────────────────────────────────
-- ⚠️  Descomente este bloco e execute APÓS confirmar o diagnóstico acima

/*
UPDATE transactions_ano_anterior AS a
SET
  tag01 = t.tag1,
  tag02 = t.tag2,
  tag03 = t.tag3
FROM tags t
WHERE a.conta_contabil = t.cod_conta
  AND a.scenario = 'A-1';
*/


-- ─── PASSO 4: VERIFICAÇÃO PÓS-UPDATE ─────────────────────────────────────────
-- Distribução de tag01 após atualização (deve ter valores preenchidos)
/*
SELECT
  tag01,
  COUNT(*) AS qtd
FROM transactions_ano_anterior
WHERE scenario = 'A-1'
GROUP BY tag01
ORDER BY qtd DESC
LIMIT 30;
*/
