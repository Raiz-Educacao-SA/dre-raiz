-- ============================================
-- AUTOMAÇÃO: Sincronização dre_fabric → transactions
-- ============================================
-- Este arquivo contém 3 opções de automação:
-- OPÇÃO A: Trigger (tempo real)
-- OPÇÃO B: Function agendada (periódica)
-- OPÇÃO C: Function manual (sob demanda)
-- Data: 2026-02-03
-- ============================================

-- ============================================
-- FUNÇÃO PRINCIPAL DE SINCRONIZAÇÃO
-- ============================================
-- Esta função será usada por todas as 3 opções

CREATE OR REPLACE FUNCTION sync_dre_fabric_to_transactions(
  p_limit INTEGER DEFAULT NULL  -- NULL = sincronizar tudo, ou passar limite (ex: 1000)
)
RETURNS TABLE(
  total_processados BIGINT,
  novos_inseridos BIGINT,
  atualizados BIGINT,
  erros BIGINT
) AS $$
DECLARE
  v_processados BIGINT := 0;
  v_inseridos BIGINT := 0;
  v_atualizados BIGINT := 0;
  v_erros BIGINT := 0;
BEGIN
  -- Sincronizar registros do dre_fabric que ainda não estão em transactions
  -- ou que foram atualizados mais recentemente
  WITH dados_fabric AS (
    SELECT
      -- Gerar UUID único
      gen_random_uuid()::TEXT as id,

      -- Converter anomes para date
      CASE
        WHEN df.anomes IS NOT NULL AND LENGTH(df.anomes) = 6 THEN
          TO_DATE(df.anomes, 'YYYYMM')::TEXT
        ELSE
          NULL
      END as date,

      -- Mapeamento direto
      df.complemento as description,
      df.conta as category,
      df.valor as amount,
      COALESCE(df.type, '99. CADASTRAR TAG0') as type,
      COALESCE(df.scenario, 'Real') as scenario,
      COALESCE(df.status, 'Normal') as status,
      df.filial,
      df.cia as marca,
      df.tag1 as tag01,
      df.tag2 as tag02,
      df.tag3 as tag03,
      df.fornecedor_padrao as vendor,
      df.ticket,
      df.tag_orc as nat_orc,
      df.recorrente as recurring,
      df.chave as chave_id,
      df.created_at,
      df.updated_at

    FROM dre_fabric df
    WHERE df.type IS NOT NULL  -- Só sincronizar registros classificados
      AND df.chave IS NOT NULL  -- Só sincronizar registros com chave
      AND (
        -- Registros novos (não existem em transactions)
        NOT EXISTS (
          SELECT 1 FROM transactions t WHERE t.chave_id = df.chave
        )
        OR
        -- Registros atualizados (updated_at mais recente no fabric)
        EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.chave_id = df.chave
          AND df.updated_at > t.updated_at
        )
      )
    ORDER BY df.created_at DESC
    LIMIT p_limit  -- Se p_limit for NULL, não limita
  ),
  insert_result AS (
    -- UPSERT: Insere novos ou atualiza existentes
    INSERT INTO transactions (
      id, date, description, category, amount, type, scenario, status,
      filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
      recurring, chave_id, created_at, updated_at
    )
    SELECT
      id, date, description, category, amount, type, scenario, status,
      filial, marca, tag01, tag02, tag03, vendor, ticket, nat_orc,
      recurring, chave_id, created_at, updated_at
    FROM dados_fabric
    ON CONFLICT (chave_id)  -- Se chave_id já existe, atualiza
    DO UPDATE SET
      date = EXCLUDED.date,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      amount = EXCLUDED.amount,
      type = EXCLUDED.type,
      scenario = EXCLUDED.scenario,
      status = EXCLUDED.status,
      filial = EXCLUDED.filial,
      marca = EXCLUDED.marca,
      tag01 = EXCLUDED.tag01,
      tag02 = EXCLUDED.tag02,
      tag03 = EXCLUDED.tag03,
      vendor = EXCLUDED.vendor,
      ticket = EXCLUDED.ticket,
      nat_orc = EXCLUDED.nat_orc,
      recurring = EXCLUDED.recurring,
      updated_at = EXCLUDED.updated_at
    RETURNING
      CASE WHEN xmax = 0 THEN 1 ELSE 0 END as inserted,  -- 1 = novo, 0 = atualizado
      1 as processed
  )
  SELECT
    COUNT(*) as total,
    SUM(inserted) as novos,
    SUM(CASE WHEN inserted = 0 THEN 1 ELSE 0 END) as atualizados
  INTO v_processados, v_inseridos, v_atualizados
  FROM insert_result;

  -- Retornar resultado
  RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;

