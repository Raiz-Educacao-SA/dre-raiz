-- ============================================================
-- ATUALIZAR FUNÇÃO insert_dre_batch NO SUPABASE
-- Incluir nova coluna chave_id
-- ============================================================

-- Dropar função antiga (se existir)
DROP FUNCTION IF EXISTS insert_dre_batch(jsonb);

-- Criar função atualizada com chave_id
CREATE OR REPLACE FUNCTION insert_dre_batch(dados jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
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
        chave_id,                    -- ← NOVA COLUNA
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
        (elem->>'chave_id')::text,   -- ← NOVA COLUNA
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
-- TESTE (OPCIONAL)
-- Testar a função com um registro de exemplo
-- ============================================================
/*
SELECT insert_dre_batch('[
    {
        "chave": "TEST123",
        "codlote": "LOTE001",
        "cia": "CIA1",
        "filial": "FIL1",
        "integraaplicacao": "APP1",
        "idpartida": "12345",
        "ticket": "TKT001",
        "fornecedor_padrao": "Fornecedor Teste",
        "anomes": "202601",
        "valor": 1000.00,
        "complemento": "Teste",
        "recorrente": "Sim",
        "conta": "1.1.01",
        "tag1": "TAG1",
        "tag2": "TAG2",
        "tag3": "TAG3",
        "tag4": "TAG4",
        "tag_orc": "ORC1",
        "original": "Original",
        "r_o": "Real",
        "cc": "CC001",
        "codcoligada": 1,
        "codfilial": 1,
        "usuario": "user@test.com",
        "conta_original": "1.1.01",
        "tag1_original": "TAG1",
        "tag4_original": "TAG4",
        "tagorc_original": "ORC1",
        "integrachave_tratada": "12345",
        "chave_id": "1-12345-1",
        "status_lanc_financeiro": "Ativo",
        "anomes_original": "202601"
    }
]'::jsonb);

-- Verificar se foi inserido
SELECT chave, chave_id FROM dre_fabric WHERE chave = 'TEST123';

-- Limpar teste
DELETE FROM dre_fabric WHERE chave = 'TEST123';
*/

-- ============================================================
-- PRONTO!
-- Agora execute novamente: python sync_via_function.py
-- ============================================================
