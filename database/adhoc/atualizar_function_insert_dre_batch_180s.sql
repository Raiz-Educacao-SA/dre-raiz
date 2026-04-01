-- ============================================================
-- ATUALIZAR FUNÇÃO insert_dre_batch NO SUPABASE
-- Com timeout de 180 segundos para evitar cancelamento
-- ============================================================

-- Dropar função antiga (se existir)
DROP FUNCTION IF EXISTS insert_dre_batch(jsonb);

-- Criar função atualizada com timeout de 180s
CREATE OR REPLACE FUNCTION insert_dre_batch(dados jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- ⏱️ CONFIGURAR TIMEOUT DE 180 SEGUNDOS PARA ESTA SESSÃO
    SET LOCAL statement_timeout = '180s';

    INSERT INTO dre_fabric (
        chave,
        codlote,
        cia,
        filial,
        integraaplicacao,
        idpartida,
        ticket,
        fornecedor_padrao,
        anomes,
        valor,
        complemento,
        recorrente,
        conta,
        tag1,
        tag2,
        tag3,
        tag4,
        tag_orc,
        original,
        r_o,
        cc,
        codcoligada,
        codfilial,
        usuario,
        conta_original,
        tag1_original,
        tag4_original,
        tagorc_original,
        integrachave_tratada,
        chave_id,
        status_lanc_financeiro,
        anomes_original
    )
    SELECT
        (elem->>'chave')::text,
        (elem->>'codlote')::text,
        (elem->>'cia')::text,
        (elem->>'filial')::text,
        (elem->>'integraaplicacao')::text,
        (elem->>'idpartida')::text,
        (elem->>'ticket')::text,
        (elem->>'fornecedor_padrao')::text,
        (elem->>'anomes')::text,
        (elem->>'valor')::numeric,
        (elem->>'complemento')::text,
        (elem->>'recorrente')::text,
        (elem->>'conta')::text,
        (elem->>'tag1')::text,
        (elem->>'tag2')::text,
        (elem->>'tag3')::text,
        (elem->>'tag4')::text,
        (elem->>'tag_orc')::text,
        (elem->>'original')::text,
        (elem->>'r_o')::text,
        (elem->>'cc')::text,
        (elem->>'codcoligada')::integer,
        (elem->>'codfilial')::integer,
        (elem->>'usuario')::text,
        (elem->>'conta_original')::text,
        (elem->>'tag1_original')::text,
        (elem->>'tag4_original')::text,
        (elem->>'tagorc_original')::text,
        (elem->>'integrachave_tratada')::text,
        (elem->>'chave_id')::text,
        (elem->>'status_lanc_financeiro')::text,
        (elem->>'anomes_original')::text
    FROM jsonb_array_elements(dados) AS elem;
END;
$$;

-- Verificar se a função foi criada
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'insert_dre_batch'
  AND routine_schema = 'public';

-- ============================================================
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse Supabase Dashboard → SQL Editor
-- 3. Cole e execute
-- 4. Aguarde mensagem de sucesso
-- 5. Execute: python Sincronizacao_manual_banco.py
-- ============================================================