EXCEPTION
  WHEN OTHERS THEN
    v_erros := 1;
    RAISE NOTICE 'Erro na sincronização: %', SQLERRM;
    RETURN QUERY SELECT v_processados, v_inseridos, v_atualizados, v_erros;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_dre_fabric_to_transactions IS
'Sincroniza registros novos ou atualizados do dre_fabric para transactions.
Usa UPSERT baseado em chave_id para evitar duplicatas.
Parâmetro p_limit: NULL = todos os registros, ou número para limitar (ex: 1000)';

-- ============================================
-- CRIAR ÍNDICE NA CHAVE_ID (IMPORTANTE!)
-- ============================================
-- Necessário para o UPSERT funcionar corretamente

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_chave_id_unique
ON transactions(chave_id)
WHERE chave_id IS NOT NULL;

-- ============================================
-- OPÇÃO A: TRIGGER (TEMPO REAL)
-- ============================================
-- Sincroniza automaticamente quando inserir/atualizar no dre_fabric

/*
-- ⚠️ ATENÇÃO: Comente este bloco se não quiser usar trigger!
-- Pode deixar inserções mais lentas se houver muitos dados

CREATE OR REPLACE FUNCTION trigger_sync_to_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar apenas o registro que foi inserido/atualizado
  PERFORM sync_dre_fabric_to_transactions(1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT
DROP TRIGGER IF EXISTS after_insert_sync_transactions ON dre_fabric;
CREATE TRIGGER after_insert_sync_transactions
  AFTER INSERT ON dre_fabric
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_sync_to_transactions();

-- Trigger para UPDATE
DROP TRIGGER IF EXISTS after_update_sync_transactions ON dre_fabric;
CREATE TRIGGER after_update_sync_transactions
  AFTER UPDATE ON dre_fabric
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_sync_to_transactions();

COMMENT ON TRIGGER after_insert_sync_transactions ON dre_fabric IS
'Sincroniza automaticamente para transactions após INSERT';

COMMENT ON TRIGGER after_update_sync_transactions ON dre_fabric IS
'Sincroniza automaticamente para transactions após UPDATE';
*/

-- ============================================
-- OPÇÃO B: FUNCTION AGENDADA (VIA pg_cron)
-- ============================================
-- Roda automaticamente a cada X minutos

/*
-- ⚠️ NOTA: pg_cron precisa estar habilitado no Supabase
-- Supabase Free Tier pode não ter pg_cron
-- Para habilitar: Dashboard → Database → Extensions → pg_cron

-- Agendar para rodar a cada 5 minutos
SELECT cron.schedule(
  'sync-fabric-to-transactions',  -- Nome do job
  '*/5 * * * *',                  -- A cada 5 minutos (cron expression)
  $$SELECT sync_dre_fabric_to_transactions(NULL)$$  -- Sincronizar tudo
);

-- Para rodar a cada 15 minutos:
-- SELECT cron.schedule('sync-fabric-to-transactions', '*/15 * * * *', $$SELECT sync_dre_fabric_to_transactions(NULL)$$);

-- Para rodar a cada hora:
-- SELECT cron.schedule('sync-fabric-to-transactions', '0 * * * *', $$SELECT sync_dre_fabric_to_transactions(NULL)$$);

-- Para ver jobs agendados:
-- SELECT * FROM cron.job;

-- Para desagendar:
-- SELECT cron.unschedule('sync-fabric-to-transactions');
*/

-- ============================================
-- OPÇÃO C: FUNCTION MANUAL (SOB DEMANDA)
-- ============================================
-- Execute quando quiser sincronizar

