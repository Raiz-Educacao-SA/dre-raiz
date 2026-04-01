-- ============================================================
-- VERIFICAR E CORRIGIR TIMEOUT DA FUNÇÃO insert_dre_batch
-- ============================================================

-- PASSO 1: Verificar se a função existe
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'insert_dre_batch'
  AND routine_schema = 'public';

-- ============================================================
-- PASSO 2: DROPAR E RECRIAR A FUNÇÃO COM TIMEOUT 180s
-- ============================================================

-- Dropar completamente a função antiga
DROP FUNCTION IF EXISTS insert_dre_batch(jsonb) CASCADE;

-- Recriar com timeout de 180 segundos
CREATE OR REPLACE FUNCTION insert_dre_batch(dados jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '180s'  -- ⏱️ TIMEOUT CONFIGURADO AQUI!
AS $$
BEGIN
    -- Timeout adicional na sessão (redundância)
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

-- ============================================================
-- PASSO 3: Verificar se a função foi recriada com sucesso
-- ============================================================
SELECT
    routine_name,
    routine_type,
    'Função recriada com sucesso!' as status
FROM information_schema.routines
WHERE routine_name = 'insert_dre_batch'
  AND routine_schema = 'public';

-- ============================================================
-- PASSO 4: TESTAR A FUNÇÃO (IMPORTANTE!)
-- ============================================================
-- Teste com 1 registro pequeno para garantir que funciona
SELECT insert_dre_batch('[
    {
        "chave": "TEST_TIMEOUT_123",
        "codlote": "TESTE",
        "cia": "TST",
        "filial": "TST",
        "integraaplicacao": "TEST",
        "idpartida": "999",
        "ticket": "TST",
        "fornecedor_padrao": "Teste",
        "anomes": "202601",
        "valor": 100.50,
        "complemento": "Teste Timeout",
        "recorrente": "Não",
        "conta": "1.1.01",
        "tag1": "TEST",
        "tag2": "TEST",
        "tag3": "TEST",
        "tag4": "TEST",
        "tag_orc": "TEST",
        "original": "TEST",
        "r_o": "Real",
        "cc": "CC001",
        "codcoligada": 1,
        "codfilial": 1,
        "usuario": "test@test.com",
        "conta_original": "1.1.01",
        "tag1_original": "TEST",
        "tag4_original": "TEST",
        "tagorc_original": "TEST",
        "integrachave_tratada": "999",
        "chave_id": "TEST-999",
        "status_lanc_financeiro": "Teste",
        "anomes_original": "202601"
    }
]'::jsonb);

-- Verificar se o registro de teste foi inserido
SELECT COUNT(*) as teste_ok, 'Teste inserido com sucesso!' as mensagem
FROM dre_fabric
WHERE chave = 'TEST_TIMEOUT_123';

-- Limpar registro de teste
DELETE FROM dre_fabric WHERE chave = 'TEST_TIMEOUT_123';

-- ============================================================
-- RESULTADO ESPERADO:
-- ✅ Função recriada
-- ✅ Teste passou
-- ✅ Timeout configurado para 180s
-- ============================================================