-- Exemplo 1: Sincronizar TUDO
-- SELECT * FROM sync_dre_fabric_to_transactions(NULL);

-- Exemplo 2: Sincronizar apenas 1000 registros
-- SELECT * FROM sync_dre_fabric_to_transactions(1000);

-- Exemplo 3: Sincronizar apenas 100 registros (teste)
-- SELECT * FROM sync_dre_fabric_to_transactions(100);

-- ============================================
-- QUERIES DE MONITORAMENTO
-- ============================================

-- Ver últimas sincronizações (adicionar tabela de log se quiser)
/*
CREATE TABLE IF NOT EXISTS sync_log (
  id BIGSERIAL PRIMARY KEY,
  total_processados BIGINT,
  novos_inseridos BIGINT,
  atualizados BIGINT,
  erros BIGINT,
  sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar a função para logar:
-- INSERT INTO sync_log (total_processados, novos_inseridos, atualizados, erros)
-- VALUES (v_processados, v_inseridos, v_atualizados, v_erros);
*/

-- Verificar diferença entre tabelas
CREATE OR REPLACE VIEW vw_sync_status AS
SELECT
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave IS NOT NULL) as total_dre_fabric,
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM dre_fabric WHERE type IS NOT NULL AND chave IS NOT NULL) -
  (SELECT COUNT(*) FROM transactions) as diferenca,
  (SELECT MAX(updated_at) FROM dre_fabric) as ultima_atualizacao_fabric,
  (SELECT MAX(updated_at) FROM transactions) as ultima_atualizacao_transactions;

-- Usar: SELECT * FROM vw_sync_status;

-- ============================================
-- TESTES E VALIDAÇÃO
-- ============================================

-- Teste 1: Sincronizar apenas 10 registros (teste)
DO $$
DECLARE
  resultado RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTE: Sincronizando 10 registros...';
  RAISE NOTICE '========================================';

  SELECT * INTO resultado FROM sync_dre_fabric_to_transactions(10);

  RAISE NOTICE 'Total processados: %', resultado.total_processados;
  RAISE NOTICE 'Novos inseridos: %', resultado.novos_inseridos;
  RAISE NOTICE 'Atualizados: %', resultado.atualizados;
  RAISE NOTICE 'Erros: %', resultado.erros;
  RAISE NOTICE '========================================';
END $$;

-- Teste 2: Ver status da sincronização
SELECT * FROM vw_sync_status;

-- Teste 3: Ver últimos 5 registros sincronizados
SELECT
  chave_id,
  date,
  LEFT(description, 30) as description,
  amount,
  type,
  filial,
  marca,
  updated_at
FROM transactions
ORDER BY updated_at DESC
LIMIT 5;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT
  '✅ FUNÇÕES DE AUTOMAÇÃO CRIADAS COM SUCESSO!' as status,
  'Escolha uma das 3 opções acima' as proxima_acao;

-- ============================================
-- RESUMO DAS OPÇÕES
-- ============================================

/*
📋 RESUMO:

OPÇÃO A: TRIGGER (Tempo Real)
- Descomente o bloco "OPÇÃO A" acima
- Execute no Supabase
- Sincroniza automaticamente a cada INSERT/UPDATE no dre_fabric

OPÇÃO B: FUNCTION AGENDADA (Periódica)
- Descomente o bloco "OPÇÃO B" acima
- Execute no Supabase
- Requer pg_cron habilitado
- Sincroniza a cada 5 minutos (ou customize)

OPÇÃO C: FUNCTION MANUAL (Sob Demanda)
- Já está pronta!
- Execute quando quiser:
  SELECT * FROM sync_dre_fabric_to_transactions(NULL);

🎯 RECOMENDAÇÃO: Comece com OPÇÃO C (manual) para testar,
   depois mude para OPÇÃO B (agendada) se disponível,
   ou OPÇÃO A (trigger) se precisar tempo real.

📊 MONITORAMENTO:
- SELECT * FROM vw_sync_status;  -- Ver status da sincronização
- SELECT * FROM sync_dre_fabric_to_transactions(10);  -- Testar com 10 registros
*/
